// server.js - Multi-Tenant QR-based WhatsApp Server with Multi-Language AI Brain
import dotenv from 'dotenv';
import whatsappWebPkg from 'whatsapp-web.js';
import qrcodeTerminal from 'qrcode-terminal';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import QRCode from 'qrcode';
import express from 'express';
import cors from 'cors';

dotenv.config();

process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('UNHANDLED REJECTION:', reason);
});

const { Client, LocalAuth } = whatsappWebPkg;
const IS_CLOUD = !!(process.env.RAILWAY_ENVIRONMENT || process.env.RENDER || process.env.FLY_APP_NAME || process.env.IS_CLOUD);
console.log(`🏗️  Running in ${IS_CLOUD ? 'CLOUD' : 'LOCAL'} mode`);

const API_PORT = process.env.PORT || 3001;
const SESSION_DIR = IS_CLOUD ? '/data/.wwebjs_auth' : './.wwebjs_auth';

if (!fs.existsSync(SESSION_DIR)) {
  fs.mkdirSync(SESSION_DIR, { recursive: true });
}

// Find Chromium binary path
let browserPath = process.env.PUPPETEER_EXECUTABLE_PATH || null;
if (!browserPath && IS_CLOUD) {
  const possiblePaths = ['/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome-stable'];
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) { browserPath = p; break; }
  }
}
console.log(`🔎 Found browser for Puppeteer: ${browserPath || 'Default Puppeteer Chromium'}`);

// Clean lock files helper
function cleanChromiumLocks(dir) {
  if (!fs.existsSync(dir)) return;
  try {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      try {
        const stat = fs.lstatSync(fullPath);
        if (stat.isDirectory()) {
          cleanChromiumLocks(fullPath);
        } else if (file === 'SingletonLock' || file === 'SingletonCookie' || stat.isSymbolicLink()) {
          fs.unlinkSync(fullPath);
          console.log(`🗑️ Removed stale Chromium lock/symlink: ${fullPath}`);
        }
      } catch {
        if (file === 'SingletonLock' || file === 'SingletonCookie') {
          try { fs.unlinkSync(fullPath); } catch {}
        }
      }
    }
  } catch (e) {
    console.error('Error cleaning lock files:', e);
  }
}
cleanChromiumLocks(SESSION_DIR);

// Supabase Client
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://xzufkruggqajucuhxtik.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Express HTTP API
const app = express();
app.use(cors());
app.use(express.json());

// Multi-Session Manager Map: userId -> { client, state, initPromise }
const userSessions = new Map();
const DEFAULT_USER_ID = 'e231f87d-c466-45ab-8e16-b1e2b0984c1d';

function getSessionState(userId) {
  const uid = userId || DEFAULT_USER_ID;
  const s = userSessions.get(uid);
  if (!s) return { ready: false, phone: null, name: null, pendingQr: null, pairingCode: null };
  return s.state;
}

// ── Destroy + Rebuild helper (used in reset only) ──
async function destroyAndRebuildSession(userId, delayMs = 12000, wipeAuth = false) {
  const session = userSessions.get(userId);
  userSessions.delete(userId);
  if (session) {
    try { await session.client.destroy(); } catch (_) {}
  }
  const userAuthDir = path.join(SESSION_DIR, `session-${userId}`);
  if (wipeAuth && fs.existsSync(userAuthDir)) {
    try {
      fs.rmSync(userAuthDir, { recursive: true, force: true });
      console.log(`🗑️ Wiped auth dir for user ${userId}.`);
    } catch (e) { console.error('Error wiping auth dir:', e); }
  }
  // Do NOT auto-restart — let the user re-initiate from the UI
  console.log(`♻️ Session destroyed for ${userId}. User must re-link.`);
}

// ── Express API Endpoints ──
app.get('/api/whatsapp-status', (req, res) => {
  const userId = req.query.userId || DEFAULT_USER_ID;
  // NEVER auto-start a browser here — only return what's already in memory
  const state = getSessionState(userId);
  if (state.ready) {
    return res.json({ linked: true, phone: state.phone, name: state.name });
  }
  return res.json({
    linked: false,
    authenticating: !!state.authenticating,
    pendingQr: state.pendingQr,
    pairingCode: state.pairingCode
  });
});

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, uptime: process.uptime(), activeSessions: userSessions.size, ts: new Date().toISOString() });
});

