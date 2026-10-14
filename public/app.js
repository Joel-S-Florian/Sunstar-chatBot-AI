/**
 * Sunstar · ChatBot AI — app.js
 * Chats persistentes · selector de modelo · configuración · multi-proveedor
 * Streaming SSE · Markdown · LaTeX · Código · Comandos "/" · Consola de logs
 * Las funciones extra (diagramas, cuestionarios, pizarra) se enganchan por `Ext` (registry.js).
 */

/* ═══ Iconos (trazo, sin emojis) ═══════════════════════════════ */

const ICON_PATHS = {
  'plus':          '<path d="M12 5v14M5 12h14"/>',
  'search':        '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  'settings':      '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
  'trash':         '<path d="M3 6h18"/><path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/>',
  'terminal':      '<polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/>',
  'arrow-up':      '<path d="M12 19V5M5 12l7-7 7 7"/>',
  'stop':          '<rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor"/>',
  'copy':          '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
  'check':         '<path d="M20 6 9 17l-5-5"/>',
  'refresh':       '<path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/>',
  'chevron-down':  '<path d="m6 9 6 6 6-6"/>',
  'chevron-left':  '<path d="m15 18-6-6 6-6"/>',
  'chevron-right': '<path d="m9 18 6-6-6-6"/>',
  'user':          '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  'sun':           '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  'moon':          '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
  'monitor':       '<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>',
  'info':          '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
  'lightbulb':     '<path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.3h6c0-1 .4-1.8 1-2.3A7 7 0 0 0 12 2z"/>',
  'alert':         '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
  'octagon-x':     '<path d="M7.9 2h8.2L22 7.9v8.2L16.1 22H7.9L2 16.1V7.9z"/><path d="m15 9-6 6M9 9l6 6"/>',
  'check-circle':  '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
  'file-text':     '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8"/>',
  'key':           '<circle cx="7.5" cy="15.5" r="4.5"/><path d="m10.7 12.3 9.8-9.8M17 6l3 3M14 9l2 2"/>',
  'shield':        '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
  'sliders':       '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
  'database':      '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.7 4 3 9 3s9-1.3 9-3V5"/><path d="M3 12c0 1.7 4 3 9 3s9-1.3 9-3"/>',
  'palette':       '<path d="M12 22a10 10 0 1 1 10-10c0 3-2 4-4 4h-2a2 2 0 0 0-1 3.7c.5.8.2 2.3-3 2.3z"/><circle cx="7.5" cy="11" r="1" fill="currentColor"/><circle cx="12" cy="7" r="1" fill="currentColor"/><circle cx="16.5" cy="11" r="1" fill="currentColor"/>',
  'x':             '<path d="M18 6 6 18M6 6l12 12"/>',
  'pencil':        '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  'menu':          '<path d="M3 6h18M3 12h18M3 18h18"/>',
  'eye':           '<path d="M2 12s4-8 10-8 10 8 10 8-4 8-10 8-10-8-10-8z"/><circle cx="12" cy="12" r="3"/>',
  'eye-off':       '<path d="M17.9 17.9A10.1 10.1 0 0 1 12 20c-6 0-10-8-10-8a18 18 0 0 1 5.1-5.9M9.9 4.2A9.1 9.1 0 0 1 12 4c6 0 10 8 10 8a18 18 0 0 1-2.2 3.2M1 1l22 22"/>',
  'download':      '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
  'lock':          '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  'message':       '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
  'layout':        '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/>',
  'maximize':      '<path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3"/>',
  'minimize':      '<path d="M8 3v3a2 2 0 0 1-2 2H3M21 8h-3a2 2 0 0 1-2-2V3M3 16h3a2 2 0 0 1 2 2v3M16 21v-3a2 2 0 0 1 2-2h3"/>',
  'zoom-in':       '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5M11 8v6M8 11h6"/>',
  'zoom-out':      '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5M8 11h6"/>',
  'code':          '<polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>',
  'list-checks':   '<path d="m3 17 2 2 4-4M3 7l2 2 4-4M13 6h8M13 12h8M13 18h8"/>',
  'workflow':      '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><path d="M6.5 10v3a2 2 0 0 0 2 2H14"/>',
  'rotate-ccw':    '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>',
  'fit':           '<path d="M3 9V5a2 2 0 0 1 2-2h4M15 3h4a2 2 0 0 1 2 2v4M21 15v4a2 2 0 0 1-2 2h-4M9 21H5a2 2 0 0 1-2-2v-4"/><rect x="8" y="8" width="8" height="8" rx="1"/>',
};

function ico(name, size = 16) {
  return `<svg class="ico" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON_PATHS[name] || ''}</svg>`;
}

/** Rellena los <i data-ico="..."> del HTML estático */
function hydrateIcons(root = document) {
  root.querySelectorAll('i[data-ico]').forEach(el => {
    el.innerHTML = ico(el.dataset.ico, +el.dataset.size || 16);
    el.classList.add('ico-wrap');
  });
}

/* ═══ Estado ═══════════════════════════════════════════════════ */

const APP_NAME = 'Sunstar';
const pname = (p) => PROVIDERS[p]?.name || p;

function readJson(key, fallback) {
  try { return { ...fallback, ...JSON.parse(localStorage.getItem(key) || '{}') }; } catch (_) { return fallback; }
}
function writeJson(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) {} }

const liveModels = readJson('models_cache', {});   // modelos reales devueltos por cada API
const settings   = readJson('settings', { colors: true, role: '', system: '', temperature: null });
const sel        = readJson('sel', { provider: 'claude', model: '' });

const keyState = Object.fromEntries(PROVIDER_IDS.map(p => [p, 'none']));   // none | unverified | checking | ok | bad
const checkSeq = Object.fromEntries(PROVIDER_IDS.map(p => [p, 0]));

let provider  = PROVIDERS[sel.provider] ? sel.provider : 'claude';
let model     = sel.model || '';
let chats     = ChatStore.load();
let chat      = null;           // chat actual (objeto de `chats` cuando ya está guardado)
let streaming = false;
let abortCtl  = null;

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

/** Key efectiva: Ollama no necesita ninguna */
const keyOf = (p) => Vault.get(p) || (PROVIDERS[p]?.noKey ? 'local' : '');

function getModels(p) {
  const base = liveModels[p] && liveModels[p].length ? liveModels[p] : FALLBACK_MODELS[p];
  const clean = base.filter(m => !HIDE_MODEL_RE.test(m));
  return clean.length ? clean : base;
}

function defaultModel(p) {
  const list = getModels(p);
  const prefs = { gemini: /^gemini-2\.5-flash$/, claude: /sonnet/, openai: /^gpt-4o$/, deepseek: /^deepseek-chat$/ };
  return (prefs[p] && list.find(m => prefs[p].test(m))) || list[0];
}

/* ═══ Utilidades ═══════════════════════════════════════════════ */

function escHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const timeOf = (t) => new Date(t || Date.now()).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });

/* ═══ Prompts de sistema ═══════════════════════════════════════ */

const COLOR_PROMPT = `Puedes usar estas extensiones de formato en tus respuestas (úsalas con moderación, solo cuando aporten claridad). Nunca uses emojis.
- Cajas destacadas: una línea ":::tipo Título opcional", el contenido, y una línea ":::" para cerrar. Tipos: info, tip, success, warning, danger, note.
- Texto en color: {color:rojo}texto{/color}. Colores: rojo, verde, azul, amarillo, naranja, morado, rosa, cyan, gris.
- Resaltado: ==texto==.
Además de Markdown estándar, tablas, listas de tareas "- [ ]" y LaTeX ($...$ y $$...$$).
Para diagramas usa bloques \`\`\`mermaid (flowchart, sequenceDiagram, classDiagram, erDiagram, gantt, mindmap, etc.); la interfaz los dibuja.`;

