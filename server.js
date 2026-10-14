/**
 * Sunstar (ChatBot AI) — servidor Express con streaming SSE
 * Proveedores: Anthropic Claude, Google Gemini y cualquier API compatible con
 * OpenAI (ChatGPT, DeepSeek, Grok, Qwen, Mistral, Groq, OpenRouter, Ollama).
 * Node.js 18+ requerido (usa fetch nativo)
 */

const express = require('express');
const cors    = require('cors');
const path    = require('path');

const ANTHROPIC_BASE = process.env.ANTHROPIC_BASE || 'https://api.anthropic.com';
const GEMINI_BASE    = process.env.GEMINI_BASE    || 'https://generativelanguage.googleapis.com';

/**
 * Proveedores con API tipo OpenAI (POST {base}/chat/completions, GET {base}/models).
 * Cada base se puede sobrescribir con <ID>_BASE (p. ej. QWEN_BASE para la región de China).
 */
const COMPAT = {
  openai:     { name: 'OpenAI',     base: 'https://api.openai.com/v1' },
  deepseek:   { name: 'DeepSeek',   base: 'https://api.deepseek.com/v1' },
  grok:       { name: 'xAI Grok',   base: 'https://api.x.ai/v1' },
  qwen:       { name: 'Qwen',       base: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1' },
  mistral:    { name: 'Mistral',    base: 'https://api.mistral.ai/v1' },
  groq:       { name: 'Groq',       base: 'https://api.groq.com/openai/v1' },
  openrouter: { name: 'OpenRouter', base: 'https://openrouter.ai/api/v1' },
  ollama:     { name: 'Ollama',     base: 'http://localhost:11434/v1', noKey: true },
};
for (const [id, c] of Object.entries(COMPAT)) c.base = (process.env[`${id.toUpperCase()}_BASE`] || c.base).replace(/\/$/, '');

const compatHeaders = (id, apiKey) => ({
  'Content-Type': 'application/json',
  ...(COMPAT[id].noKey ? {} : { Authorization: `Bearer ${apiKey}` }),
  ...(id === 'openrouter' ? { 'HTTP-Referer': 'http://localhost', 'X-Title': 'Sunstar' } : {}),
});

const app = express();
// Solo permite orígenes locales (la app se sirve desde este mismo servidor)
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return cb(null, true);
    cb(new Error('Origen no permitido por CORS'));
  },
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ─── Helpers SSE ──────────────────────────────────────────────────────────────

function sseHeaders(res) {
  res.setHeader('Content-Type',      'text/event-stream');
  res.setHeader('Cache-Control',     'no-cache');
  res.setHeader('Connection',        'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');   // desactiva buffering de nginx/proxies
  res.flushHeaders();
}

function sseToken(res, token) {
  res.write(`data: ${JSON.stringify({ token })}\n\n`);
}

function sseLog(res, message, level = 'info') {
  res.write(`data: ${JSON.stringify({ log: message, level })}\n\n`);
}

function sseError(res, message) {
  res.write(`data: ${JSON.stringify({ error: message })}\n\n`);
}

function sseDone(res) {
  res.write('data: [DONE]\n\n');
  res.end();
}

/**
 * Lee el stream de fetch línea a línea y llama a onLine(line) por cada línea SSE.
 * Maneja los casos donde un chunk contiene múltiples líneas o líneas parciales.
 */
async function pipeSSE(fetchResponse, onLine, signal) {
  const reader  = fetchResponse.body.getReader();
  const decoder = new TextDecoder();
  let   buffer  = '';

  while (true) {
    if (signal?.aborted) break;

    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    // Procesa todas las líneas completas del buffer
    let idx;
    while ((idx = buffer.indexOf('\n')) !== -1) {
      const line = buffer.slice(0, idx).replace(/\r$/, '');
      buffer = buffer.slice(idx + 1);
      if (line) onLine(line);
    }
  }

  // Procesa cualquier remanente
  if (buffer.trim()) onLine(buffer.trim());
}

// ─── Endpoint: verificar API key ──────────────────────────────────────────────

