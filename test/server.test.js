/**
 * Tests del backend con proveedores simulados.  Ejecutar:  npm test
 * Prueba real contra Gemini/Claude (opcional):
 *   GEMINI_API_KEY=... [GEMINI_MODEL=gemini-2.5-flash] npm test
 *   ANTHROPIC_API_KEY=... [ANTHROPIC_MODEL=...]        npm test
 */
const test   = require('node:test');
const assert = require('node:assert/strict');
const http   = require('node:http');

// ── upstream falso ────────────────────────────────────────────
let upstreamAborted = false;

const sse = (res, obj) => res.write(`data: ${JSON.stringify(obj)}\n\n`);
const readBody = (req) => new Promise(r => {
  let d = '';
  req.on('data', c => d += c);
  req.on('end', () => r(d ? JSON.parse(d) : {}));
});
const json = (res, status, obj) => {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(obj));
};

const fake = http.createServer(async (req, res) => {
  const url = req.url;

  if (req.method === 'GET' && url.startsWith('/v1beta/models')) {
    if (req.headers['x-goog-api-key'] !== 'good') return json(res, 400, { error: { message: 'API key not valid.' } });
    return json(res, 200, { models: [
      { name: 'models/gemini-ok',  supportedGenerationMethods: ['generateContent'] },
      { name: 'models/embed-only', supportedGenerationMethods: ['embedContent'] },
    ] });
  }
  if (req.method === 'GET' && url.startsWith('/v1/models')) {
    if (req.headers['x-api-key'] !== 'good') return json(res, 401, { error: { message: 'invalid x-api-key' } });
    return json(res, 200, { data: [{ id: 'claude-ok' }] });
  }

  // OpenAI-compatibles: /<id>/v1/models
  const mm = /^\/(\w+)\/v1\/models/.exec(url);
  if (req.method === 'GET' && mm) {
    const ok = mm[1] === 'ollama' || req.headers.authorization === 'Bearer good';
    if (!ok) return json(res, 401, { error: { message: 'Incorrect API key provided' } });
    return json(res, 200, { data: [{ id: 'old-model', created: 1 }, { id: 'new-model', created: 99 }] });
  }

  const b = await readBody(req);

  // OpenAI-compatibles: /<id>/v1/chat/completions
  const cm = /^\/(\w+)\/v1\/chat\/completions/.exec(url);
  if (cm) {
    const id = cm[1];
    if (id !== 'ollama' && req.headers.authorization !== 'Bearer good') return json(res, 401, { error: { message: 'Incorrect API key provided' } });
    if (b.model === 'err') return json(res, 404, { error: { message: 'The model does not exist' } });
    res.writeHead(200, { 'Content-Type': 'text/event-stream' });
    const chunk = (delta, finish) => sse(res, { choices: [{ delta, finish_reason: finish || null }] });
    if (b.model === 'empty') { chunk({}, 'content_filter'); return res.end(); }
    if (b.model === 'echo') {
      chunk({ content: JSON.stringify({ first: b.messages[0], n: b.messages.length, temp: b.temperature, auth: req.headers.authorization || null, referer: req.headers['x-title'] || null }) });
      return res.end();
    }
    if (b.model === 'think') chunk({ reasoning_content: 'hmm' });
    chunk({ content: `Hola desde ${id} ` });
    chunk({ content: 'mundo' }, 'stop');
    res.write('data: [DONE]\n\n');
    return res.end();
  }

  // Gemini
  if (url.includes(':streamGenerateContent')) {
    const model = decodeURIComponent(url.split('/models/')[1].split(':')[0]);
    if (req.headers['x-goog-api-key'] !== 'good') return json(res, 400, { error: { message: 'API key not valid.' } });
    if (model === 'err') return json(res, 404, { error: { message: 'model not found' } });

    res.writeHead(200, { 'Content-Type': 'text/event-stream' });
    if (model === 'empty') {
      sse(res, { candidates: [{ finishReason: 'SAFETY' }] });
      return res.end();
    }
    if (model === 'slow') {
      res.on('close', () => { upstreamAborted = true; });
      sse(res, { candidates: [{ content: { parts: [{ text: 'inicio ' }] } }] });
      return;   // nunca termina
    }
    if (model === 'echo') {   // devuelve lo que recibió, para validar el payload
      sse(res, { candidates: [{ content: { parts: [{ text: JSON.stringify({
        sys:  b.systemInstruction?.parts?.[0]?.text,
        temp: b.generationConfig?.temperature,
        n:    b.contents.length,
        role: b.contents[0].role,
      }) }] } }] });
      return res.end();
    }
    sse(res, { candidates: [{ content: { parts: [{ text: 'Hola ' }] } }] });
    sse(res, { candidates: [{ content: { parts: [{ text: 'mundo' }, { text: '!' }] }, finishReason: 'STOP' }] });
    return res.end();
  }

  // Claude
  if (url.startsWith('/v1/messages')) {
    if (req.headers['x-api-key'] !== 'good') return json(res, 401, { error: { message: 'invalid x-api-key' } });
    res.writeHead(200, { 'Content-Type': 'text/event-stream' });
    if (b.model === 'empty') {
      sse(res, { type: 'message_delta', delta: { stop_reason: 'refusal' } });
      return res.end();
    }
    if (b.model === 'echo') {
      sse(res, { type: 'content_block_delta', delta: { type: 'text_delta', text: JSON.stringify({ system: b.system, temperature: b.temperature, max: b.max_tokens }) } });
      return res.end();
    }
    sse(res, { type: 'content_block_delta', delta: { type: 'text_delta', text: 'Hola ' } });
    sse(res, { type: 'content_block_delta', delta: { type: 'text_delta', text: 'Claude' } });
    sse(res, { type: 'message_delta', delta: { stop_reason: 'end_turn' } });
    return res.end();
  }

  res.writeHead(404);
  res.end();
});