function identityPrompt(prov, mdl) {
  return `Te llamas Sunstar y eres el asistente de la aplicación ChatBot AI. Si te preguntan quién eres o cómo te llamas, preséntate como Sunstar. Si preguntan qué modelo te impulsa, responde con honestidad que Sunstar está usando ahora ${pname(prov)} (${mdl}). Responde en el idioma del usuario; por defecto, en español.`;
}

function buildSystem(prov = provider, mdl = model) {
  const parts = [identityPrompt(prov, mdl)];
  if (settings.colors) parts.push(COLOR_PROMPT);
  if (settings.role && ROLES[settings.role]) parts.push(ROLES[settings.role]);
  if (settings.system) parts.push(settings.system);
  for (const f of Ext.systemParts) { try { const t = f(); if (t) parts.push(t); } catch (_) {} }
  return parts.join('\n\n');
}

/* ═══ Markdown + extensiones ═══════════════════════════════════ */

let currentCodeStore = {};
let currentRender = { partial: false, counts: {} };

const renderer = new marked.Renderer();

renderer.code = function (rawCode, infoStr) {
  const lang = (infoStr || '').split(/\s+/)[0].toLowerCase() || 'text';
  const key  = `c${Object.keys(currentCodeStore).length}`;
  currentCodeStore[key] = rawCode;

  // Extensiones: diagramas, cuestionarios, pizarra...
  const ctx = {
    partial: currentRender.partial,
    index: (type) => (currentRender.counts[type] = (currentRender.counts[type] ?? -1) + 1),
  };
  for (const h of Ext.codeHandlers) {
    const out = h.render(lang, rawCode, key, ctx);
    if (out != null) return out;
  }

  let highlighted = escHtml(rawCode);
  try {
    highlighted = lang !== 'text' && hljs.getLanguage(lang)
      ? hljs.highlight(rawCode, { language: lang, ignoreIllegals: true }).value
      : hljs.highlightAuto(rawCode).value;
  } catch (_) {}

  return `<div class="code-block">
  <div class="code-head">
    <span class="code-lang">${lang !== 'text' ? escHtml(lang) : 'texto'}</span>
    <button class="copy-btn" data-code="${key}">${ico('copy', 13)}<span>Copiar</span></button>
  </div>
  <pre><code class="hljs ${lang !== 'text' ? 'language-' + escHtml(lang) : ''}">${highlighted}</code></pre>
</div>`;
};

// Las tablas anchas se desplazan dentro de su propio contenedor
renderer.table = (header, body) =>
  `<div class="table-wrap"><table><thead>${header}</thead><tbody>${body}</tbody></table></div>`;

marked.setOptions({ renderer, breaks: true, gfm: true });

const COLOR_NAMES = {
  rojo: 'red', red: 'red', verde: 'green', green: 'green', azul: 'blue', blue: 'blue',
  amarillo: 'yellow', yellow: 'yellow', naranja: 'orange', orange: 'orange',
  morado: 'purple', purple: 'purple', rosa: 'pink', pink: 'pink',
  cyan: 'cyan', cian: 'cyan', gris: 'gray', gray: 'gray',
};

const CALLOUTS = {
  info:    { icon: 'info',         title: 'Información' },
  tip:     { icon: 'lightbulb',    title: 'Consejo' },
  success: { icon: 'check-circle', title: 'Correcto' },
  warning: { icon: 'alert',        title: 'Atención' },
  danger:  { icon: 'octagon-x',    title: 'Peligro' },
  note:    { icon: 'file-text',    title: 'Nota' },
};

/** Texto en color {color:x}...{/color} y resaltado ==...== */
function inlineExt(text) {
  return text
    .replace(/\{color:([a-záéíóú]+)\}([\s\S]*?)\{\/color\}/gi, (m, name, body) => {
      const c = COLOR_NAMES[name.toLowerCase()];
      return c ? `<span class="c-${c}">${body}</span>` : body;
    })
    .replace(/==([^=\n]+?)==/g, '<mark>$1</mark>');
}

/**
 * Convierte el texto del modelo en HTML seguro.
 * @param {string}  text
 * @param {object}  codeStore  guarda el código de cada bloque (para "Copiar" y las extensiones)
 * @param {boolean} partial    true durante el streaming: cierra cajas ":::" abiertas
 */
