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
    // 1. Fetch conversation details
    const { data: convo, error: convoErr } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .maybeSingle();

    if (convoErr || !convo) {
      return res.status(404).json({ ok: false, error: 'Conversation not found' });
    }

    // 2. Try to find the most recent message to get the sender JID
    const { data: lastMsg } = await supabase
      .from('chat_messages')
      .select('metadata')
      .eq('conversation_id', conversationId)
      .eq('role', 'user')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // 3. Determine WhatsApp JID from metadata or title
    let jid = lastMsg?.metadata?.whatsapp_jid || lastMsg?.metadata?.from || null;

    if (!jid) {
      // Try extracting phone from title like "WhatsApp: Name (254712345678)"
      const phoneMatch = convo.title.match(/(\d{7,15})/);
      if (phoneMatch) {
        jid = `${phoneMatch[1]}@c.us`;
      }
    }

    // 4. Block broadcast/status (cannot message them)
    if (!jid || jid.includes('broadcast') || jid.includes('status')) {
      return res.status(400).json({ 
        ok: false, 
        error: 'This is a broadcast or status contact — you cannot send direct messages to it. Select a real customer conversation.' 
      });
    }

    console.log(`✉️ Sending manual reply to ${jid}: "${message}"`);
    await client.sendMessage(jid, message);

    // 5. Save to database
    const { error: msgErr } = await supabase.from('chat_messages').insert({
      user_id: convo.user_id,
      conversation_id: conversationId,
      role: 'assistant',
      content: message,
      channel: 'whatsapp',
      metadata: { whatsapp_jid: jid, manual: true }
    });

    if (msgErr) throw msgErr;

    // 6. Update last message timestamp
    await supabase.from('conversations')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', conversationId);

    res.json({ ok: true });
  } catch (e) {
    console.error('Failed to send message:', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Instagram Webhook Verification (Meta setup)
app.get('/api/instagram-webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  const expectedToken = process.env.WEBHOOK_VERIFY_TOKEN || 'MrCiscoVerifyToken123';

  if (mode === 'subscribe' && token === expectedToken) {
    console.log('✅ Instagram Webhook verified successfully!');
    res.status(200).send(challenge);
  } else {
    console.error('❌ Instagram Webhook verification failed');
    res.sendStatus(403);
  }
});

// Instagram Incoming Message Event Webhook
app.post('/api/instagram-webhook', async (req, res) => {
  res.status(200).send('EVENT_RECEIVED');
  try {
    const body = req.body;
    if (body.object === 'instagram' || body.object === 'page') {
      for (const entry of body.entry || []) {
        for (const messagingObj of entry.messaging || []) {
          const senderId = messagingObj.sender?.id;
          const messageText = messagingObj.message?.text;
          const isEcho = messagingObj.message?.is_echo;
          if (senderId && messageText && !isEcho) {
            console.log(`📸 Incoming Instagram DM from ${senderId}: "${messageText}"`);
            handleInstagramMessage(senderId, messageText).catch(e => console.error('IG DM error:', e));
          }
        }
      }
    }
  } catch (e) {
    console.error('Error handling Instagram webhook:', e);
  }
});

// Process Instagram DM with Central AI Brain & Document Memory
async function handleInstagramMessage(senderId, messageText) {
  try {
    // 1. Find active Instagram connection in preferences
    const { data: prefData } = await supabase
      .from('preferences')
      .select('user_id, value')
      .eq('key', 'ig_connection_config')
      .limit(1)
      .maybeSingle();

    if (!prefData || !prefData.value || !prefData.value.accountId) {
      console.log('⚠️ No active Instagram connection config found in DB.');
      return;
    }

    const userId = prefData.user_id;
    const config = prefData.value;
    const token = config.token;

    if (config.autoReply === false) {
      console.log('🤖 Instagram auto-reply is PAUSED.');
      return;
    }

    // 2. Retrieve or create Instagram conversation
    const title = `Instagram: Customer (${senderId})`;
    let { data: convo } = await supabase
      .from('conversations')
      .select('id')
      .eq('user_id', userId)
      .eq('title', title)
      .maybeSingle();

    let conversationId;
    if (convo) {
      conversationId = convo.id;
    } else {
      const { data: newConvo, error: convoErr } = await supabase
        .from('conversations')
        .insert({ user_id: userId, title, title_generated: true, channel: 'instagram' })
        .select('id').single();
      if (convoErr) throw convoErr;
      conversationId = newConvo.id;
    }

    // 3. Save incoming customer DM
    await supabase.from('chat_messages').insert({
      user_id: userId,
      conversation_id: conversationId,
      role: 'user',
      content: messageText,
      channel: 'instagram',
      metadata: { instagram_sender_id: senderId }
    });

    // 4. Load recent history
    const { data: history } = await supabase
      .from('chat_messages')
      .select('role, content')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(20);

    const formatted = (history ?? []).map(m => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content
    }));

    // 5. Gather central document context
    const docContext = await getDocumentContext(userId, messageText);
    const detectedLang = detectLanguage(messageText);

    const systemPrompt = `You are Mr. Cisco, the personal Instagram DM assistant.
Reply directly, warmly, and naturally to what the customer said (1-2 sentences).
Language: ${detectedLang}.
${docContext ? `\nBusiness info you can use:\n${docContext}` : ''}`;

    const reply = await getAIResponse(formatted, systemPrompt);
    const finalReply = reply || "Thanks for reaching out! Let me check on that for you.";

    // 6. Save assistant response
    await supabase.from('chat_messages').insert({
      user_id: userId,
      conversation_id: conversationId,
      role: 'assistant',
      content: finalReply,
      channel: 'instagram',
      metadata: { instagram_sender_id: senderId }
    });

    await supabase.from('conversations')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', conversationId);

    // 7. Send reply via Meta Graph API
    if (token) {
      const sendRes = await fetch(`https://graph.facebook.com/v19.0/me/messages?access_token=${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient: { id: senderId },
          message: { text: finalReply }
        })
      });
      if (sendRes.ok) {
        console.log(`📨 Sent Instagram DM reply to ${senderId}: "${finalReply}"`);
      } else {
        console.error('Failed to send Instagram DM via Meta API:', sendRes.status, await sendRes.text());
      }
    }
  } catch (e) {
    console.error('Error in handleInstagramMessage:', e);
  }
}

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

// Helper to get AI response — OpenRouter free models → Groq fallback
async function getAIResponse(messagesInput, systemPrompt) {
  const messages = [];
  if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
  
  if (Array.isArray(messagesInput)) {
    messages.push(...messagesInput.filter(m => m.content && m.content.trim()));
  } else if (typeof messagesInput === 'string') {
    messages.push({ role: 'user', content: messagesInput });
  }

  console.log(`🤖 Sending ${messages.length} messages to AI. Last user msg: "${messages.filter(m=>m.role==='user').slice(-1)[0]?.content?.slice(0,80)}"`);

  // 1. OpenRouter — completely free, no billing needed
  const openrouterKey = process.env.OPENROUTER_API_KEY || 'sk-or-v1-placeholder';
  const freeModels = [
    'meta-llama/llama-3.1-8b-instruct:free',
    'google/gemma-3-27b-it:free',
    'mistralai/mistral-7b-instruct:free'
  ];

  if (openrouterKey && !openrouterKey.includes('placeholder')) {
    for (const model of freeModels) {
      try {
        const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${openrouterKey}`,
            'HTTP-Referer': 'https://executive-agent-hub-main.vercel.app',
            'X-Title': 'Mr. Cisco WhatsApp Bot'
          },
          body: JSON.stringify({ model, messages, max_tokens: 300, temperature: 0.9 })
        });
        if (res.ok) {
          const data = await res.json();
          const text = data?.choices?.[0]?.message?.content?.trim();
          if (text) { console.log(`✅ OpenRouter (${model}) OK`); return text; }
        }
      } catch (e) { console.error(`OpenRouter ${model} failed:`, e.message); }
    }
  }

  // 2. Groq — free tier, fast Llama models
  const groqKey = process.env.GROQ_API_KEY || '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';
  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${groqKey}` },
      body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages, max_tokens: 300, temperature: 0.9 })
    });
    if (res.ok) {
      const data = await res.json();
      const text = data?.choices?.[0]?.message?.content?.trim();
      if (text) { console.log('✅ Groq OK'); return text; }
    } else {
      const err = await res.text();
      console.error('Groq error:', res.status, err);
    }
  } catch (e) { console.error('Groq failed:', e.message); }

  // 3. Gemini via AI Studio (free)
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) {
    try {
      const res = await fetch('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${geminiKey}` },
        body: JSON.stringify({ model: 'gemini-2.0-flash', messages, max_tokens: 300, temperature: 0.9 })
      });
      if (res.ok) {
        const data = await res.json();
        const text = data?.choices?.[0]?.message?.content?.trim();
        if (text) { console.log('✅ Gemini OK'); return text; }
      }
    } catch (e) { console.error('Gemini failed:', e.message); }
  }

  return null;
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

    // 3. Save incoming customer message with full JID for replies
    await supabase.from("chat_messages").insert({
      user_id: userId,
      conversation_id: conversationId,
      role: "user",
      content: msg.body,
      channel: "whatsapp",
      metadata: { whatsapp_phone: fromPhone, whatsapp_name: contactName, whatsapp_jid: msg.from }
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

    // Build a simple, direct system prompt — less rules = better AI understanding
    const isNewConvo = formattedMessages.length <= 1;
    const systemPrompt = `You are Mr. Cisco, the personal WhatsApp assistant of ${ownerName}.

Rules:
- Reply ONLY to what the person just said. Read their message carefully and respond to it directly.
- Sound like a real human texting — casual, warm, short (1-3 sentences).
- Never use bullet points. Never start with "Certainly" or "Of course".
- Never repeat yourself or ignore what they said.
- If it's the first message, greet briefly. Otherwise just reply to the point.
- Language: ${detectedLanguage}.
${ownerName !== 'the owner' ? `- You represent: ${ownerName}` : ''}
${docContext ? `\nBusiness info you can use:\n${docContext}` : ''}`;

    // Always make sure the current message is last in the history
    const currentMsg = msg.body?.trim();
    const historyWithoutCurrent = formattedMessages.filter(
      (m, i) => !(i === formattedMessages.length - 1 && m.role === 'user' && m.content === currentMsg)
    );
    // Rebuild clean message array: history + explicit current message
    const messagesForAI = [
      ...historyWithoutCurrent.slice(-10), // last 10 messages for context
      { role: 'user', content: currentMsg }
    ];

    console.log(`📤 Sending to AI — last msg: "${currentMsg}" | history: ${messagesForAI.length} msgs`);

    // 6. Generate reply
    const reply = await getAIResponse(messagesForAI, systemPrompt);
    
    // If AI completely failed, use a natural sounding fallback
    const naturalFallbacks = [
      "Got it, let me check on that for you.",
      "Sure thing, I'll look into it.",
      "On it — give me a moment.",
      "Noted! I'll follow up shortly."
    ];
    const finalReply = reply || naturalFallbacks[Math.floor(Math.random() * naturalFallbacks.length)];

    // 7. Save assistant message
    await supabase.from("chat_messages").insert({
      user_id: userId,
      conversation_id: conversationId,
      role: "assistant",
      content: finalReply,
      channel: "whatsapp",
      metadata: { whatsapp_phone: fromPhone, whatsapp_jid: msg.from }
    });

    await supabase.from("conversations")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", conversationId);

    await supabase.from("whatsapp_connections")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", connection.id);

    // Human-like typing delay: 5-12 seconds random
    const delay = 5000 + Math.floor(Math.random() * 7000);
    await new Promise((resolve) => setTimeout(resolve, delay));

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
