// server.js - QR code based WhatsApp connection with multilingual AI
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

// Detect if running on cloud (Railway, Render, Fly, etc.)
const IS_CLOUD = !!(process.env.RAILWAY_ENVIRONMENT || process.env.RENDER || process.env.FLY_APP_NAME || process.env.IS_CLOUD);
console.log(`🏗️  Running in ${IS_CLOUD ? 'CLOUD' : 'LOCAL'} mode`);

// ── Express HTTP API (so the frontend can check status directly) ──
const app = express();
app.use(cors());
app.use(express.json());

// In-memory state the WhatsApp events will update
// In-memory state the WhatsApp events will update
let waState = { ready: false, phone: null, name: null, pendingQr: null, pairingCode: null };

app.get('/api/whatsapp-status', (_req, res) => {
  if (waState.ready) {
    return res.json({ linked: true, phone: waState.phone, name: waState.name });
  }
  return res.json({ 
    linked: false, 
    pendingQr: waState.pendingQr, 
    pairingCode: waState.pairingCode 
  });
});

// Health check — keeps Railway from sleeping the service
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, uptime: process.uptime(), wa: waState.ready, ts: new Date().toISOString() });
});

app.post('/api/request-pairing-code', async (req, res) => {
  const { phoneNumber } = req.body;
  if (!phoneNumber) {
    return res.status(400).json({ ok: false, error: 'Phone number is required' });
  }
  const cleanPhone = phoneNumber.replace(/\D/g, '');
  console.log(`📱 Requesting pairing code for phone number: ${cleanPhone}`);
  try {
    const code = await client.requestPairingCode(cleanPhone);
    waState.pairingCode = code;
    console.log(`🔑 Pairing Code generated: ${code}`);
    res.json({ ok: true, pairingCode: code });
  } catch (e) {
    console.error('Failed to request pairing code:', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Reset session — clears corrupted auth and restarts client
app.post('/api/reset-session', async (_req, res) => {
  console.log('🔄 Reset session requested — clearing auth data...');
  try {
    await client.destroy().catch(() => {});
    waState = { ready: false, phone: null, name: null, pendingQr: null, pairingCode: null };
    // Remove old session files
    if (fs.existsSync(SESSION_DIR)) {
      fs.rmSync(SESSION_DIR, { recursive: true, force: true });
      fs.mkdirSync(SESSION_DIR, { recursive: true });
      console.log('🗑️  Old session cleared');
    }
    // Re-initialize after a short delay
    setTimeout(() => {
      console.log('🚀 Re-initializing WhatsApp client...');
      client.initialize();
    }, 2000);
    res.json({ ok: true, message: 'Session cleared. New QR will appear in ~10 seconds.' });
  } catch (e) {
    console.error('Reset failed:', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Send message — allows manual owner reply from the web dashboard
app.post('/api/send-message', async (req, res) => {
  const { conversationId, message } = req.body;
  if (!conversationId || !message) {
    return res.status(400).json({ ok: false, error: 'conversationId and message are required' });
  }

  try {
    // 1. Fetch conversation details to get the title (which has the phone number)
    const { data: convo, error: convoErr } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .maybeSingle();

    if (convoErr || !convo) {
      return res.status(404).json({ ok: false, error: 'Conversation not found' });
    }

    // 2. Extract phone number
    const match = convo.title.match(/\((\d+)\)/);
    const phone = match ? match[1] : convo.title.replace('WhatsApp: ', '').trim();

    if (!phone || !/^\d+$/.test(phone)) {
      return res.status(400).json({ ok: false, error: 'Invalid phone number format in conversation title' });
    }

    // 3. Send message via WhatsApp
    const formattedPhone = `${phone}@c.us`;
    console.log(`✉️ Sending manual reply to ${formattedPhone}: "${message}"`);
    await client.sendMessage(formattedPhone, message);

    // 4. Save to database
    const { error: msgErr } = await supabase.from('chat_messages').insert({
      user_id: convo.user_id,
      conversation_id: conversationId,
      role: 'assistant',
      content: message,
      channel: 'whatsapp',
      metadata: { whatsapp_phone: phone, manual: true }
    });

    if (msgErr) throw msgErr;

    // 5. Update last message timestamps
    await supabase.from('conversations')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', conversationId);

    res.json({ ok: true });
  } catch (e) {
    console.error('Failed to send message:', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

const API_PORT = process.env.PORT || 3001;
app.listen(API_PORT, () => {
  console.log(`🌐 WhatsApp API server listening on http://localhost:${API_PORT}`);
});

// Initialize Supabase admin client using Service Role Key to manage user integrations
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("ERROR: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured in your .env file!");
  process.exit(1);
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  }
);

const GROQ_API_KEY = process.env.GROQ_API_KEY;

// Helper to get AI response via Groq with Gemini fallback
async function getAIResponse(messagesInput, systemPrompt) {
  const messages = [];
  if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
  
  if (Array.isArray(messagesInput)) {
    messages.push(...messagesInput);
  } else if (typeof messagesInput === 'string') {
    messages.push({ role: 'user', content: messagesInput });
  }

  // 1. Try Groq
  const groqKey = process.env.GROQ_API_KEY;
  if (groqKey) {
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${groqKey}`
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages,
          max_tokens: 300,
          temperature: 0.7
        })
      });
      if (res.ok) {
        const data = await res.json();
        const text = data?.choices?.[0]?.message?.content?.trim();
        if (text) return text;
      }
    } catch (e) {
      console.error('Groq call failed, trying fallback...', e);
    }
  }

  // 2. Try Gemini Fallback
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/openai/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${geminiKey}`
        },
        body: JSON.stringify({
          model: 'gemini-2.5-flash-lite',
          messages,
          max_tokens: 300,
          temperature: 0.7
        })
      });
      if (res.ok) {
        const data = await res.json();
        const text = data?.choices?.[0]?.message?.content?.trim();
        if (text) return text;
      }
    } catch (e) {
      console.error('Gemini fallback failed:', e);
    }
  }

  return "I'm here to help! What can I do for you?";
}

// Helper to check and renew Google Access Token (for Gmail style learning)
async function getGoogleToken(userId) {
  try {
    const { data: row } = await supabase
      .from("google_connections")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "active")
      .maybeSingle();
    if (!row) return null;

    const expiresAt = new Date(row.expiry).getTime();
    if (expiresAt - 60000 > Date.now()) {
      return row.access_token;
    }
    if (!row.refresh_token) return null;

    // Refresh token request
    const r = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID || "",
        client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
        refresh_token: row.refresh_token,
        grant_type: "refresh_token",
      }),
    });
    if (!r.ok) return null;
    const tok = await r.json();
    const newExpiry = new Date(Date.now() + (tok.expires_in ?? 3600) * 1000).toISOString();
    await supabase.from("google_connections").update({
      access_token: tok.access_token,
      expiry: newExpiry,
    }).eq("user_id", userId);
    return tok.access_token;
  } catch (e) {
    console.error("Google token fetch/refresh failed:", e);
    return null;
  }
}

// Helper to learn user style from sent messages
async function learnUserStyle(userId) {
  try {
    const { data: pref } = await supabase
      .from("preferences")
      .select("value")
      .eq("user_id", userId)
      .eq("key", "whatsapp_learned_style")
      .maybeSingle();

    if (pref?.value?.style) {
      return pref.value.style;
    }

    const token = await getGoogleToken(userId);
    if (!token) return "";

    const gmailRes = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages?q=from:me&maxResults=5", {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!gmailRes.ok) return "";
    const gmailData = await gmailRes.json();
    const messages = gmailData.messages || [];
    const emailBodies = [];

    for (const msg of messages) {
      const detailRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (detailRes.ok) {
        const detailData = await detailRes.json();
        let body = "";
        const payload = detailData.payload;
        if (payload) {
          if (payload.body?.data) {
            body = Buffer.from(payload.body.data, 'base64').toString('utf8');
          } else if (payload.parts) {
            const plain = payload.parts.find(p => p.mimeType === "text/plain");
            if (plain?.body?.data) {
              body = Buffer.from(plain.body.data, 'base64').toString('utf8');
            }
          }
        }
        if (body) emailBodies.push(body.slice(0, 1000));
      }
    }

    if (emailBodies.length > 0) {
      const analysisPrompt = `Analyze the writing style of these emails sent by the user to clients. Identify their tone, typical greetings, signatures, average sentence count, and level of detail. Summarize these rules in 3 short bullet points to guide an assistant who will reply in their style:\n\n${emailBodies.join("\n\n---\n\n")}`;
      const styleReply = await getAIResponse(analysisPrompt);
      if (styleReply) {
        await supabase.from("preferences").upsert({
          user_id: userId,
          key: "whatsapp_learned_style",
          value: { style: styleReply, updated_at: new Date().toISOString() }
        }, { onConflict: "user_id,key" });
        return styleReply;
      }
    }
  } catch (err) {
    console.error("Failed to learn writing style:", err);
  }
  return "";
}

// Detect the primary language of an incoming message
function detectLanguage(text) {
  const lower = text.toLowerCase();

  // Swahili indicators
  const swahiliWords = ['habari', 'karibu', 'asante', 'sijui', 'sawa', 'ndiyo', 'hapana', 'tafadhali', 'samahani', 'pole', 'mambo', 'vipi', 'poa', 'safi', 'shida', 'msaada', 'kesho', 'leo', 'jana', 'rafiki', 'kazi', 'pesa', 'bei', 'bidhaa', 'ninahitaji', 'naweza', 'ninakuja', 'nitawasiliana', 'nitarudi', 'nitakufikia', 'tuma', 'wasiliana', 'naomba', 'niambie', 'nataka', 'tumia', 'unaweza', 'wapi', 'lini', 'nani', 'nini', 'mimi', 'wewe', 'yeye', 'sisi', 'ninyi', 'wao', 'hii', 'hiyo', 'hizi', 'hizo'];
  const swahiliCount = swahiliWords.filter(w => lower.includes(w)).length;
  if (swahiliCount >= 1) return 'Swahili';

  // Arabic indicators
  if (/[\u0600-\u06FF]/.test(text)) return 'Arabic';

  // French indicators
  const frenchWords = ['bonjour', 'merci', 'oui', 'non', 'comment', 'votre', 'vous', 'nous', 'salut', 'bien', 'bonsoir', 'pourquoi', 'quand', 'quel', 'quelle', 'est-ce', 'd\'accord', 'pardon', 's\'il vous plaît'];
  const frenchCount = frenchWords.filter(w => lower.includes(w)).length;
  if (frenchCount >= 1) return 'French';

  // Spanish indicators
  const spanishWords = ['hola', 'gracias', 'buenas', 'sí', 'buenos', 'días', 'tardes', 'cómo', 'qué', 'cuándo', 'dónde', 'quiero', 'necesito', 'puedo', 'puede', 'tienes', 'estoy', 'está'];
  const spanishCount = spanishWords.filter(w => lower.includes(w)).length;
  if (spanishCount >= 1) return 'Spanish';

  // Default to English
  return 'English';
}

// Detect email-related questions
function needsEmailContext(text) {
  const lower = text.toLowerCase();
  const triggers = ["check the email", "did you check", "check your email", "email i sent", "sent you an email", "i emailed", "did you see my email", "did you get my email", "see the email", "read the email", "my email", "the email i"];
  return triggers.some((t) => lower.includes(t));
}

// Fetch recent emails from a contact by name or phone
async function getEmailContext(userId, contactName, contactPhone) {
  try {
    const token = await getGoogleToken(userId);
    if (!token) return "";

    // Search Gmail for emails from this contact
    const query = encodeURIComponent(`from:${contactName || contactPhone}`);
    const gmailRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${query}&maxResults=3`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!gmailRes.ok) return "";
    const gmailData = await gmailRes.json();
    const messages = gmailData.messages || [];
    if (messages.length === 0) return "";

    const emailBodies = [];
    for (const msg of messages) {
      const detailRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!detailRes.ok) continue;
      const detail = await detailRes.json();
      const headers = detail.payload?.headers || [];
      const subject = headers.find(h => h.name === 'Subject')?.value || '(no subject)';
      const from = headers.find(h => h.name === 'From')?.value || '';
      let body = '';
      const payload = detail.payload;
      if (payload?.body?.data) {
        body = Buffer.from(payload.body.data, 'base64').toString('utf8');
      } else if (payload?.parts) {
        const plain = payload.parts.find(p => p.mimeType === 'text/plain');
        if (plain?.body?.data) body = Buffer.from(plain.body.data, 'base64').toString('utf8');
      }
      if (body || subject) {
        emailBodies.push(`Subject: ${subject}\nFrom: ${from}\n${body.slice(0, 800)}`);
      }
    }
    if (emailBodies.length === 0) return "";
    return `\n\n[RECENT EMAILS FROM THIS CONTACT]\n${emailBodies.join('\n\n---\n\n')}`;
  } catch (e) {
    console.error('Email context fetch failed:', e);
    return "";
  }
}

// Detect document RAG query triggers
function needsDocumentContext(text) {
  const lower = text.toLowerCase();
  const triggers = ["document", "file", "pdf", "uploaded", "attached", "what does", "summarize this", "summarize the", "according to", "in the", "from the", "pricing", "services", "hours", "info", "details", "contact"];
  return triggers.some((t) => lower.includes(t));
}

// Fetch relevant document context
async function getDocumentContext(userId, text) {
  try {
    if (!needsDocumentContext(text)) return "";

    const { data: docs } = await supabase
      .from("documents")
      .select("id, filename")
      .eq("user_id", userId)
      .eq("status", "ready");

    if (docs && docs.length > 0) {
      const docIds = docs.map((d) => d.id);
      const { data: chunks } = await supabase
        .from("document_chunks")
        .select("document_id, content")
        .in("document_id", docIds)
        .limit(20);

      if (chunks && chunks.length > 0) {
        const byDoc = new Map();
        for (const d of docs) byDoc.set(d.id, d.filename);
        const parts = [];
        for (const c of chunks) {
          parts.push(`[Document: ${byDoc.get(c.document_id)}]\n${c.content}`);
        }
        return "\n\n[RELEVANT BUSINESS DOCUMENTS / INFORMATION]\n" + parts.join("\n\n");
      }
    }
  } catch (e) {
    console.error("Document retrieval failed:", e);
  }
  return "";
}

// Helper to find standard Chrome/Edge installations on Windows
function getBrowserPath() {
  // On cloud (Linux), use system Chromium installed via Dockerfile
  if (IS_CLOUD) {
    const cloudPaths = [
      '/usr/bin/chromium',
      '/usr/bin/chromium-browser',
      '/usr/bin/google-chrome',
      '/usr/bin/google-chrome-stable'
    ];
    for (const p of cloudPaths) {
      if (fs.existsSync(p)) return p;
    }
    return undefined;
  }

  // On Windows, find local Chrome or Edge
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const chromePathX86 = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  if (fs.existsSync(chromePath)) return chromePath;
  if (fs.existsSync(chromePathX86)) return chromePathX86;
  if (fs.existsSync(edgePath)) return edgePath;
  return undefined;
}

const browserPath = getBrowserPath();
if (browserPath) {
  console.log(`🔎 Found browser for Puppeteer: ${browserPath}`);
} else {
  console.log(`⚠️ Warning: No Chrome/Chromium found. Puppeteer will use its bundled version.`);
}

// Session directory (persisted via Railway volume mount at /data)
const SESSION_DIR = IS_CLOUD ? '/data/.wwebjs_auth' : './.wwebjs_auth';
try { fs.mkdirSync(SESSION_DIR, { recursive: true }); } catch {}

// Clean any stale Chromium process locks from crash/restart
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
      } catch (fileErr) {
        // If lstat fails (e.g. broken symlink), try direct delete if it matches lock names
        if (file === 'SingletonLock' || file === 'SingletonCookie') {
          try {
            fs.unlinkSync(fullPath);
            console.log(`🗑️ Force-removed lock file: ${fullPath}`);
          } catch (e) {}
        }
      }
    }
  } catch (e) {
    console.error('Error cleaning lock files:', e);
  }
}
cleanChromiumLocks(SESSION_DIR);

// Initialize WhatsApp client
const client = new Client({
  authStrategy: new LocalAuth({ dataPath: SESSION_DIR }),
  puppeteer: {
    headless: true,
    executablePath: browserPath || undefined,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--no-first-run',
      '--no-zygote',
      '--single-process'
    ]
  }
});

client.on('qr', async (qr) => {
  console.log('\n================================================================');
  console.log('⚡ SCAN THIS QR CODE WITH YOUR WHATSAPP APP LINKED DEVICES ⚡');
  console.log('================================================================\n');
  qrcodeTerminal.generate(qr, { small: true });

  // Update in-memory state for Express API
  waState = { ready: false, phone: null, name: null, pendingQr: qr };
  console.log('📡 QR code available via http://localhost:' + API_PORT + '/api/whatsapp-status');
});

client.on('ready', async () => {
  const myPhone = client.info.wid.user;
  console.log('\n================================================================');
  console.log(`✅ WhatsApp Client is ready! Logged in as: ${myPhone}`);
  console.log('================================================================\n');

  // Update in-memory state for Express API
  waState = { ready: true, phone: myPhone, name: 'Francisco', pendingQr: null };

  try {
    const { data: profiles } = await supabase.from("profiles").select("id, display_name").limit(1);
    if (profiles && profiles.length > 0) {
      const userId = profiles[0].id;
      const name = profiles[0].display_name || "Francisco";
      waState.name = name;

      // Auto-upsert connection status
      const { data: existing } = await supabase
        .from("whatsapp_connections")
        .select("*")
        .eq("whatsapp_phone", myPhone)
        .eq("status", "active")
        .maybeSingle();

      if (!existing) {
        await supabase.from("whatsapp_connections").insert({
          user_id: userId,
          whatsapp_phone: myPhone,
          whatsapp_name: name,
          status: "active"
        });
        console.log(`🔗 Auto-linked phone ${myPhone} in database for user ${userId}.`);
      }
    }
  } catch (e) {
    console.error("Failed to sync connection status on ready:", e);
  }
});


// Deduplication set to prevent double-processing
const processedMsgIds = new Set();

async function handleMessage(msg) {

  console.log(`\n📩 Message received from: ${msg.from} | fromMe: ${msg.fromMe} | isGroup: ${msg.isGroup} | body: ${msg.body}`);
  if (msg.fromMe || msg.isGroup) return;

  // Deduplicate: skip if we already processed this message ID
  if (processedMsgIds.has(msg.id?.id)) return;
  processedMsgIds.add(msg.id?.id);
  setTimeout(() => processedMsgIds.delete(msg.id?.id), 60000); // clean up after 1 min

  const fromPhone = msg.from.replace('@c.us', '').replace('@lid', ''); // normalize phone
  const myPhone = client.info.wid.user; // company phone number
  console.log(`💬 Processing message from ${fromPhone} to ${myPhone}: "${msg.body}"`);

  try {
    // 1. Find connection matching our company number in DB
    const { data: connection } = await supabase
      .from("whatsapp_connections")
      .select("*")
      .eq("whatsapp_phone", myPhone)
      .eq("status", "active")
      .maybeSingle();

    if (!connection) {
      console.log(`⚠️ Warning: WhatsApp number ${myPhone} is not linked to any active connection in the dashboard.`);
      return;
    }

    const userId = connection.user_id;

    // Get owner's name from profile for personalized responses
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", userId)
      .maybeSingle();
    const ownerName = profile?.display_name || connection.whatsapp_name || "the owner";

    // 2. Retrieve or create thread conversation for this customer
    const contact = await msg.getContact();
    const contactName = contact.pushname || contact.name || null;
    const title = contactName ? `WhatsApp: ${contactName} (${fromPhone})` : `WhatsApp: ${fromPhone}`;

    let { data: convo } = await supabase
      .from("conversations")
      .select("id")
      .eq("user_id", userId)
      .eq("title", title)
      .maybeSingle();

    let conversationId;
    if (convo) {
      conversationId = convo.id;
    } else {
      const { data: newConvo, error: convoErr } = await supabase
        .from("conversations")
        .insert({ user_id: userId, title, title_generated: true })
        .select("id").single();
      if (convoErr) throw convoErr;
      conversationId = newConvo.id;
    }

    // 3. Save incoming customer message
    await supabase.from("chat_messages").insert({
      user_id: userId,
      conversation_id: conversationId,
      role: "user",
      content: msg.body,
      channel: "whatsapp",
      metadata: { whatsapp_phone: fromPhone, whatsapp_name: contactName }
    });

    // Check if auto-reply is disabled globally
    const { data: globalPref } = await supabase
      .from("preferences")
      .select("value")
      .eq("user_id", userId)
      .eq("key", "wa_global_auto_reply_disabled")
      .maybeSingle();

    if (globalPref && (globalPref.value === true || globalPref.value?.disabled === true)) {
      console.log(`🤖 Auto-reply is disabled GLOBALLY. Skipping AI response for ${conversationId} (${contactName || fromPhone}).`);
      await supabase.from("conversations")
        .update({ last_message_at: new Date().toISOString() })
        .eq("id", conversationId);
      return;
    }

    // Check if auto-reply is disabled for this conversation
    const { data: autoReplyPref } = await supabase
      .from("preferences")
      .select("value")
      .eq("user_id", userId)
      .eq("key", `wa_auto_reply_disabled:${conversationId}`)
      .maybeSingle();

    if (autoReplyPref && (autoReplyPref.value === true || autoReplyPref.value?.disabled === true)) {
      console.log(`🤖 Auto-reply is disabled for conversation ${conversationId} (${contactName || fromPhone}). Skipping AI response.`);
      await supabase.from("conversations")
        .update({ last_message_at: new Date().toISOString() })
        .eq("id", conversationId);
      return;
    }

    // 4. Load full conversation history
    const { data: history } = await supabase
      .from("chat_messages")
      .select("role, content")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(50);

    const formattedMessages = (history ?? []).map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: m.content,
    }));

    // 5. Gather writing style, document context, and email context
    const style = await learnUserStyle(userId);
    const docContext = await getDocumentContext(userId, msg.body);
    const emailContext = needsEmailContext(msg.body)
      ? await getEmailContext(userId, contactName, fromPhone)
      : "";

    // Detect language
    const detectedLanguage = detectLanguage(msg.body);
    console.log(`🌍 Detected language: ${detectedLanguage} for message: "${msg.body}"`);

    const systemPrompt = `You are Mr. Cisco — ${ownerName}'s personal AI executive assistant.
You manage ${ownerName}'s WhatsApp messages, emails, tasks, calendar, and business communications.

CRITICAL CONVERSATIONAL RULES:
- DO NOT introduce yourself repeatedly in an active conversation.
- NEVER say "Hi, I'm Mr. Cisco..." or "What's up?" unless explicitly asked who you are.
- Answer the customer's question, statement, or order request directly and helpfully.
- Keep replies concise (1 to 3 short sentences).
- Sound warm, helpful, professional, and natural.
- Respond in ${detectedLanguage}.

${style ? `${ownerName.toUpperCase()}'S COMMUNICATION STYLE (mirror this):\n${style}` : ''}
${emailContext ? `EMAIL CONTEXT:\n${emailContext}` : ''}
${docContext ? `BUSINESS DOCUMENTS / INFO:\n${docContext}` : ''}`;

    // 6. Generate reply
    const reply = await getAIResponse(formattedMessages, systemPrompt);
    const finalReply = reply || "I didn't catch that — could you rephrase?";

    // 7. Save assistant message and reply to WhatsApp client
    await supabase.from("chat_messages").insert({
      user_id: userId,
      conversation_id: conversationId,
      role: "assistant",
      content: finalReply,
      channel: "whatsapp",
      metadata: { whatsapp_phone: fromPhone }
    });

    await supabase.from("conversations")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", conversationId);

    await supabase.from("whatsapp_connections")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", connection.id);

    // 10-second human typing delay
    await new Promise((resolve) => setTimeout(resolve, 10000));

    await msg.reply(finalReply);
    console.log(`📨 Replied to ${contactName || fromPhone}: ${finalReply}`);

  } catch (error) {
    console.error('Error handling message:', error);
  }
}

// Use only the 'message' event — message_create fires for sent messages too
client.on('message', handleMessage);

client.on('disconnected', async (reason) => {
  console.log('⚠️ Client was disconnected:', reason);
  waState = { ready: false, phone: null, name: null, pendingQr: null, pairingCode: null };

  // Auto-reconnect after 10 seconds
  console.log('🔄 Will attempt to reconnect in 10 seconds...');
  setTimeout(async () => {
    try {
      console.log('🚀 Reconnecting WhatsApp client...');
      await client.initialize();
    } catch (e) {
      console.error('❌ Reconnection failed:', e);
      // Try again after 30 seconds
      setTimeout(() => {
        console.log('🔄 Retrying reconnection...');
        client.initialize().catch(err => console.error('❌ Retry failed:', err));
      }, 30000);
    }
  }, 10000);
});

client.on('auth_failure', (msg) => {
  console.error('❌ Auth failure:', msg);
  waState = { ready: false, phone: null, name: null, pendingQr: null, pairingCode: null };
  // Session is invalid, clear and restart to get new QR
  setTimeout(async () => {
    try {
      if (fs.existsSync(SESSION_DIR)) {
        fs.rmSync(SESSION_DIR, { recursive: true, force: true });
        fs.mkdirSync(SESSION_DIR, { recursive: true });
        console.log('🗑️ Cleared invalid session, restarting...');
      }
      await client.initialize();
    } catch (e) {
      console.error('❌ Re-init after auth failure failed:', e);
    }
  }, 5000);
});

// Keep-alive: ping Railway every 10 minutes to prevent idle shutdown
setInterval(() => {
  console.log(`💓 Keep-alive ping — ${new Date().toISOString()} — WA connected: ${waState.ready}`);
}, 10 * 60 * 1000);

client.initialize();