function renderContent(text, codeStore = {}, partial = false) {
  currentCodeStore = codeStore;
  currentRender = { partial, counts: {} };

  const stash = [];
  const latex = [];
  const boxes = [];
  const restoreCode = (s) => s.replace(/\x01(\d+)\x01/g, (_, i) => stash[+i]);

  // 1) proteger código (bloques e inline) de las demás transformaciones
  let out = text
    .replace(/(^|\n)(```|~~~)[\s\S]*?(?:\n\2[^\n]*(?=\n|$)|$)/g, (m) => { stash.push(m); return `\n\x01${stash.length - 1}\x01`; })
    .replace(/`[^`\n]+`/g, (m) => { stash.push(m); return `\x01${stash.length - 1}\x01`; });

  // 2) LaTeX
  out = out.replace(/\$\$([\s\S]*?)\$\$/g, (_, f) => {
    const i = latex.length;
    try { latex.push(`<div class="katex-display">${katex.renderToString(restoreCode(f).trim(), { displayMode: true, throwOnError: false })}</div>`); }
    catch { latex.push(`<span class="latex-err">$$${escHtml(f)}$$</span>`); }
    return `\x00L${i}\x00`;
  });
  out = out.replace(/(?<!\$)\$(?!\$)([^$\n]{1,300}?)(?<!\$)\$(?!\$)/g, (_, f) => {
    const i = latex.length;
    try { latex.push(katex.renderToString(restoreCode(f).trim(), { displayMode: false, throwOnError: false })); }
    catch { latex.push(`<span class="latex-err">$${escHtml(f)}$</span>`); }
    return `\x00L${i}\x00`;
  });

  // 3) cajas :::tipo Título ... :::
  if (partial) {
    const opens  = (out.match(/^:::[a-z]+/gm) || []).length;
    const closes = (out.match(/^:::[ \t]*$/gm) || []).length;
    if (opens > closes) out += '\n:::';
  }
  out = out.replace(/^:::(info|tip|success|warning|danger|note)[ \t]*([^\n]*)\n([\s\S]*?)\n?^:::[ \t]*$/gm, (_, type, title, body) => {
    const c = CALLOUTS[type];
    const inner = marked.parse(restoreCode(inlineExt(body.trim())));
    boxes.push(`<div class="callout callout-${type}"><div class="callout-title">${ico(c.icon, 15)}<span>${escHtml(title.trim() || c.title)}</span></div><div class="callout-body">${inner}</div></div>`);
    return `\n\n\x02${boxes.length - 1}\x02\n\n`;
  });

  // 4) color y resaltado inline (dentro de las cajas se aplica al construirlas)
  out = inlineExt(out);

  // 5) Markdown
  let html = marked.parse(restoreCode(out));
  html = html.replace(/<p>\s*\x02(\d+)\x02\s*<\/p>/g, (_, i) => boxes[+i])
             .replace(/\x02(\d+)\x02/g, (_, i) => boxes[+i] ?? '')
             .replace(/\x00L(\d+)\x00/g, (_, i) => latex[+i] ?? '');

  // 6) sanear (la salida del modelo no es de confianza)
  return DOMPurify.sanitize(html, { ADD_ATTR: ['data-code', 'data-key', 'data-view', 'data-idx'] });
}

/* ═══ Referencias al DOM ═══════════════════════════════════════ */

const $ = (id) => document.getElementById(id);

const messagesEl  = $('messages');
const userInputEl = $('userInput');
const sendBtnEl   = $('sendBtn');
const stopBtnEl   = $('stopBtn');
const chatTitleEl = $('chatTitle');
const statusDotEl = $('statusDot');
const statusTxtEl = $('statusTxt');
const cmdMenuEl   = $('cmdMenu');
const chatListEl  = $('chatList');
const sidebarEl   = $('sidebar');
const overlayEl   = $('overlay');

/* ═══ Mensajes (DOM) ═══════════════════════════════════════════ */

const LOGO_IMGS = `<img class="logo-for-light" src="logo-light.svg" alt="" /><img class="logo-for-dark" src="logo-dark.svg" alt="" />`;

// Seguimos el final mientras el usuario no suba; el contenido que crece no dispara "scroll"
let stickBottom = true;
messagesEl.addEventListener('scroll', () => {
  stickBottom = messagesEl.scrollHeight - messagesEl.scrollTop - messagesEl.clientHeight < 80;
});

function scrollBot(force = false) {
  if (force) stickBottom = true;
  if (stickBottom) messagesEl.scrollTop = messagesEl.scrollHeight;
}

function addUserMsg(text, t) {
  const el = document.createElement('div');
  el.className = 'msg msg-user';
  el.innerHTML = `<div class="bubble">${escHtml(text)}</div><span class="msg-time">${timeOf(t)}</span>`;
  messagesEl.appendChild(el);
  scrollBot(true);
}

function createAssistantEl(prov, mdl, t) {
  const el = document.createElement('div');
  el.className = 'msg msg-assistant';
  el.dataset.provider = prov;
  el._code = {};
  el.innerHTML = `
    <div class="msg-avatar">${LOGO_IMGS}</div>
    <div class="msg-main">
      <div class="msg-meta"><b>${APP_NAME}</b><span>${escHtml(pname(prov))} · ${escHtml(mdl || '')}</span><span>${timeOf(t)}</span></div>
      <div class="msg-content"></div>
      <div class="msg-actions">
        <button class="act-btn" data-act="copy">${ico('copy', 13)}<span>Copiar</span></button>
        <button class="act-btn regen" data-act="regen">${ico('refresh', 13)}<span>Regenerar</span></button>
      </div>
    </div>`;
  return el;
}

function addAssistantStreaming(prov, mdl) {
  const el = createAssistantEl(prov, mdl);
  el.classList.add('is-streaming');
  messagesEl.appendChild(el);
  scrollBot(true);
  return el;
}

let renderQueued = false;
function updateStream(el, text) {
  if (renderQueued) return;
  renderQueued = true;
  requestAnimationFrame(() => {
    renderQueued = false;
    if (!el.classList.contains('is-streaming')) return;   // ya finalizó
    const c = el.querySelector('.msg-content');
    if (!c) return;
    el._code = {};
    c.innerHTML = renderContent(text, el._code, true) + '<span class="cursor"></span>';
    scrollBot();
  });
}

/** Renderiza el mensaje terminado y ejecuta los hidratadores de las extensiones. */
function finalizeMsg(el, fullText, msg, chatObj) {
  el.classList.remove('is-streaming');
  const c = el.querySelector('.msg-content');
  el._code = {};
  el._raw  = fullText;
  el._msg  = msg;
  if (c) c.innerHTML = renderContent(fullText, el._code);
  for (const h of Ext.hydrators) {
    try { h(el, msg, chatObj || chat); } catch (e) { clog(`Error en una extensión: ${e.message}`, 'error'); }
  }
}

function addErrorMsg(text) {
  const el = document.createElement('div');
  el.className = 'msg msg-notice msg-error';
  el.innerHTML = `<div class="notice-ico">${ico('octagon-x', 16)}</div><div class="notice-body"><b>Error</b><div class="msg-content"></div></div>`;
  el.querySelector('.msg-content').textContent = text;
  messagesEl.appendChild(el);
  scrollBot(true);
}

/** Mensaje local (respuesta de comandos). No entra al historial. */
function say(markdown) {
  const w = $('welcome');
  if (w) w.remove();
  const el = document.createElement('div');
  el.className = 'msg msg-notice';
  el._code = {};
  el.innerHTML = `<div class="notice-ico">${ico('terminal', 16)}</div><div class="notice-body"><b>Sistema</b><div class="msg-content">${renderContent(markdown, el._code)}</div></div>`;
  messagesEl.appendChild(el);
  scrollBot(true);
}

/* Delegación: extensiones, copiar código, copiar mensaje, regenerar */
function flash(btn, html) {
  const prev = btn.innerHTML;
  btn.innerHTML = `${ico('check', 13)}<span>Copiado</span>`;
  btn.classList.add('ok');
  setTimeout(() => { btn.innerHTML = html ?? prev; btn.classList.remove('ok'); }, 1800);
}

messagesEl.addEventListener('click', (e) => {
  const msgEl = e.target.closest('.msg');
  for (const h of Ext.clickHandlers) { if (h(e, msgEl)) return; }

  const copyBtn = e.target.closest('.copy-btn');
  if (copyBtn) {
    const txt = msgEl?._code?.[copyBtn.dataset.code] ?? '';
    const prev = copyBtn.innerHTML;
    navigator.clipboard.writeText(txt).then(() => flash(copyBtn, prev));
    return;
  }
  const act = e.target.closest('.act-btn');
  if (act) {
    if (act.dataset.act === 'copy') {
      const prev = act.innerHTML;
      navigator.clipboard.writeText(msgEl?._raw ?? '').then(() => flash(act, prev));
    } else if (act.dataset.act === 'regen') regenerate();
    return;
  }
  const sug = e.target.closest('.suggest');
  if (sug) { if (!send(sug.dataset.q)) userInputEl.value = sug.dataset.q; }
});

/* ═══ Bienvenida ═══════════════════════════════════════════════ */

const SUGGESTIONS = [
  'Explica qué es una API REST y dibuja el flujo con un diagrama',
  'Hazme unas preguntas para definir una app que necesito',
  'En la pizarra, crea una calculadora de propinas',
  'Compara SQL y NoSQL en una tabla',
];

function showWelcome() {
  const w = document.createElement('div');
  w.id = 'welcome';
  w.className = 'welcome';
  w.innerHTML = `
    <div class="welcome-logo">${LOGO_IMGS}</div>
    <h1>Soy ${APP_NAME}. ¿En qué te ayudo?</h1>
    <p>Elige el modelo junto al campo de texto. Escribe <kbd>/</kbd> para ver los comandos.</p>
    <div class="suggestions">
      ${SUGGESTIONS.map(s => `<button class="suggest" data-q="${escHtml(s)}">${ico('message', 14)}<span>${escHtml(s)}</span></button>`).join('')}
    </div>`;
  messagesEl.appendChild(w);
}

/* ═══ Estado visible ═══════════════════════════════════════════ */

function setStatus(txt, state = '') {
  statusTxtEl.textContent = txt;
  statusDotEl.className = `status-dot ${state}`;
}

/* ═══ Consola de logs ══════════════════════════════════════════ */

const consoleEl   = $('console');
const consoleBody = $('consoleBody');
const logs = [];
let logFilter = 'all';
let stick = true;

const LEVEL_TAG = { info: 'INFO', req: 'REQ', ok: 'OK', warn: 'WARN', error: 'ERR' };

function passesFilter(l) {
  return logFilter === 'all' || (logFilter === 'warn' && (l.level === 'warn' || l.level === 'error')) || (logFilter === 'error' && l.level === 'error');
}

function logRow(l) {
  const d  = new Date(l.t);
  const ts = d.toLocaleTimeString('es', { hour12: false }) + '.' + String(d.getMilliseconds()).padStart(3, '0');
  const row = document.createElement('div');
  row.className = `log log-${l.level}`;
  row.innerHTML = `<span class="log-ts">${ts}</span><span class="log-tag">${LEVEL_TAG[l.level]}</span><span class="log-msg"></span>`;
  row.querySelector('.log-msg').textContent = l.msg;
  return row;
}

function clog(msg, level = 'info') {
  const l = { t: Date.now(), level, msg };
  logs.push(l);
  if (logs.length > 500) logs.shift();
  if (passesFilter(l)) {
    consoleBody.appendChild(logRow(l));
    while (consoleBody.childElementCount > 500) consoleBody.firstChild.remove();
    if (stick) consoleBody.scrollTop = consoleBody.scrollHeight;
  }
}

function renderLogs() {
  consoleBody.innerHTML = '';
  logs.filter(passesFilter).forEach(l => consoleBody.appendChild(logRow(l)));
  consoleBody.scrollTop = consoleBody.scrollHeight;
}

function toggleConsole(open = consoleEl.hidden) {
  consoleEl.hidden = !open;
  $('consoleBtn').classList.toggle('on', open);
  try { localStorage.setItem('console_open', open ? '1' : ''); } catch (_) {}
  if (open) consoleBody.scrollTop = consoleBody.scrollHeight;
}

function setLive(state, text) {
  $('liveBadge').className = `live ${state}`;
  $('liveTxt').textContent = text;
}

consoleBody.addEventListener('scroll', () => {
  stick = consoleBody.scrollHeight - consoleBody.scrollTop - consoleBody.clientHeight < 24;
});
$('consoleBtn').addEventListener('click', () => toggleConsole());
$('consoleClose').addEventListener('click', () => toggleConsole(false));
$('consoleClear').addEventListener('click', () => { logs.length = 0; consoleBody.innerHTML = ''; });
$('consoleCheck').addEventListener('click', () => { toggleConsole(true); checkKey(); });
$('consoleCopy').addEventListener('click', () => {
  const txt = logs.filter(passesFilter).map(l => `${new Date(l.t).toISOString()} ${LEVEL_TAG[l.level]} ${l.msg}`).join('\n');
  const btn = $('consoleCopy');
  const prev = btn.innerHTML;
  navigator.clipboard.writeText(txt).then(() => { btn.innerHTML = ico('check', 14); setTimeout(() => { btn.innerHTML = prev; }, 1500); });
});
$('logFilter').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-f]');
  if (!b) return;
  logFilter = b.dataset.f;
  $('logFilter').querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
  renderLogs();
});