app.post('/api/check', async (req, res) => {
  const { provider, apiKey } = req.body || {};
  const compat = COMPAT[provider];
  if (!apiKey && !compat?.noKey) return res.json({ ok: false, message: 'No hay API key.' });

  const t0 = Date.now();
  try {
    let r;
    if (provider === 'gemini')      r = await fetch(`${GEMINI_BASE}/v1beta/models?pageSize=100`, { headers: { 'x-goog-api-key': apiKey } });
    else if (compat)                r = await fetch(`${compat.base}/models`, { headers: compatHeaders(provider, apiKey) });
    else                            r = await fetch(`${ANTHROPIC_BASE}/v1/models?limit=100`, { headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' } });

    const body = await r.json().catch(() => ({}));
    const ms = Date.now() - t0;
    if (!r.ok) {
      const msg = typeof body?.error === 'string' ? body.error : body?.error?.message;
      return res.json({ ok: false, status: r.status, ms, message: msg || `HTTP ${r.status}` });
    }
    let models;
    if (provider === 'gemini') {
      models = (body.models || [])
        .filter(m => (m.supportedGenerationMethods || []).includes('generateContent'))
        .map(m => m.name.replace(/^models\//, ''));
    } else {
      // OpenAI-compatibles: los más recientes primero cuando hay fecha
      const list = [...(body.data || [])];
      if (compat && list.some(m => m.created)) list.sort((a, b) => (b.created || 0) - (a.created || 0));
      models = list.map(m => m.id);
    }
    res.json({ ok: true, status: r.status, ms, models });
  } catch (err) {
    res.json({ ok: false, ms: Date.now() - t0, message: `No se pudo conectar: ${err.message}` });
  }
});

// ─── Endpoint: Claude ─────────────────────────────────────────────────────────

app.post('/api/chat/claude', async (req, res) => {
  const { messages, apiKey, model, system, temperature } = req.body;

  if (!apiKey) {
    return res.status(400).json({ error: 'Falta la API key de Anthropic.' });
  }

  sseHeaders(res);

  // Permite cancelar el fetch si el cliente se desconecta
  const controller = new AbortController();
  res.on('close', () => { if (!res.writableFinished) controller.abort(); });

  try {
    const t0 = Date.now();
    sseLog(res, 'Servidor → api.anthropic.com/v1/messages');
    const upstream = await fetch(`${ANTHROPIC_BASE}/v1/messages`, {
      method:  'POST',
      signal:  controller.signal,
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model:      model || 'claude-sonnet-5-5',
        max_tokens: 8192,
        stream:     true,
        messages,
        ...(system ? { system } : {}),
        ...(typeof temperature === 'number' ? { temperature } : {}),
      }),
    });

    sseLog(res, `Claude respondió HTTP ${upstream.status} en ${Date.now() - t0}ms`, upstream.ok ? 'ok' : 'error');
    if (!upstream.ok) {
      const errBody = await upstream.json().catch(() => ({}));
      sseError(res, errBody?.error?.message || `Error ${upstream.status} de la API de Claude`);
      return sseDone(res);
    }

    let got = false, stop = null;
    await pipeSSE(upstream, (line) => {
      if (!line.startsWith('data: ')) return;
      const raw = line.slice(6).trim();
      if (raw === '[DONE]') return;

      try {
        const evt = JSON.parse(raw);
        if (evt.type === 'content_block_delta' && evt.delta?.type === 'text_delta') {
          got = true;
          sseToken(res, evt.delta.text);
        } else if (evt.type === 'message_delta' && evt.delta?.stop_reason) {
          stop = evt.delta.stop_reason;
        } else if (evt.type === 'error') {
          sseError(res, evt.error?.message || 'Error en el stream de Claude');
        }
      } catch { /* chunk inválido, ignorar */ }
    }, controller.signal);

    if (!got && !controller.signal.aborted) sseError(res, `Claude devolvió una respuesta vacía (stop_reason: ${stop || 'desconocido'}).`);
    else if (stop) sseLog(res, `Fin del stream · stop_reason: ${stop}`, stop === 'max_tokens' ? 'warn' : 'info');
    sseDone(res);

  } catch (err) {
    if (err.name !== 'AbortError') {
      sseError(res, err.message);
    }
    sseDone(res);
  }
});

// ─── Endpoint: Gemini ─────────────────────────────────────────────────────────

app.post('/api/chat/gemini', async (req, res) => {
  const { messages, apiKey, model, system, temperature } = req.body;

  if (!apiKey) {
    return res.status(400).json({ error: 'Falta la API key de Google AI.' });
  }

  sseHeaders(res);

  const controller = new AbortController();
  res.on('close', () => { if (!res.writableFinished) controller.abort(); });

  // Convierte el historial al formato que Gemini espera
  const contents = messages.map(msg => ({
    role:  msg.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: msg.content }],
  }));

  const modelName = model || 'gemini-2.0-flash';
  // La key va en un header (no en la URL) para que no quede en logs
  const url = `${GEMINI_BASE}/v1beta/models/${encodeURIComponent(modelName)}:streamGenerateContent?alt=sse`;

  try {
    const t0 = Date.now();
    sseLog(res, `Servidor → generativelanguage.googleapis.com (${modelName})`);
    const upstream = await fetch(url, {
      method:  'POST',
      signal:  controller.signal,
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body:    JSON.stringify({
        contents,
        ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
        generationConfig: {
          maxOutputTokens: 8192,
          temperature:     typeof temperature === 'number' ? temperature : 0.7,
        },
      }),
    });

    sseLog(res, `Gemini respondió HTTP ${upstream.status} en ${Date.now() - t0}ms`, upstream.ok ? 'ok' : 'error');
    if (!upstream.ok) {
      const errBody = await upstream.json().catch(() => ({}));
      sseError(res, errBody?.error?.message || `Error ${upstream.status} de la API de Gemini`);
      return sseDone(res);
    }

    let got = false, finish = null, blocked = null;
    await pipeSSE(upstream, (line) => {
      if (!line.startsWith('data: ')) return;
      const raw = line.slice(6).trim();
      if (raw === '[DONE]') return;

      try {
        const evt  = JSON.parse(raw);
        const text = (evt.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('');
        if (evt.promptFeedback?.blockReason) blocked = evt.promptFeedback.blockReason;
        const fr = evt.candidates?.[0]?.finishReason;
        if (fr) finish = fr;
        if (text) { got = true; sseToken(res, text); }
      } catch { /* ignorar */ }
    }, controller.signal);

    if (!got && !controller.signal.aborted) {
      sseError(res, `Gemini devolvió una respuesta vacía (${blocked ? 'bloqueado: ' + blocked : 'finishReason: ' + (finish || 'desconocido')}). Prueba con otro modelo.`);
    } else if (finish) {
      sseLog(res, `Fin del stream · finishReason: ${finish}`, finish === 'STOP' ? 'info' : 'warn');
    }
    sseDone(res);

  } catch (err) {
    if (err.name !== 'AbortError') {
      sseError(res, err.message);
    }
    sseDone(res);
  }
});

// ─── Endpoint: proveedores compatibles con OpenAI ─────────────────────────────

app.post('/api/chat/:provider', async (req, res) => {
  const id  = req.params.provider;
  const cfg = COMPAT[id];
  if (!cfg) return res.status(404).json({ error: `Proveedor desconocido: ${id}` });

  const { messages, apiKey, model, system, temperature } = req.body;
  if (!apiKey && !cfg.noKey) return res.status(400).json({ error: `Falta la API key de ${cfg.name}.` });
  if (!model) return res.status(400).json({ error: 'Falta el modelo.' });

  sseHeaders(res);

  const controller = new AbortController();
  res.on('close', () => { if (!res.writableFinished) controller.abort(); });

  try {
    const t0 = Date.now();
    sseLog(res, `Servidor → ${cfg.base}/chat/completions (${model})`);
    const upstream = await fetch(`${cfg.base}/chat/completions`, {
      method:  'POST',
      signal:  controller.signal,
      headers: compatHeaders(id, apiKey),
      body: JSON.stringify({
        model,
        stream: true,
        messages: [...(system ? [{ role: 'system', content: system }] : []), ...messages],
        ...(typeof temperature === 'number' ? { temperature } : {}),
      }),
    });

    sseLog(res, `${cfg.name} respondió HTTP ${upstream.status} en ${Date.now() - t0}ms`, upstream.ok ? 'ok' : 'error');
    if (!upstream.ok) {
      const errBody = await upstream.json().catch(() => ({}));
      const msg = typeof errBody?.error === 'string' ? errBody.error : errBody?.error?.message;
      sseError(res, msg || errBody?.message || `Error ${upstream.status} de la API de ${cfg.name}`);
      return sseDone(res);
    }

    let got = false, finish = null, reasoning = false;
    await pipeSSE(upstream, (line) => {
      if (!line.startsWith('data:')) return;
      const raw = line.slice(5).trim();
      if (!raw || raw === '[DONE]') return;
      try {
        const evt = JSON.parse(raw);
        if (evt.error) { sseError(res, evt.error.message || String(evt.error)); return; }
        const choice = evt.choices?.[0];
        const delta  = choice?.delta;
        if (delta?.reasoning_content && !reasoning) { reasoning = true; sseLog(res, 'El modelo está razonando antes de responder…'); }
        if (delta?.content) { got = true; sseToken(res, delta.content); }
        if (choice?.finish_reason) finish = choice.finish_reason;
      } catch { /* chunk inválido, ignorar */ }
    }, controller.signal);

    if (!got && !controller.signal.aborted) sseError(res, `${cfg.name} devolvió una respuesta vacía (finish_reason: ${finish || 'desconocido'}). Prueba con otro modelo.`);
    else if (finish) sseLog(res, `Fin del stream · finish_reason: ${finish}`, finish === 'stop' ? 'info' : 'warn');
    sseDone(res);

  } catch (err) {
    if (err.name !== 'AbortError') {
      const refused = /ECONNREFUSED|fetch failed/i.test(err.cause?.code || err.message);
      sseError(res, refused && id === 'ollama' ? 'No se pudo conectar con Ollama. ¿Está en ejecución en localhost:11434?' : err.message);
    }
    sseDone(res);
  }
});

// ─── Catch-all: sirve index.html ──────────────────────────────────────────────

app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ─── Start ────────────────────────────────────────────────────────────────────

module.exports = app;

if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`
  Sunstar (ChatBot AI) corriendo en  http://localhost:${PORT}
`);
  });
}