app.post('/api/register', async (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password) {
    return res.status(400).json({ ok: false, error: 'Email and password are required' });
  }
  console.log(`👤 Registering new user account: ${email}`);
  try {
    const { data: user, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { display_name: name || email.split('@')[0] }
    });
    if (error) {
      if (error.message.includes('already registered')) {
        return res.status(400).json({ ok: false, error: 'User already registered. Please sign in instead.' });
      }
      throw error;
    }
    res.json({ ok: true, user: user.user });
  } catch (e) {
    console.error('Registration failed:', e);
    res.status(400).json({ ok: false, error: e.message || 'Failed to create account' });
  }
});

app.post('/api/request-pairing-code', async (req, res) => {
  const { userId, phoneNumber } = req.body;
  const uid = userId || DEFAULT_USER_ID;
  if (!phoneNumber) {
    return res.status(400).json({ ok: false, error: 'Phone number is required' });
  }
  const cleanPhone = phoneNumber.replace(/\D/g, '');
  console.log(`📱 Requesting pairing code for user ${uid}, phone: ${cleanPhone}`);
  try {
    // Always wipe old auth so we get a fresh session, not an auto-login to the old number
    const existingSession = userSessions.get(uid);
    if (existingSession) {
      try { await existingSession.client.destroy(); } catch {}
      userSessions.delete(uid);
    }
    const userAuthDir = path.join(SESSION_DIR, `session-${uid}`);
    if (fs.existsSync(userAuthDir)) {
      fs.rmSync(userAuthDir, { recursive: true, force: true });
      console.log(`🗑️ Wiped auth for ${uid} before pairing`);
    }
    await new Promise((r) => setTimeout(r, 2000));

    const session = initClientForUser(uid);

    // Wait up to 90 seconds for WhatsApp Web to fully load (QR generated = page ready)
    console.log(`⏳ Waiting for WhatsApp Web to load for user ${uid}...`);
    let retries = 0;
    while (!session.state.ready && !session.state.pendingQr && retries < 180) {
      await new Promise((r) => setTimeout(r, 500));
      retries++;
    }
    console.log(`✅ WhatsApp Web ready after ${retries * 500}ms for user ${uid}`);

    // Try requesting pairing code up to 3 times
    let code = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        console.log(`🔑 Attempt ${attempt} to get pairing code for ${cleanPhone}`);
        code = await session.client.requestPairingCode(cleanPhone);
        if (code) { console.log(`✅ Pairing code generated: ${code}`); break; }
      } catch (err) {
        console.warn(`Attempt ${attempt} for pairing code failed:`, err.message);
        if (attempt < 3) await new Promise((r) => setTimeout(r, 3000));
      }
    }

    if (!code) {
      throw new Error('Could not generate pairing code. Please tap Get Code again.');
    }

    session.state.pairingCode = code;
    res.json({ ok: true, pairingCode: code });
  } catch (e) {
    console.error('Failed to request pairing code:', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.post('/api/reset-session', async (req, res) => {
  const { userId } = req.body;
  const uid = userId || DEFAULT_USER_ID;
  console.log(`🔄 Full reset for user ${uid}...`);
  try {
    const session = userSessions.get(uid);
    userSessions.delete(uid);
    if (session) {
      try { await session.client.destroy(); } catch (_) {}
    }
    const userAuthDir = path.join(SESSION_DIR, `session-${uid}`);
    if (fs.existsSync(userAuthDir)) {
      fs.rmSync(userAuthDir, { recursive: true, force: true });
      console.log(`🗑️  Deleted session folder: ${userAuthDir}`);
    }
    cleanChromiumLocks(SESSION_DIR);
    setTimeout(() => { initClientForUser(uid); }, 3000);
    res.json({ ok: true, message: 'Session wiped. Fresh QR generating in 3s…' });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.post('/api/send-message', async (req, res) => {
  const { userId, conversationId, message } = req.body;
  const uid = userId || DEFAULT_USER_ID;
  if (!conversationId || !message) {
    return res.status(400).json({ ok: false, error: 'conversationId and message are required' });
  }
  try {
    const session = userSessions.get(uid);
    if (!session || !session.state.ready) {
      return res.status(400).json({ ok: false, error: 'WhatsApp is not connected for your account.' });
    }
    const { data: convo } = await supabase.from('conversations').select('*').eq('id', conversationId).maybeSingle();
    if (!convo) return res.status(404).json({ ok: false, error: 'Conversation not found' });

    const { data: lastMsg } = await supabase.from('chat_messages').select('metadata').eq('conversation_id', conversationId).eq('role', 'user').order('created_at', { ascending: false }).limit(1).maybeSingle();
    let jid = lastMsg?.metadata?.whatsapp_jid || lastMsg?.metadata?.from || null;
    if (!jid) {
      const phoneMatch = convo.title.match(/(\d{7,15})/);
      if (phoneMatch) jid = `${phoneMatch[1]}@c.us`;
    }
    if (!jid || jid.includes('broadcast') || jid.includes('status')) {
      return res.status(400).json({ ok: false, error: 'Cannot send message to this contact type.' });
    }

    console.log(`✉️ Sending manual reply for user ${uid} to ${jid}: "${message}"`);
    await session.client.sendMessage(jid, message);

    await supabase.from('chat_messages').insert({
      user_id: uid, conversation_id: conversationId, role: 'assistant', content: message, channel: 'whatsapp', metadata: { whatsapp_jid: jid, manual: true }
    });
    await supabase.from('conversations').update({ last_message_at: new Date().toISOString() }).eq('id', conversationId);
    res.json({ ok: true });
  } catch (e) {
    console.error('Failed to send message:', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Concurrency lock — only ONE Chromium browser launches at a time
let isBrowserLaunching = false;
const browserLaunchQueue = [];

async function waitForBrowserSlot() {
  if (!isBrowserLaunching) return;
  return new Promise((resolve) => browserLaunchQueue.push(resolve));
}
function releaseBrowserSlot() {
  isBrowserLaunching = false;
  const next = browserLaunchQueue.shift();
  if (next) next();
}

// ── Multi-Session Initializer ──
function initClientForUser(userId) {
  if (!userId) return null;
  if (userSessions.has(userId)) {
    return userSessions.get(userId);
  }

  const userAuthDir = path.join(SESSION_DIR, `session-${userId}`);
  cleanChromiumLocks(userAuthDir);

  console.log(`🚀 Initializing isolated WhatsApp client for user: ${userId}`);
  const state = { ready: false, phone: null, name: null, pendingQr: null, pairingCode: null };

  const client = new Client({
    authStrategy: new LocalAuth({ clientId: userId, dataPath: SESSION_DIR }),
    takeoverOnConflict: true,
    authTimeoutMs: 120000,
    qrMaxRetries: 0,
    puppeteer: {
      headless: true,
      executablePath: browserPath || undefined,
      protocolTimeout: 120000,
      bypassCSP: true,
      defaultViewport: { width: 1280, height: 800 },
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--disable-extensions',
        '--disable-component-update',
        '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'
      ]
    }
  });

  const sessionObj = { client, state, isInitializing: true };
  userSessions.set(userId, sessionObj);

  client.on('qr', (qr) => {
    console.log(`📡 QR code generated for user ${userId}`);
    state.ready = false;
    state.authenticating = false;
    state.pendingQr = qr;
  });

  client.on('authenticated', () => {
    console.log(`🔑 WhatsApp Client AUTHENTICATED for user ${userId}`);
    state.ready = false;
    state.authenticating = true;
    state.pendingQr = null;
    state.pairingCode = null;
  });

  client.on('ready', async () => {
    const myPhone = client.info.wid.user;
    console.log(`✅ WhatsApp Client READY for user ${userId} | Phone: ${myPhone}`);
    state.ready = true;
    state.authenticating = false;
    state.phone = myPhone;
    state.pendingQr = null;

    try {
      const { data: profile } = await supabase.from('profiles').select('display_name').eq('id', userId).maybeSingle();
      const name = profile?.display_name || 'Business Owner';
      state.name = name;

      const { data: existing } = await supabase
        .from('whatsapp_connections')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .maybeSingle();

      if (!existing) {
        await supabase.from('whatsapp_connections').insert({
          user_id: userId,
          whatsapp_phone: myPhone,
          whatsapp_name: name,
          status: 'active'
        });
        console.log(`🔗 Auto-linked phone ${myPhone} in database for user ${userId}.`);
      }
    } catch (e) {
      console.error(`Failed to sync connection for user ${userId}:`, e);
    }
  });

  const processedMsgIds = new Set();

  client.on('message_create', async (msg) => {
    if (msg.fromMe || msg.isGroup) return;
    if (processedMsgIds.has(msg.id?.id)) return;
    processedMsgIds.add(msg.id?.id);
    setTimeout(() => processedMsgIds.delete(msg.id?.id), 60000);

    const fromPhone = msg.from.replace('@c.us', '').replace('@lid', '');
    const myPhone = client.info.wid.user;
    console.log(`💬 [User ${userId}] Incoming message from ${fromPhone} to ${myPhone}: "${msg.body}"`);

    try {
      const { data: profile } = await supabase.from('profiles').select('display_name').eq('id', userId).maybeSingle();
      const ownerName = profile?.display_name || 'the owner';

      const contact = await msg.getContact();
      const contactName = contact.pushname || contact.name || null;
      const title = contactName ? `WhatsApp: ${contactName} (${fromPhone})` : `WhatsApp: ${fromPhone}`;

      let { data: convo } = await supabase.from('conversations').select('id').eq('user_id', userId).eq('title', title).maybeSingle();
      let conversationId;
      if (convo) {
        conversationId = convo.id;
      } else {
        const { data: newConvo, error: convoErr } = await supabase.from('conversations').insert({ user_id: userId, title, title_generated: true }).select('id').single();
        if (convoErr) throw convoErr;
        conversationId = newConvo.id;
      }

      await supabase.from('chat_messages').insert({
        user_id: userId, conversation_id: conversationId, role: 'user', content: msg.body, channel: 'whatsapp', metadata: { whatsapp_phone: fromPhone, whatsapp_name: contactName, whatsapp_jid: msg.from }
      });

      const { data: globalPref } = await supabase.from('preferences').select('value').eq('user_id', userId).eq('key', 'wa_global_auto_reply_disabled').maybeSingle();
      if (globalPref && (globalPref.value === true || globalPref.value?.disabled === true)) {
        console.log(`🤖 Auto-reply disabled for user ${userId}.`);
        await supabase.from('conversations').update({ last_message_at: new Date().toISOString() }).eq('id', conversationId);
        return;
      }

      const { data: autoReplyPref } = await supabase.from('preferences').select('value').eq('user_id', userId).eq('key', `wa_auto_reply_disabled:${conversationId}`).maybeSingle();
      if (autoReplyPref && (autoReplyPref.value === true || autoReplyPref.value?.disabled === true)) {
        console.log(`🤖 Auto-reply disabled for conversation ${conversationId}.`);
        await supabase.from('conversations').update({ last_message_at: new Date().toISOString() }).eq('id', conversationId);
        return;
      }

      const { data: history } = await supabase.from('chat_messages').select('role, content').eq('conversation_id', conversationId).order('created_at', { ascending: true }).limit(50);
      const formattedMessages = (history ?? []).map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content }));
      const detectedLanguage = detectLanguage(msg.body);

      const { data: kbPref } = await supabase.from('preferences').select('value').eq('user_id', userId).eq('key', 'business_knowledge_base').maybeSingle();
      const kb = kbPref?.value;
      const businessKnowledge = kb ? `\n=== BUSINESS KNOWLEDGE BASE ===\nCompany Name: ${kb.companyName || ownerName}\nAI Tone: ${kb.persona || 'Friendly & Professional'}\nServices: ${kb.description || ''}\nFAQs & Pricing:\n${kb.faqs || ''}\n=================================\n` : '';

      const systemPrompt = `You are Mr. Cisco, the AI assistant of ${kb?.companyName || ownerName}.\n\nRules:\n- Reply ONLY to what the person just said.\n- Sound like a real human texting — casual, warm, short (1-3 sentences).\n- AI Tone: ${kb?.persona || 'Friendly & Professional'}.\n- Never use bullet points. Never start with "Certainly" or "Of course".\n- Language: ${detectedLanguage}.\n${businessKnowledge}`;

      const currentMsg = msg.body?.trim();
      const historyWithoutCurrent = formattedMessages.filter((m, i) => !(i === formattedMessages.length - 1 && m.role === 'user' && m.content === currentMsg));
      const messagesForAI = [...historyWithoutCurrent.slice(-10), { role: 'user', content: currentMsg }];

      const reply = await getAIResponse(messagesForAI, systemPrompt);
      const naturalFallbacks = ["Got it, let me check on that for you.", "Sure thing, I'll look into it.", "On it — give me a moment."];
      const finalReply = reply || naturalFallbacks[Math.floor(Math.random() * naturalFallbacks.length)];

      await supabase.from('chat_messages').insert({
        user_id: userId, conversation_id: conversationId, role: 'assistant', content: finalReply, channel: 'whatsapp', metadata: { whatsapp_phone: fromPhone, whatsapp_jid: msg.from }
      });
      await supabase.from('conversations').update({ last_message_at: new Date().toISOString() }).eq('id', conversationId);

      await msg.reply(finalReply);
      console.log(`📨 [User ${userId}] Replied to ${fromPhone}: ${finalReply}`);
    } catch (err) {
      console.error(`Error handling message for user ${userId}:`, err);
    }
  });

  client.on('disconnected', (reason) => {
    console.log(`⚠️ Client for user ${userId} disconnected: ${reason}`);
    state.ready = false;
    state.pendingQr = null;
    const isLogout = String(reason).toUpperCase().includes('LOGOUT');
    destroyAndRebuildSession(userId, isLogout ? 3000 : 12000, isLogout);
  });

  client.on('auth_failure', (msg) => {
    console.error(`❌ Auth failure for user ${userId}:`, msg);
    state.ready = false;
    state.pendingQr = null;
    destroyAndRebuildSession(userId, 3000, true);
  });

  client.initialize().catch((err) => {
    console.error(`Failed to initialize client for user ${userId}:`, err);
    userSessions.delete(userId);
    cleanChromiumLocks(path.join(SESSION_DIR, `session-${userId}`));
    setTimeout(() => initClientForUser(userId), 10000);
  });
  return sessionObj;
}

// Language Detector
function detectLanguage(text) {
  if (!text) return 'English';
  const lower = text.toLowerCase().trim();
  if (/[\u0600-\u06FF]/.test(text)) return 'Arabic';
  if (/[\u0400-\u04FF]/.test(text)) return 'Russian';
  if (/[\u4E00-\u9FFF]/.test(text)) return 'Chinese';
  const swahili = ['jambo', 'habari', 'asante', 'nakuja', 'sawa', 'tafadhali', 'mzuri', 'ndio', 'hapana', 'kazi', 'shilingi', 'pesa', 'nini', 'wapi', 'mambo'];
  if (swahili.some((w) => lower.includes(w))) return 'Swahili';
  const spanish = ['hola', 'gracias', 'buenos', 'por favor', 'amigo', 'cuanto', 'donde'];
  if (spanish.some((w) => lower.includes(w))) return 'Spanish';
  return 'English';
}

// AI Engine Fallback (Groq -> OpenRouter -> Gemini)
async function getAIResponse(messagesInput, systemPrompt) {
  const messages = [];
  if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
  if (Array.isArray(messagesInput)) messages.push(...messagesInput.filter((m) => m.content && m.content.trim()));

  const groqKey = process.env.GROQ_API_KEY || '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';
  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${groqKey}` },
      body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages, max_tokens: 300, temperature: 0.9 })
    });
    if (res.ok) {
      const data = await res.json();
      const text = data?.choices?.[0]?.message?.content?.trim();
      if (text) return text;
    }
  } catch (e) { console.error('Groq failed:', e.message); }

  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) {
    try {
      const res = await fetch('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${geminiKey}` },
        body: JSON.stringify({ model: 'gemini-2.0-flash', messages, max_tokens: 300, temperature: 0.9 })
      });
      if (res.ok) {
        const data = await res.json();
        return data?.choices?.[0]?.message?.content?.trim() || null;
      }
    } catch (e) { console.error('Gemini failed:', e.message); }
  }
  return null;
}

// Start Express Server
app.listen(API_PORT, '0.0.0.0', () => {
  console.log(`🌐 Multi-Tenant WhatsApp Server listening on http://0.0.0.0:${API_PORT}`);
});