// Redimensionar arrastrando el borde superior
(() => {
  const handle = $('consoleResize');
  const saved = +localStorage.getItem('console_h');
  if (saved) consoleEl.style.height = saved + 'px';
  let startY = 0, startH = 0;
  handle.addEventListener('pointerdown', (e) => {
    startY = e.clientY; startH = consoleEl.offsetHeight;
    handle.setPointerCapture(e.pointerId);
    handle.classList.add('drag');
  });
  handle.addEventListener('pointermove', (e) => {
    if (!handle.hasPointerCapture(e.pointerId)) return;
    const h = Math.min(Math.max(startH + (startY - e.clientY), 110), window.innerHeight * 0.7);
    consoleEl.style.height = h + 'px';
  });
  handle.addEventListener('pointerup', (e) => {
    handle.releasePointerCapture(e.pointerId);
    handle.classList.remove('drag');
    try { localStorage.setItem('console_h', consoleEl.offsetHeight); } catch (_) {}
  });
})();

/* ═══ API keys: verificación ═══════════════════════════════════ */

const BADGE_TEXT = { none: 'Sin key', unverified: 'Sin verificar', checking: 'Verificando', ok: 'Válida', bad: 'Inválida' };

function refreshKeyState(p) {
  const has = !!Vault.get(p) || !!PROVIDERS[p].noKey;
  if (!has) keyState[p] = 'none';
  else if (keyState[p] === 'none') keyState[p] = 'unverified';
}

function renderBadges() {
  PROVIDER_IDS.forEach(p => {
    refreshKeyState(p);
    const b = document.querySelector(`[data-badge="${p}"]`);
    if (b) { b.textContent = PROVIDERS[p].noKey && keyState[p] === 'unverified' ? 'Local' : BADGE_TEXT[keyState[p]]; b.className = `badge ${keyState[p]}`; }
  });
  renderChip();
}

/** Valida la key contra el proveedor y carga la lista real de modelos. */
async function checkKey(p = provider, { quiet = false } = {}) {
  const apiKey = keyOf(p);
  if (!apiKey) {
    keyState[p] = 'none'; renderBadges();
    if (!quiet) { toggleConsole(true); clog(`No hay API key de ${pname(p)} para verificar.`, 'warn'); }
    return false;
  }

  const seq = ++checkSeq[p];
  keyState[p] = 'checking'; renderBadges();
  clog(`Verificando ${PROVIDERS[p].noKey ? 'conexión con' : 'API key de'} ${pname(p)}`, 'req');
  try {
    const r = await (await fetch('/api/check', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider: p, apiKey: Vault.get(p) }),
    })).json();
    if (seq !== checkSeq[p]) return r.ok;   // llegó tarde, manda la última verificación

    if (r.ok) {
      keyState[p] = 'ok';
      clog(`${pname(p)} verificado (${r.ms}ms) · ${r.models.length} modelos disponibles`, 'ok');
      if (r.models.length) {
        liveModels[p] = r.models;
        writeJson('models_cache', liveModels);
        if (p === provider && !getModels(p).includes(model)) {
          const old = model;
          setSelection(p, defaultModel(p));
          clog(`El modelo "${old}" no está disponible para esta key; se usa "${model}".`, 'warn');
        }
      }
    } else {
      keyState[p] = 'bad';
      clog(`${pname(p)} rechazado${r.status ? ' (HTTP ' + r.status + ')' : ''}: ${r.message}`, quiet ? 'warn' : 'error');
      if (!quiet) toggleConsole(true);
    }
    renderBadges();
    return r.ok;
  } catch (err) {
    keyState[p] = 'bad'; renderBadges();
    clog(`No se pudo contactar al servidor local: ${err.message}`, 'error');
    if (!quiet) toggleConsole(true);
    return false;
  }
}

/* ═══ Selector de modelo (compositor) ══════════════════════════ */

const modelBtn = $('modelBtn');
const modelPop = $('modelPop');
let popProv = provider;
let popQuery = '';

function setSelection(p, m) {
  provider = p;
  model = m || defaultModel(p);
  writeJson('sel', { provider, model });
  if (chat) { chat.provider = provider; chat.model = model; }
  renderChip();
}

function renderChip() {
  $('chipProv').textContent  = pname(provider);
  $('chipModel').textContent = model || '—';
  $('chipDot').className = `chip-dot ${keyState[provider]}`;
  updateSendBtn();
}

function renderPopProvs() {
  modelPop.querySelector('.pop-provs').innerHTML = PROVIDER_IDS.map(p =>
    `<button data-prov="${p}" class="${p === popProv ? 'on' : ''}" role="tab"><i class="kd ${keyState[p]}"></i><span>${escHtml(pname(p))}<small>${escHtml(PROVIDERS[p].vendor)}</small></span></button>`).join('');
}

function renderPopList() {
  const q = popQuery.toLowerCase();
  const list = getModels(popProv).filter(m => m.toLowerCase().includes(q));
  modelPop.querySelector('.pop-list').innerHTML = list.length
    ? list.map(m => `<button class="pop-item${popProv === provider && m === model ? ' on' : ''}" data-model="${escHtml(m)}" role="option"><span>${escHtml(m)}</span>${popProv === provider && m === model ? ico('check', 14) : ''}</button>`).join('')
    : '<div class="pop-empty">Sin resultados</div>';
  const foot = modelPop.querySelector('.pop-foot');
  const needsKey = !PROVIDERS[popProv].noKey && !Vault.get(popProv);
  foot.hidden = !needsKey && keyState[popProv] !== 'bad';
  foot.innerHTML = `${ico('key', 14)}<span>${needsKey ? `Agregar API key de ${escHtml(pname(popProv))}` : `Revisar la configuración de ${escHtml(pname(popProv))}`}</span>`;
}