// ── app bajo prueba ───────────────────────────────────────────
let appServer, base;

test.before(async () => {
  await new Promise(r => fake.listen(0, r));
  const fb = `http://127.0.0.1:${fake.address().port}`;
  process.env.GEMINI_BASE    = fb;
  process.env.ANTHROPIC_BASE = fb;
  for (const id of ['openai', 'deepseek', 'grok', 'qwen', 'mistral', 'groq', 'openrouter', 'ollama']) {
    process.env[`${id.toUpperCase()}_BASE`] = `${fb}/${id}/v1`;
  }
  const app = require('../server.js');
  appServer = http.createServer(app);
  await new Promise(r => appServer.listen(0, r));
  base = `http://127.0.0.1:${appServer.address().port}`;
});

test.after(() => {
  appServer.closeAllConnections?.(); appServer.close();
  fake.closeAllConnections?.();      fake.close();
});

/** POST al chat y devuelve { status, text, errors, logs, done } */
async function chat(provider, payload, { signal } = {}) {
  const res = await fetch(`${base}/api/chat/${provider}`, {
    method: 'POST', signal, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
  });
  const out = { status: res.status, text: '', errors: [], logs: [], done: false };
  if (!res.ok) { out.json = await res.json(); return out; }
  const dec = new TextDecoder();
  let buf = '';
  for await (const chunk of res.body) {
    buf += dec.decode(chunk, { stream: true });
    let i;
    while ((i = buf.indexOf('\n')) !== -1) {
      const line = buf.slice(0, i);
      buf = buf.slice(i + 1);
      if (!line.startsWith('data: ')) continue;
      const raw = line.slice(6).trim();
      if (raw === '[DONE]') { out.done = true; continue; }
      const p = JSON.parse(raw);
      if (p.token) out.text += p.token;
      if (p.error) out.errors.push(p.error);
      if (p.log)   out.logs.push(p.log);
    }
  }
  return out;
}

const msgs = [{ role: 'user', content: 'hola' }];

// ── Gemini ────────────────────────────────────────────────────
test('gemini: transmite el texto completo (regresion: abort prematuro)', async () => {
  const r = await chat('gemini', { messages: msgs, apiKey: 'good', model: 'gemini-ok' });
  assert.equal(r.text, 'Hola mundo!');      // junta todas las parts
  assert.deepEqual(r.errors, []);
  assert.ok(r.done);
  assert.ok(r.logs.some(l => /HTTP 200/.test(l)), 'debe registrar la respuesta HTTP del proveedor');
});