function openPop() {
  popProv = provider; popQuery = '';
  modelPop.innerHTML = `
    <div class="pop-provs" role="tablist"></div>
    <div class="pop-models">
      <input class="pop-search" type="text" placeholder="Buscar modelo" autocomplete="off" spellcheck="false" />
      <div class="pop-list" role="listbox"></div>
      <button class="pop-foot" data-act="keys"></button>
    </div>`;
  renderPopProvs(); renderPopList();
  modelPop.hidden = false;
  modelBtn.classList.add('open');
  modelPop.querySelector('.pop-list .on')?.scrollIntoView({ block: 'center' });
}

function closePop() { modelPop.hidden = true; modelBtn.classList.remove('open'); }

modelBtn.addEventListener('click', (e) => { e.stopPropagation(); modelPop.hidden ? openPop() : closePop(); });
modelPop.addEventListener('click', (e) => {
  e.stopPropagation();
  const tab = e.target.closest('[data-prov]');
  if (tab) { popProv = tab.dataset.prov; popQuery = ''; modelPop.querySelector('.pop-search').value = ''; renderPopProvs(); renderPopList(); return; }
  const item = e.target.closest('[data-model]');
  if (item) { setSelection(popProv, item.dataset.model); closePop(); userInputEl.focus(); return; }
  if (e.target.closest('[data-act="keys"]')) { closePop(); openSettings('security'); }
});
modelPop.addEventListener('input', (e) => {
  if (e.target.classList.contains('pop-search')) { popQuery = e.target.value; renderPopList(); }
});
document.addEventListener('click', (e) => { if (!modelPop.hidden && !e.target.closest('.model-picker')) closePop(); });

/* ═══ Chats: lista lateral y persistencia ══════════════════════ */

let chatQuery = '';
const seenChats = new Set();

function groupLabel(ts) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const day = 86400000;
  if (ts >= today) return 'Hoy';
  if (ts >= today - day) return 'Ayer';
  if (ts >= today - 7 * day) return 'Últimos 7 días';
  return 'Anteriores';
}

function renderChatList() {
  const q = chatQuery.trim().toLowerCase();
  const items = chats
    .filter(c => !q || c.title.toLowerCase().includes(q) || c.messages.some(m => m.content.toLowerCase().includes(q)))
    .sort((a, b) => b.updated - a.updated);

  if (!items.length) {
    chatListEl.innerHTML = `<div class="chat-empty">${q ? 'Sin resultados' : 'Aún no hay chats.<br>Tus conversaciones aparecerán aquí.'}</div>`;
    return;
  }

  let html = '', last = '';
  for (const c of items) {
    const g = groupLabel(c.updated);
    if (g !== last) { html += `<div class="chat-group">${g}</div>`; last = g; }
    const fresh = !seenChats.has(c.id);
    seenChats.add(c.id);
    html += `<div class="chat-item${chat && c.id === chat.id ? ' active' : ''}${fresh ? ' enter' : ''}" data-id="${c.id}">
      <button class="chat-link" title="${escHtml(c.title)}"><span class="chat-name">${escHtml(c.title)}</span></button>
      <span class="chat-acts">
        <button data-act="rename" title="Renombrar">${ico('pencil', 13)}</button>
        <button data-act="delete" title="Eliminar">${ico('trash', 13)}</button>
      </span>
    </div>`;
  }
  chatListEl.innerHTML = html;
}

function saveChat(c) {
  if (!c.messages.length) return;
  c.updated = Date.now();
  if (!chats.includes(c)) chats.unshift(c);
  if (!ChatStore.save(chats)) clog('No se pudieron guardar los chats (almacenamiento lleno o bloqueado).', 'warn');
  try { localStorage.setItem('active_chat', c.id); } catch (_) {}
  renderChatList();
}

function blankChat() {
  const now = Date.now();
  return { id: uid(), title: 'Nueva conversación', created: now, updated: now, provider, model, messages: [], board: null };
}

function renderMessages() {
  messagesEl.innerHTML = '';
  if (!chat.messages.length) { showWelcome(); return; }
  for (const m of chat.messages) {
    if (m.role === 'user') addUserMsg(m.content, m.t);
    else {
      const el = createAssistantEl(m.provider || chat.provider || provider, m.model || chat.model, m.t);
      messagesEl.appendChild(el);
      finalizeMsg(el, m.content, m, chat);
    }
  }
  scrollBot(true);
}

function chatChanged() { for (const f of Ext.chatChanged) { try { f(chat); } catch (_) {} } }

function openChat(c) {
  if (streaming) abortCtl?.abort();
  chat = c;
  chatTitleEl.textContent = c.title;
  if (c.provider && PROVIDERS[c.provider]) setSelection(c.provider, getModels(c.provider).includes(c.model) ? c.model : defaultModel(c.provider));
  chatChanged();
  renderMessages();
  renderChatList();
  try { localStorage.setItem('active_chat', c.id); } catch (_) {}
  closeSidebar();
}

function newChat() {
  if (streaming) abortCtl?.abort();
  chat = blankChat();
  chatTitleEl.textContent = chat.title;
  chatChanged();
  renderMessages();
  renderChatList();
  closeSidebar();
  userInputEl.focus();
}

function deleteChat(id) {
  const i = chats.findIndex(c => c.id === id);
  if (i >= 0) { chats.splice(i, 1); ChatStore.save(chats); }
  if (chat && chat.id === id) newChat(); else renderChatList();
}

chatListEl.addEventListener('click', (e) => {
  const item = e.target.closest('.chat-item');
  if (!item) return;
  const c = chats.find(x => x.id === item.dataset.id);
  if (!c) return;
  const act = e.target.closest('[data-act]');

  if (!act) { if (!item.querySelector('input')) openChat(c); return; }

  if (act.dataset.act === 'delete') {
    if (act.dataset.confirm) return deleteChat(c.id);
    act.dataset.confirm = '1';
    act.classList.add('danger');
    act.innerHTML = `${ico('check', 13)}`;
    act.title = 'Confirmar';
    setTimeout(() => { if (act.isConnected) { delete act.dataset.confirm; act.classList.remove('danger'); act.innerHTML = ico('trash', 13); act.title = 'Eliminar'; } }, 2500);
    return;
  }

  if (act.dataset.act === 'rename') {
    const name = item.querySelector('.chat-name');
    const input = document.createElement('input');
    input.className = 'chat-rename';
    input.value = c.title;
    name.replaceWith(input);
    input.focus(); input.select();
    let done = false;
    const commit = (save) => {
      if (done) return; done = true;
      const v = input.value.trim();
      if (save && v) { c.title = v.slice(0, 80); ChatStore.save(chats); if (chat === c) chatTitleEl.textContent = c.title; }
      renderChatList();
    };
    input.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') commit(true); if (ev.key === 'Escape') commit(false); });
    input.addEventListener('blur', () => commit(true));
  }
});

$('chatSearch').addEventListener('input', (e) => { chatQuery = e.target.value; renderChatList(); });
$('newChatBtn').addEventListener('click', newChat);

/* ═══ Barra lateral móvil ══════════════════════════════════════ */

function openSidebar()  { sidebarEl.classList.add('open'); overlayEl.classList.add('show'); }
function closeSidebar() { sidebarEl.classList.remove('open'); overlayEl.classList.remove('show'); }
$('hamburger').addEventListener('click', openSidebar);
$('sbClose').addEventListener('click', closeSidebar);
overlayEl.addEventListener('click', closeSidebar);

/* ═══ Compositor: texto y comandos ═════════════════════════════ */

function updateSendBtn() {
  const txt = userInputEl.value.trim();
  sendBtnEl.disabled = !txt || streaming;
  sendBtnEl.hidden = streaming;
  stopBtnEl.hidden = !streaming;
}

let cmdMatches = [];
let cmdIndex   = 0;

function updateCmdMenu() {
  const v = userInputEl.value;
  cmdMatches = (!v.startsWith('/') || /\s/.test(v)) ? [] : COMMANDS.filter(c => c.name.startsWith(v.slice(1).toLowerCase()));
  cmdIndex = Math.min(cmdIndex, Math.max(cmdMatches.length - 1, 0));
  if (!cmdMatches.length) { cmdMenuEl.hidden = true; return; }
  cmdMenuEl.hidden = false;
  cmdMenuEl.innerHTML = cmdMatches.map((c, i) =>
    `<div class="cmd-item${i === cmdIndex ? ' active' : ''}" data-i="${i}">
       <span class="cmd-name">/${c.name}</span><span class="cmd-args">${escHtml(c.args)}</span>
       <span class="cmd-desc">${escHtml(c.desc)}</span>
     </div>`).join('');
  cmdMenuEl.querySelector('.active')?.scrollIntoView({ block: 'nearest' });
}

function pickCommand(i) {
  const c = cmdMatches[i];
  if (!c) return;
  userInputEl.value = `/${c.name}${c.args ? ' ' : ''}`;
  cmdMatches = []; cmdMenuEl.hidden = true;
  userInputEl.focus();
  updateSendBtn();
}

cmdMenuEl.addEventListener('mousedown', (e) => {
  const item = e.target.closest('.cmd-item');
  if (item) { e.preventDefault(); pickCommand(+item.dataset.i); }
});

userInputEl.addEventListener('input', () => {
  userInputEl.style.height = 'auto';
  userInputEl.style.height = Math.min(userInputEl.scrollHeight, 200) + 'px';
  updateSendBtn();
  updateCmdMenu();
});

userInputEl.addEventListener('keydown', (e) => {
  if (!cmdMenuEl.hidden && cmdMatches.length) {
    if (e.key === 'ArrowDown') { e.preventDefault(); cmdIndex = (cmdIndex + 1) % cmdMatches.length; return updateCmdMenu(); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); cmdIndex = (cmdIndex - 1 + cmdMatches.length) % cmdMatches.length; return updateCmdMenu(); }
    if (e.key === 'Tab')       { e.preventDefault(); return pickCommand(cmdIndex); }
    if (e.key === 'Escape')    { cmdMatches = []; cmdMenuEl.hidden = true; return; }
    if (e.key === 'Enter' && !e.shiftKey && userInputEl.value.slice(1).toLowerCase() !== cmdMatches[cmdIndex].name) {
      e.preventDefault(); return pickCommand(cmdIndex);
    }
  }
  if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); if (!sendBtnEl.disabled) sendBtnEl.click(); }
});

/* ═══ Enviar y completar ═══════════════════════════════════════ */

async function complete() {
  const target = chat;
  const prov   = provider;
  const mdl    = model;
  const apiKey = Vault.get(prov);

  streaming = true;
  abortCtl  = new AbortController();
  updateSendBtn();
  setStatus('Pensando', 'thinking');
  setLive('wait', 'Esperando respuesta');

  const botEl     = addAssistantStreaming(prov, mdl);
  const contentEl = botEl.querySelector('.msg-content');
  let   fullText  = '';

  const t0      = performance.now();
  let   tFirst  = null;
  const elapsed = () => ((performance.now() - t0) / 1000).toFixed(1);
  const sys     = buildSystem(prov, mdl);
  clog(`Enviando a ${pname(prov)} · ${mdl} · ${target.messages.length} mensajes · system ${sys.length} chars${settings.temperature != null ? ' · temp ' + settings.temperature : ''}`, 'req');

  contentEl.innerHTML = '<span class="thinking"><i></i><i></i><i></i></span><span class="think-timer">0.0s</span>';
  let lastWarn = 0;
  const timer = setInterval(() => {
    const e = elapsed();
    if (tFirst === null) {
      setStatus(`Pensando ${e}s`, 'thinking');
      setLive('wait', `Esperando ${e}s`);
      const tt = contentEl.querySelector('.think-timer');
      if (tt) tt.textContent = `${e}s`;
      if (+e - lastWarn >= 10) { lastWarn = Math.floor(+e / 10) * 10; clog(`Sin respuesta todavía (${e}s)`, 'warn'); }
    } else {
      setStatus(`Escribiendo ${e}s`, 'thinking');
      setLive('stream', `Recibiendo ${e}s · ${fullText.length} chars`);
    }
  }, 100);

  let failed = null;
  try {
    const res = await fetch(`/api/chat/${prov}`, {
      method:  'POST',
      signal:  abortCtl.signal,
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        messages: target.messages.map(({ role, content }) => ({ role, content })),
        apiKey, model: mdl,
        system: sys || undefined,
        temperature: settings.temperature ?? undefined,
      }),
    });

    clog(`Servidor local respondió HTTP ${res.status} (${elapsed()}s)`, res.ok ? 'info' : 'error');
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `HTTP ${res.status}: ${res.statusText}`);
    }

    const reader  = res.body.getReader();
    const decoder = new TextDecoder();
    let   buf     = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });

      let idx;
      while ((idx = buf.indexOf('\n')) !== -1) {
        const line = buf.slice(0, idx).replace(/\r$/, '');
        buf = buf.slice(idx + 1);
        if (!line.startsWith('data: ')) continue;
        const raw = line.slice(6).trim();
        if (raw === '[DONE]') continue;
        let p;
        try { p = JSON.parse(raw); } catch { continue; }
        if (p.log) { clog(`[servidor] ${p.log}`, p.level === 'ok' || p.level === 'warn' || p.level === 'error' ? p.level : 'info'); continue; }
        if (p.error) throw new Error(p.error);
        if (p.token) {
          if (tFirst === null) { tFirst = performance.now(); clog(`Primer token a los ${elapsed()}s`, 'ok'); }
          fullText += p.token;
          updateStream(botEl, fullText);
        }
      }
    }

    if (!fullText) throw new Error('El modelo no devolvió texto. Revisa la consola o prueba con otro modelo.');
    clog(`Respuesta completa: ${fullText.length} chars en ${elapsed()}s`, 'ok');
    setStatus('Listo');
    setLive('idle', 'Inactivo');

  } catch (err) {
    if (err.name === 'AbortError') {
      clog(`Detenido por el usuario a los ${elapsed()}s`, 'warn');
      setStatus('Detenido'); setLive('idle', 'Detenido');
      setTimeout(() => setStatus('Listo'), 2500);
    } else {
      failed = err;
      clog(`Falló a los ${elapsed()}s: ${err.message}`, 'error');
      toggleConsole(true);
      setStatus('Error', 'error'); setLive('error', 'Error');
      setTimeout(() => setStatus('Listo'), 4000);
    }
  } finally {
    clearInterval(timer);
    streaming = false;
    abortCtl  = null;
  }

  if (fullText && !failed) {
    // respuesta completa o parcial (detenida): se conserva
    const msg = { id: uid(), role: 'assistant', content: fullText, provider: prov, model: mdl, t: Date.now() };
    target.messages.push(msg);
    target.provider = prov; target.model = mdl;
    finalizeMsg(botEl, fullText, msg, target);
    saveChat(target);
  } else {
    // sin texto: se quita el globo y el mensaje del usuario para poder reintentar
    botEl.remove();
    const last = target.messages[target.messages.length - 1];
    if (last && last.role === 'user') {
      target.messages.pop();
      if (chat === target) {
        [...messagesEl.querySelectorAll('.msg-user')].pop()?.remove();
        if (!userInputEl.value) { userInputEl.value = last.content; userInputEl.dispatchEvent(new Event('input')); }
        if (!target.messages.length && !$('welcome')) showWelcome();
      }
      if (target.messages.length) saveChat(target);
      else { const i = chats.indexOf(target); if (i >= 0) { chats.splice(i, 1); ChatStore.save(chats); renderChatList(); } }
    }
    if (failed && chat === target) addErrorMsg(failed.message || 'Error al conectar con la API.');
  }

  updateSendBtn();
  scrollBot();
}