test('gemini: key invalida devuelve error legible', async () => {
  const r = await chat('gemini', { messages: msgs, apiKey: 'bad', model: 'gemini-ok' });
  assert.match(r.errors[0], /API key not valid/);
});

test('gemini: modelo inexistente devuelve error del proveedor', async () => {
  const r = await chat('gemini', { messages: msgs, apiKey: 'good', model: 'err' });
  assert.match(r.errors[0], /model not found/);
});

test('gemini: respuesta vacia se reporta (no silencio)', async () => {
  const r = await chat('gemini', { messages: msgs, apiKey: 'good', model: 'empty' });
  assert.equal(r.text, '');
  assert.match(r.errors[0], /vac.a.*SAFETY/);
});

test('gemini: envia system, temperatura e historial correctamente', async () => {
  const r = await chat('gemini', {
    messages: [{ role: 'user', content: 'a' }, { role: 'assistant', content: 'b' }, { role: 'user', content: 'c' }],
    apiKey: 'good', model: 'echo', system: 'SYS', temperature: 0.2,
  });
  assert.deepEqual(JSON.parse(r.text), { sys: 'SYS', temp: 0.2, n: 3, role: 'user' });
});

test('gemini: sin API key responde 400', async () => {
  const r = await chat('gemini', { messages: msgs });
  assert.equal(r.status, 400);
});

test('gemini: si el cliente cancela, se corta la peticion al proveedor', async () => {
  upstreamAborted = false;
  const ctl = new AbortController();
  const p = chat('gemini', { messages: msgs, apiKey: 'good', model: 'slow' }, { signal: ctl.signal }).catch(() => {});
  await new Promise(r => setTimeout(r, 300));
  ctl.abort();
  await p;
  await new Promise(r => setTimeout(r, 300));
  assert.ok(upstreamAborted, 'el upstream debio ver la conexion cerrada');
});

// ── Claude ────────────────────────────────────────────────────
test('claude: transmite el texto completo', async () => {
  const r = await chat('claude', { messages: msgs, apiKey: 'good', model: 'claude-ok' });
  assert.equal(r.text, 'Hola Claude');
  assert.deepEqual(r.errors, []);
  assert.ok(r.logs.some(l => /end_turn/.test(l)));
});

test('claude: key invalida devuelve error legible', async () => {
  const r = await chat('claude', { messages: msgs, apiKey: 'bad', model: 'claude-ok' });
  assert.match(r.errors[0], /invalid x-api-key/);
});

test('claude: respuesta vacia se reporta', async () => {
  const r = await chat('claude', { messages: msgs, apiKey: 'good', model: 'empty' });
  assert.match(r.errors[0], /vac.a.*refusal/);
});

test('claude: envia system y temperatura solo si se piden', async () => {
  const a = await chat('claude', { messages: msgs, apiKey: 'good', model: 'echo', system: 'SYS', temperature: 0.5 });
  assert.deepEqual(JSON.parse(a.text), { system: 'SYS', temperature: 0.5, max: 8192 });
  const b = await chat('claude', { messages: msgs, apiKey: 'good', model: 'echo' });
  assert.deepEqual(JSON.parse(b.text), { max: 8192 });
});

// ── /api/check ────────────────────────────────────────────────
const check = async (provider, apiKey) => (await fetch(`${base}/api/check`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ provider, apiKey }),
})).json();

test('check: gemini valida lista solo modelos con generateContent', async () => {
  const r = await check('gemini', 'good');
  assert.equal(r.ok, true);
  assert.deepEqual(r.models, ['gemini-ok']);
});

test('check: gemini invalida', async () => {
  const r = await check('gemini', 'bad');
  assert.equal(r.ok, false);
  assert.equal(r.status, 400);
});

test('check: claude valida / invalida', async () => {
  assert.deepEqual((await check('claude', 'good')).models, ['claude-ok']);
  assert.equal((await check('claude', 'bad')).ok, false);
});

test('check: sin key', async () => {
  assert.equal((await check('gemini', '')).ok, false);
});

// ── Proveedores compatibles con OpenAI ────────────────────────
for (const id of ['openai', 'deepseek', 'grok', 'qwen', 'mistral', 'groq', 'openrouter']) {
  test(`${id}: transmite el texto completo`, async () => {
    const r = await chat(id, { messages: msgs, apiKey: 'good', model: 'm' });
    assert.equal(r.text, `Hola desde ${id} mundo`);
    assert.deepEqual(r.errors, []);
    assert.ok(r.done);
  });
}