/** Devuelve true si el mensaje salió. */
function send(text) {
  if (streaming) return false;
  if (!keyOf(provider)) {
    say(`:::warning Falta la API key de ${pname(provider)}\nAgrégala en Configuración, sección Seguridad.\n:::`);
    openSettings('security');
    return false;
  }
  const w = $('welcome');
  if (w) w.remove();

  chat.messages.push({ id: uid(), role: 'user', content: text, t: Date.now() });
  if (chat.messages.length === 1) {
    chat.title = text.length > 50 ? text.slice(0, 50) + '…' : text;
    chatTitleEl.textContent = chat.title;
  }
  chat.provider = provider; chat.model = model;
  addUserMsg(text);
  complete();
  return true;
}

function regenerate() {
  if (streaming) return;
  if (chat.messages[chat.messages.length - 1]?.role !== 'assistant') return say('No hay una respuesta que regenerar.');
  const removed = chat.messages.pop();
  for (const f of Ext.removed) { try { f(chat, removed); } catch (_) {} }
  [...messagesEl.querySelectorAll('.msg-assistant')].pop()?.remove();
  complete();
}

sendBtnEl.addEventListener('click', () => {
  const text = userInputEl.value.trim();
  if (!text || streaming) return;

  userInputEl.value = '';
  userInputEl.style.height = 'auto';
  cmdMatches = []; cmdMenuEl.hidden = true;
  updateSendBtn();

  if (text.startsWith('/')) return void runCommand(text);
  if (!send(text)) { userInputEl.value = text; updateSendBtn(); }
});

stopBtnEl.addEventListener('click', () => abortCtl?.abort());

/* ═══ Exportar ═════════════════════════════════════════════════ */

function download(filename, content, mime) {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function exportChat(fmt) {
  if (!chat.messages.length) return say('No hay conversación para exportar.');
  const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
  const name  = `chat-${stamp}`;
  if (fmt === 'json') {
    const { id, title, provider: pv, model: md, messages, board } = chat;
    download(`${name}.json`, JSON.stringify({ app: APP_NAME, id, title, provider: pv, model: md, messages, board }, null, 2), 'application/json');
  } else if (fmt === 'md') {
    const md = chat.messages.map(m => `## ${m.role === 'user' ? 'Tú' : APP_NAME}\n\n${m.content}`).join('\n\n---\n\n');
    download(`${name}.md`, `# ${chat.title}\n\n${md}\n`, 'text/markdown');
  } else {
    const body = chat.messages.map(m => `<section class="${m.role}"><h3>${m.role === 'user' ? 'Tú' : APP_NAME}</h3>${renderContent(m.content)}</section>`).join('\n');
    download(`${name}.html`, `<!doctype html><meta charset="utf-8"><title>${escHtml(chat.title)}</title>
<style>body{font:15px/1.7 system-ui;max-width:760px;margin:2rem auto;padding:0 1rem}pre{background:#111;color:#eee;padding:1rem;overflow:auto;border-radius:8px}section.user{background:#f3f4f6;padding:.5rem 1rem;border-radius:8px}table{border-collapse:collapse}td,th{border:1px solid #ccc;padding:4px 8px}</style>
${body}`, 'text/html');
  }
  say(`:::success\nConversación exportada como **${fmt}**.\n:::`);
}

/* ═══ Configuración ════════════════════════════════════════════ */

const settingsModal = $('settingsModal');

function applySettings() {
  writeJson('settings', settings);
  syncSettingsUI();
}

function syncSettingsUI() {
  $('colorsToggle').checked = settings.colors;
  $('roleSelect').value     = settings.role || '';
  $('systemInput').value    = settings.system || '';
  const useDefault = settings.temperature == null;
  $('tempDefault').checked  = useDefault;
  $('tempRange').disabled   = useDefault;
  $('tempRange').value      = useDefault ? 0.7 : settings.temperature;
  $('tempVal').textContent  = useDefault ? 'por defecto' : settings.temperature;
  $('themeCards').querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.pref === Theme.pref));
  $('themeIco').innerHTML = ico(Theme.resolved === 'dark' ? 'sun' : 'moon', 16);
}

/** Tarjetas de API key (una por proveedor) */
function buildKeyCards() {
  $('keyCards').innerHTML = PROVIDER_IDS.map(p => {
    const m = PROVIDERS[p];
    return `<div class="key-card">
      <div class="key-top">
        <b>${escHtml(m.name)} <span class="vendor">· ${escHtml(m.vendor)}</span></b>
        <span class="badge" data-badge="${p}">Sin key</span>
      </div>
      <div class="key-row">
        ${m.noKey
          ? `<div class="key-note">${escHtml(m.hint)}</div>`
          : `<input type="password" class="field mono" data-key="${p}" placeholder="${escHtml(m.hint)}" autocomplete="off" spellcheck="false" />
             <button class="icon-btn bordered" data-eye="${p}" title="Mostrar u ocultar">${ico('eye', 16)}</button>`}
        <button class="btn" data-verify="${p}">Verificar</button>
      </div>
      ${m.noKey ? '' : `<a class="key-link" href="${m.url}" target="_blank" rel="noopener noreferrer">Obtener una key</a>`}
    </div>`;
  }).join('');
}

function syncSecurityUI() {
  PROVIDER_IDS.forEach(p => {
    const input = document.querySelector(`[data-key="${p}"]`);
    if (input && document.activeElement !== input) input.value = Vault.get(p);
  });
  document.querySelectorAll('input[name="vaultMode"]').forEach(r => { r.checked = r.value === Vault.mode; });
  $('passRow').hidden = true;
  $('vaultMsg').textContent = Vault.locked ? 'Las keys están bloqueadas. Recarga la página para desbloquearlas.' : '';
  renderBadges();
}

function openSettings(tab = 'appearance') {
  syncSettingsUI(); syncSecurityUI();
  $('chatsCount').textContent = `${chats.length} chat${chats.length === 1 ? '' : 's'} guardado${chats.length === 1 ? '' : 's'}.`;
  setTab(tab);
  settingsModal.hidden = false;
  closeSidebar();
}
function closeSettings() { settingsModal.hidden = true; }

function setTab(tab) {
  settingsModal.querySelectorAll('.modal-nav button').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
  settingsModal.querySelectorAll('[data-pane]').forEach(s => { s.hidden = s.dataset.pane !== tab; });
}

$('settingsBtn').addEventListener('click', () => openSettings());
$('settingsClose').addEventListener('click', closeSettings);
settingsModal.addEventListener('mousedown', (e) => { if (e.target === settingsModal) closeSettings(); });
settingsModal.querySelector('.modal-nav').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-tab]');
  if (b) setTab(b.dataset.tab);
});

// Apariencia
$('themeCards').addEventListener('click', (e) => { const b = e.target.closest('[data-pref]'); if (b) Theme.set(b.dataset.pref); });
$('themeBtn').addEventListener('click', () => Theme.toggle());
document.addEventListener('themechange', () => {
  syncSettingsUI();
  const t = $('themeIco');
  t.classList.remove('spin'); void t.offsetWidth; t.classList.add('spin');
});
$('colorsToggle').addEventListener('change', (e) => { settings.colors = e.target.checked; applySettings(); });

// Modelo
$('roleSelect').innerHTML = '<option value="">Ninguno</option>' + Object.keys(ROLES).map(r => `<option value="${r}">${r[0].toUpperCase() + r.slice(1)}</option>`).join('');
$('roleSelect').addEventListener('change', (e) => { settings.role = e.target.value; applySettings(); });
$('systemInput').addEventListener('input', (e) => { settings.system = e.target.value; writeJson('settings', settings); });
$('tempDefault').addEventListener('change', (e) => { settings.temperature = e.target.checked ? null : +$('tempRange').value; applySettings(); });
$('tempRange').addEventListener('input', (e) => { settings.temperature = +e.target.value; applySettings(); });

// Seguridad: keys (delegación, las tarjetas se generan dinámicamente)
const verifyTimers = {};
$('keyCards').addEventListener('input', (e) => {
  const input = e.target.closest('[data-key]');
  if (!input) return;
  const p = input.dataset.key;
  Vault.set(p, input.value);
  keyState[p] = input.value.trim() ? 'unverified' : 'none';
  renderBadges();
  clearTimeout(verifyTimers[p]);
  if (input.value.trim().length >= 20) verifyTimers[p] = setTimeout(() => checkKey(p), 900);
});
$('keyCards').addEventListener('click', (e) => {
  const eye = e.target.closest('[data-eye]');
  if (eye) {
    const input = document.querySelector(`[data-key="${eye.dataset.eye}"]`);
    const show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    eye.innerHTML = ico(show ? 'eye-off' : 'eye', 16);
    return;
  }
  const v = e.target.closest('[data-verify]');
  if (v) { toggleConsole(true); checkKey(v.dataset.verify); }
});

// Seguridad: dónde guardar
$('storageModes').addEventListener('change', async (e) => {
  if (e.target.name !== 'vaultMode') return;
  const mode = e.target.value;
  $('passRow').hidden = mode !== 'locked';
  if (mode === 'locked') { $('vaultMsg').textContent = 'Elige una contraseña y pulsa "Cifrar y guardar".'; $('vaultPass').focus(); return; }
  try {
    await Vault.setMode(mode);
    $('vaultMsg').textContent = mode === 'session' ? 'Las keys se borrarán al cerrar la pestaña.' : 'Las keys se guardan en este dispositivo.';
  } catch (err) { $('vaultMsg').textContent = err.message; syncSecurityUI(); }
});
$('vaultApply').addEventListener('click', async () => {
  try {
    await Vault.setMode('locked', $('vaultPass').value);
    $('vaultPass').value = '';
    $('passRow').hidden = true;
    $('vaultMsg').textContent = 'Keys cifradas con AES-256. Se pedirá la contraseña al abrir la app.';
  } catch (err) { $('vaultMsg').textContent = err.message; }
});
$('wipeKeys').addEventListener('click', (e) => {
  const b = e.currentTarget;
  if (!b.dataset.confirm) {
    b.dataset.confirm = '1'; b.lastChild.textContent = 'Pulsa otra vez para confirmar';
    setTimeout(() => { delete b.dataset.confirm; b.lastChild.textContent = 'Borrar todas las keys'; }, 3000);
    return;
  }
  Vault.clear();
  PROVIDER_IDS.forEach(p => { keyState[p] = 'none'; });
  syncSecurityUI();
  delete b.dataset.confirm; b.lastChild.textContent = 'Borrar todas las keys';
  $('vaultMsg').textContent = 'Keys eliminadas.';
});

// Datos
settingsModal.querySelectorAll('[data-export]').forEach(b => b.addEventListener('click', () => exportChat(b.dataset.export)));
$('wipeChats').addEventListener('click', (e) => {
  const b = e.currentTarget;
  if (!b.dataset.confirm) {
    b.dataset.confirm = '1'; b.lastChild.textContent = 'Pulsa otra vez para confirmar';
    setTimeout(() => { delete b.dataset.confirm; b.lastChild.textContent = 'Borrar todos los chats'; }, 3000);
    return;
  }
  chats = []; ChatStore.clear();
  delete b.dataset.confirm; b.lastChild.textContent = 'Borrar todos los chats';
  $('chatsCount').textContent = '0 chats guardados.';
  newChat();
});

// Desbloqueo al iniciar
function showLock() {
  const m = $('lockModal');
  m.hidden = false;
  $('unlockPass').focus();
  const unlock = async () => {
    try {
      await Vault.unlock($('unlockPass').value);
      m.hidden = true;
      $('unlockPass').value = ''; $('unlockErr').textContent = '';
      clog('Keys desbloqueadas', 'ok');
      verifyAllKeys();
    } catch (_) { $('unlockErr').textContent = 'Contraseña incorrecta.'; }
  };
  $('unlockBtn').onclick = unlock;
  $('unlockPass').onkeydown = (e) => { if (e.key === 'Enter') unlock(); };
  $('unlockSkip').onclick = () => { m.hidden = true; clog('Keys bloqueadas: continúas sin ellas.', 'warn'); renderBadges(); };
}

/** Verifica en silencio las keys guardadas (Ollama solo bajo demanda) */
function verifyAllKeys() {
  renderBadges();
  PROVIDER_IDS.forEach(p => { if (Vault.get(p)) checkKey(p, { quiet: true }); });
}

/* ═══ Atajos globales ══════════════════════════════════════════ */

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (!settingsModal.hidden) closeSettings();
    else if (!modelPop.hidden) closePop();
    else closeSidebar();
  }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openSidebar(); $('chatSearch').focus(); }
});

/* ═══ API pública para comandos y extensiones ══════════════════ */

window.App = {
  name: APP_NAME,
  settings, say, send, regenerate, newChat, exportChat, applySettings, buildSystem,
  checkKey, toggleConsole, openSettings, ico, escHtml, renderContent, clog,
  setProvider: (p) => setSelection(p, defaultModel(p)),
  setModel:    (m) => setSelection(provider, m),
  deleteCurrentChat: () => (chat && chats.includes(chat)) ? deleteChat(chat.id) : newChat(),
  provider:     () => provider,
  history:      () => chat.messages,
  chat:         () => chat,
  saveChat:     (c = chat) => saveChat(c),
  isStreaming:  () => streaming,
  focusInput:   () => userInputEl.focus(),
  models:       () => getModels(provider),
  currentModel: () => model,
};

/* ═══ Inicio ═══════════════════════════════════════════════════ */

hydrateIcons();
buildKeyCards();
Theme.apply();
syncSettingsUI();

const startup = Vault.init();

// Si el proveedor guardado no tiene key pero otro sí, empezamos con ese
if (!keyOf(provider)) {
  const alt = PROVIDER_IDS.find(p => Vault.get(p));
  if (alt) { provider = alt; model = ''; }
}
if (!model || !getModels(provider).includes(model)) model = defaultModel(provider);
renderChip();

// Chat inicial: el último activo o uno nuevo
const activeId = (() => { try { return localStorage.getItem('active_chat'); } catch (_) { return null; } })();
const lastChat = chats.find(c => c.id === activeId);
if (lastChat) openChat(lastChat); else newChat();

try { if (localStorage.getItem('console_open')) toggleConsole(true); } catch (_) {}
setLive('idle', 'Inactivo');
clog(`${APP_NAME} listo.`);
renderChatList();
renderBadges();
updateSendBtn();
userInputEl.focus();

if (startup.locked) showLock(); else verifyAllKeys();