test('openai: key invalida devuelve error legible', async () => {
  const r = await chat('openai', { messages: msgs, apiKey: 'bad', model: 'm' });
  assert.match(r.errors[0], /Incorrect API key/);
});

test('openai: modelo inexistente', async () => {
  const r = await chat('openai', { messages: msgs, apiKey: 'good', model: 'err' });
  assert.match(r.errors[0], /does not exist/);
});

test('openai: respuesta vacia se reporta con finish_reason', async () => {
  const r = await chat('openai', { messages: msgs, apiKey: 'good', model: 'empty' });
  assert.match(r.errors[0], /vac.a.*content_filter/);
});

test('openai: el system va como primer mensaje y la temperatura solo si se pide', async () => {
  const a = await chat('openai', { messages: msgs, apiKey: 'good', model: 'echo', system: 'SYS', temperature: 0.3 });
  const pa = JSON.parse(a.text);
  assert.deepEqual(pa.first, { role: 'system', content: 'SYS' });
  assert.equal(pa.n, 2); assert.equal(pa.temp, 0.3); assert.equal(pa.auth, 'Bearer good');
  const b = await chat('openai', { messages: msgs, apiKey: 'good', model: 'echo' });
  const pb = JSON.parse(b.text);
  assert.deepEqual(pb.first, { role: 'user', content: 'hola' });
  assert.equal(pb.temp, undefined);
});

test('deepseek: avisa en el log cuando el modelo razona', async () => {
  const r = await chat('deepseek', { messages: msgs, apiKey: 'good', model: 'think' });
  assert.ok(r.logs.some(l => /razonando/.test(l)));
  assert.equal(r.text, 'Hola desde deepseek mundo');
});

test('openrouter: envia X-Title', async () => {
  const r = await chat('openrouter', { messages: msgs, apiKey: 'good', model: 'echo' });
  assert.equal(JSON.parse(r.text).referer, 'Sunstar');
});

test('ollama: funciona sin API key', async () => {
  const r = await chat('ollama', { messages: msgs, model: 'm' });
  assert.equal(r.text, 'Hola desde ollama mundo');
  const echo = await chat('ollama', { messages: msgs, model: 'echo' });
  assert.equal(JSON.parse(echo.text).auth, null);
});

test('proveedor desconocido responde 404', async () => {
  const r = await chat('nope', { messages: msgs, apiKey: 'x', model: 'm' });
  assert.equal(r.status, 404);
});

test('check: openai-compatible ordena por fecha y rechaza key invalida', async () => {
  assert.deepEqual((await check('openai', 'good')).models, ['new-model', 'old-model']);
  const bad = await check('deepseek', 'bad');
  assert.equal(bad.ok, false); assert.equal(bad.status, 401); assert.match(bad.message, /Incorrect API key/);
});

test('check: ollama no necesita key', async () => {
  assert.equal((await check('ollama', '')).ok, true);
});

// ── Prueba REAL (solo si hay variables de entorno) ────────────
test('LIVE gemini: la key real responde', { skip: process.env.GEMINI_API_KEY ? false : 'define GEMINI_API_KEY' }, async () => {
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const t0 = Date.now();
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY },
    body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: 'Responde solo: ok' }] }] }),
  });
  const txt = await r.text();
  console.log(`  [live gemini ${model}] HTTP ${r.status} en ${Date.now() - t0}ms\n  ${txt.slice(0, 400).replace(/\n/g, '\n  ')}`);
  assert.equal(r.status, 200, txt.slice(0, 300));
  assert.match(txt, /"text"/, 'la respuesta no contiene texto');
});

test('LIVE claude: la key real responde', { skip: process.env.ANTHROPIC_API_KEY ? false : 'define ANTHROPIC_API_KEY' }, async () => {
  const model = process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001';
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model, max_tokens: 20, messages: [{ role: 'user', content: 'Responde solo: ok' }] }),
  });
  const j = await r.json();
  assert.equal(r.status, 200, JSON.stringify(j).slice(0, 300));
});
