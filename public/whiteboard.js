/**
 * Pizarra: un lienzo por chat donde la IA crea mini-aplicaciones (HTML + CSS + JS).
 *
 * SEGURIDAD (el código lo genera un modelo, así que se trata como no confiable):
 *  - <iframe sandbox="allow-scripts">  SIN allow-same-origin: origen opaco, no puede
 *    leer el DOM, localStorage, cookies ni las API keys de Sunstar.
 *  - CSP dentro del iframe: connect-src/frame-src/form-action 'none', sin recursos
 *    externos (solo data: y blob:), así que no puede enviar datos a ninguna parte.
 *  - Se eliminan meta, base, link, iframe, object, embed y <script src>.
 *  - Bloqueo de alert/confirm/prompt, formularios y navegación por enlaces.
 *  - Mensajes iframe -> Sunstar: solo "error" y "ready", validando e.source, y el
 *    texto se muestra siempre con textContent.
 *  - El diseño (variables y clases) lo inyecta Sunstar con !important: el código de
 *    la pizarra no puede redefinir los colores del tema.
 *
 * Cada petición de cambio crea una VERSIÓN nueva; las anteriores se conservan.
 */
(() => {
  const LANGS = new Set(['pizarra', 'whiteboard']);
  const MAX_VERSIONS = 60;
  const MAX_HTML = 300000;
  const PROMPT_CODE_LIMIT = 24000;

  const rid = () => Math.random().toString(36).slice(2, 10);

  /* ── Diseño fijo de la pizarra (mismo sistema que Sunstar) ─ */

  const WB_CSS = `
:root{color-scheme:dark;--radius:10px;
--bg:#0a0a0a!important;--surface:#141414!important;--surface-2:#1b1b1b!important;--border:#242424!important;--border-2:#333333!important;
--text:#ededed!important;--text-2:#a3a3a3!important;--text-3:#737373!important;--primary:#ededed!important;--on-primary:#0a0a0a!important;
--green:#3fb950!important;--red:#f4525a!important;--amber:#e5a420!important;--blue:#4c9aff!important;--focus:#4c9aff!important}
:root[data-theme="light"]{color-scheme:light;
--bg:#ffffff!important;--surface:#f5f5f5!important;--surface-2:#ececec!important;--border:#e5e5e5!important;--border-2:#d4d4d4!important;
--text:#171717!important;--text-2:#525252!important;--text-3:#8a8a8a!important;--primary:#171717!important;--on-primary:#ffffff!important;
--green:#1a7f37!important;--red:#d1242f!important;--amber:#b25e09!important;--blue:#0969da!important;--focus:#0070f3!important}
*,*::before,*::after{box-sizing:border-box}
html{font-size:15px}
body{margin:0;padding:20px;background:var(--bg);color:var(--text);font-family:'Geist',-apple-system,'Segoe UI',system-ui,sans-serif;line-height:1.6;-webkit-font-smoothing:antialiased}
h1,h2,h3,h4{margin:0 0 .6em;font-weight:600;letter-spacing:-.02em;line-height:1.3}
h1{font-size:1.6rem}h2{font-size:1.3rem}h3{font-size:1.1rem}
p{margin:0 0 .8em}a{color:var(--blue)}hr{border:none;border-top:1px solid var(--border);margin:16px 0}
code,kbd,.mono{font-family:'Geist Mono',ui-monospace,Consolas,monospace;font-size:.9em}
kbd,code{padding:.1em .4em;border-radius:6px;background:var(--surface-2);border:1px solid var(--border)}
button,.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:36px;padding:0 16px;border-radius:var(--radius);border:1px solid var(--border-2);background:var(--bg);color:var(--text);font:inherit;font-size:.9rem;font-weight:500;cursor:pointer;transition:background .15s,transform .12s,border-color .15s}
button:hover,.btn:hover{background:var(--surface)}
button:active,.btn:active{transform:scale(.97)}
button:disabled{opacity:.45;cursor:not-allowed}
button.primary,.btn.primary{background:var(--primary);color:var(--on-primary);border-color:var(--primary)}
button.primary:hover{opacity:.9;background:var(--primary)}
button.danger,.btn.danger{color:var(--red);border-color:var(--red)}
input,select,textarea,.field{width:100%;min-height:38px;padding:8px 12px;border-radius:var(--radius);border:1px solid var(--border-2);background:var(--bg);color:var(--text);font:inherit;font-size:.95rem;outline:none;transition:border-color .15s,box-shadow .15s}
input:focus,select:focus,textarea:focus{border-color:var(--focus);box-shadow:0 0 0 3px color-mix(in srgb,var(--focus) 22%,transparent)}
input[type=checkbox],input[type=radio]{width:auto;min-height:0;accent-color:var(--primary)}
input[type=range]{padding:0;accent-color:var(--primary)}
label{font-size:.85rem;color:var(--text-2)}
table{width:100%;border-collapse:collapse;font-size:.9rem}
th,td{padding:9px 12px;text-align:left;border-bottom:1px solid var(--border)}
th{color:var(--text-2);font-weight:600;font-size:.8rem;background:var(--surface)}
.card{padding:16px;border:1px solid var(--border);border-radius:calc(var(--radius) + 4px);background:var(--surface)}
.badge{display:inline-flex;align-items:center;padding:2px 10px;border-radius:20px;border:1px solid var(--border-2);font-size:.75rem;color:var(--text-2)}
.progress{height:8px;border-radius:8px;background:var(--surface-2);overflow:hidden}
.progress>i{display:block;height:100%;background:var(--primary);border-radius:8px;transition:width .3s}
.stack{display:flex;flex-direction:column;gap:12px}
.row{display:flex;align-items:center;gap:12px}
.col{display:flex;flex-direction:column;gap:12px}
.grid{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(140px,1fr))}
.wrap{flex-wrap:wrap}.between{justify-content:space-between}.center{justify-content:center;align-items:center}.grow{flex:1}
.gap-1{gap:4px}.gap-2{gap:8px}.gap-3{gap:16px}.gap-4{gap:24px}
.p-1{padding:4px}.p-2{padding:8px}.p-3{padding:16px}.p-4{padding:24px}.mt-2{margin-top:8px}.mt-3{margin-top:16px}
.w-full{width:100%}.hidden{display:none!important}
.muted{color:var(--text-2)}.faint{color:var(--text-3)}.text-center{text-align:center}
.big{font-size:2.6rem;font-weight:600;letter-spacing:-.03em;font-variant-numeric:tabular-nums}
.ok{color:var(--green)}.err{color:var(--red)}.warn{color:var(--amber)}
::-webkit-scrollbar{width:10px;height:10px}::-webkit-scrollbar-thumb{background:var(--border-2);border-radius:10px;border:3px solid transparent;background-clip:content-box}
`;

  // Se inyecta DESPUÉS del código de la pizarra y con !important: el lienzo, el color
  // de texto y la tipografía base son del sistema de diseño y no se pueden cambiar.
  // (los tokens se repiten aquí con mayor especificidad: si el código de la pizarra
  //  redefine --bg con !important, el empate lo gana el último y más específico)
  const WB_TOKENS = WB_CSS.slice(0, WB_CSS.indexOf('*,*::before')).replace(/:root/g, ':root:root:root');
  const WB_ENFORCE = WB_TOKENS + `html,body{background:var(--bg)!important;color:var(--text)!important;font-family:'Geist',-apple-system,'Segoe UI',system-ui,sans-serif!important}
body{margin:0!important}
button,.btn{font-family:inherit!important}`;

  // Se ejecuta dentro del iframe, antes que el código de la pizarra
  const BOOTSTRAP = `(function(){
var send=function(t,m){try{parent.postMessage({sunstar:'wb',type:t,msg:String(m==null?'':m).slice(0,500)},'*')}catch(e){}};
window.addEventListener('error',function(e){send('error',(e.message||'Error')+(e.lineno?' (línea '+e.lineno+')':''))});
window.addEventListener('unhandledrejection',function(e){send('error','Promesa rechazada: '+((e.reason&&e.reason.message)||e.reason))});
window.addEventListener('message',function(e){var d=e.data;if(d&&d.sunstar==='theme'&&(d.theme==='dark'||d.theme==='light'))document.documentElement.setAttribute('data-theme',d.theme)});
window.alert=window.confirm=window.prompt=function(){send('error','Los cuadros de diálogo del navegador están bloqueados en la pizarra.')};
window.open=function(){send('error','Abrir ventanas está bloqueado en la pizarra.');return null};
document.addEventListener('click',function(e){var a=e.target&&e.target.closest&&e.target.closest('a');if(a){var h=a.getAttribute('href')||'';if(h.charAt(0)!=='#'){e.preventDefault();send('error','Los enlaces externos están bloqueados en la pizarra.')}}},true);
document.addEventListener('submit',function(e){e.preventDefault()},true);
document.addEventListener('DOMContentLoaded',function(){send('ready','')});
})();`;

  const CSP = "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; media-src data: blob:; font-src data:; connect-src 'none'; frame-src 'none'; object-src 'none'; form-action 'none'; base-uri 'none'";

  /* ── Fuentes: se incrustan como data: para respetar la CSP ── */

  let fontCss = '';
  async function loadFonts() {
    try {
      const css = await (await fetch('https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&family=Geist+Mono:wght@400;500&display=swap')).text();
      const blocks = css.split('/*').filter(b => b.trim().startsWith('latin */')).map(b => '/*' + b);
      const cache = {};
      const out = [];
      for (const block of blocks) {
        const m = /url\((https:[^)]+)\)/.exec(block);
        if (!m) continue;
        if (!cache[m[1]]) {
          const buf = await (await fetch(m[1])).arrayBuffer();
          let bin = ''; new Uint8Array(buf).forEach(b => { bin += String.fromCharCode(b); });
          cache[m[1]] = `data:font/woff2;base64,${btoa(bin)}`;
        }
        out.push(block.replace(m[1], cache[m[1]]));
      }
      fontCss = out.join('\n');
    } catch (_) { /* sin conexión: se usa la tipografía del sistema */ }
  }

  /* ── Preparación del código ─────────────────────────────── */

  function extractTitle(html) {
    const t = /<title[^>]*>([^<]+)<\/title>/i.exec(html) || /<!--\s*([^>]*?)\s*-->/.exec(html) || /<h[12][^>]*>([^<]+)<\/h[12]>/i.exec(html);
    return (t ? t[1].trim() : 'Sin título').slice(0, 60);
  }

  /** Quita lo que no debe ejecutarse y devuelve { head, body } */
  function prepare(html) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    doc.querySelectorAll('meta,base,link,iframe,frame,frameset,object,embed,script[src]').forEach(n => n.remove());
    // los <script> que cayeron en <head> deben esperar al DOM
    const head = [...doc.head.children].map(n => {
      if (n.tagName === 'SCRIPT') n.textContent = `document.addEventListener('DOMContentLoaded',function(){${n.textContent}\n});`;
      return n.outerHTML;
    }).join('\n');
    return { head, body: doc.body.innerHTML };
  }

  function buildDoc(html) {
    const { head, body } = prepare(html);
    const theme = Theme.resolved;
    return `<!doctype html><html lang="es" data-theme="${theme}"><head><meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="${CSP}">
<meta name="viewport" content="width=device-width, initial-scale=1">
<script>${BOOTSTRAP}<\/script>
<style>${fontCss}</style><style>${WB_CSS}</style>
${head}
<style>${WB_ENFORCE}</style>
</head><body>${body}</body></html>`;
  }

  /* ── Datos por chat ─────────────────────────────────────── */

  const getBoard = (chat, create) => {
    if (!chat) return null;
    if (!chat.board && create) chat.board = { versions: [], current: null, seq: 0 };
    return chat.board;
  };
  const findV = (chat, id) => getBoard(chat)?.versions.find(v => v.id === id) || null;

  function addVersion(chat, html, msgId) {
    const b = getBoard(chat, true);
    const v = { id: rid(), n: ++b.seq, title: extractTitle(html), html, t: Date.now(), msg: msgId };
    b.versions.push(v);
    if (b.versions.length > MAX_VERSIONS) b.versions.shift();
    b.current = v.id;
    return v;
  }

  /* ── Prompt de sistema ──────────────────────────────────── */

  const BOARD_PROMPT = `PIZARRA: Sunstar tiene una pizarra por chat, un lienzo donde puedes crear mini-aplicaciones (calculadoras, contadores, formularios, juegos, visualizaciones...) con HTML, CSS y JavaScript. Cuando el usuario pida crear o cambiar algo interactivo, o mencione la pizarra, responde con UN bloque de código de lenguaje "pizarra" que contenga el código COMPLETO y autocontenido (fragmento HTML con <style> y <script> opcionales; sin <html> ni <head>). Reglas:
- Se ejecuta aislada: sin red, sin librerías externas (nada de CDN, fuentes ni imágenes por URL), sin localStorage ni cookies, sin alert/confirm/prompt ni enlaces externos. Todo va dentro del bloque; las imágenes solo como SVG inline o data: URI. Guarda el estado en variables de JavaScript.
- El diseño ya está definido y NO se puede cambiar: usa las variables CSS (--bg, --surface, --surface-2, --border, --border-2, --text, --text-2, --text-3, --primary, --on-primary, --green, --red, --amber, --blue, --radius) y las clases: .stack, .row, .col, .grid, .gap-1..4, .between, .center, .wrap, .grow, .card, .btn (.primary, .danger), .field, .badge, .progress>i, .muted, .mono, .big, .ok, .err, .warn, .w-full, .p-1..4. Los elementos nativos (button, input, select, textarea, table, h1-h3) ya traen su estilo. No definas colores, fuentes ni fondos propios: solo variables. Hazla responsive.
- Para modificarla, devuelve de nuevo el código COMPLETO actualizado en un nuevo bloque "pizarra" (se guarda como una versión nueva y las anteriores se conservan). La primera línea del bloque debe ser un comentario HTML con el título, por ejemplo <!-- Calculadora de propinas -->.
- Fuera del bloque, explica en una o dos frases qué hiciste.`;

  Ext.systemParts.push(() => {
    const chat = App.chat();
    const b = getBoard(chat);
    const v = b && findV(chat, b.current);
    if (!v) return BOARD_PROMPT;
    const code = v.html.length > PROMPT_CODE_LIMIT ? v.html.slice(0, PROMPT_CODE_LIMIT) + '\n<!-- (recortado) -->' : v.html;
    return `${BOARD_PROMPT}\n\nPIZARRA ACTUAL (versión ${v.n}, "${v.title}"). Si el usuario pide cambios, parte de este código:\n\`\`\`html\n${code}\n\`\`\``;
  });

  /* ── Tarjeta dentro del chat ────────────────────────────── */

  Ext.codeHandlers.push({
    render(lang, code, key, ctx) {
      if (!LANGS.has(lang)) return null;
      const idx = ctx.index('wb');
      return `<div class="wb-chip${ctx.partial ? ' loading' : ''}" data-key="${key}" data-idx="${idx}">
  <span class="wb-chip-ico">${App.ico('layout', 18)}</span>
  <span class="wb-chip-txt"><b>${ctx.partial ? 'Creando pizarra' : 'Pizarra'}</b><span>${ctx.partial ? '<span class="thinking"><i></i><i></i><i></i></span>' : ''}</span></span>
</div>`;
    },
  });

  function fillChip(chip, chat, v) {
    if (!v) {
      chip.classList.add('gone');
      chip.querySelector('.wb-chip-txt').innerHTML = '<b>Pizarra</b><span>Esta versión ya no está disponible</span>';
      return;
    }
    chip.dataset.v = v.id;
    chip.innerHTML = `
      <span class="wb-chip-ico">${App.ico('layout', 18)}</span>
      <span class="wb-chip-txt"><b>Pizarra · v${v.n}</b><span></span></span>
      <button class="btn-sm" data-wb-open>${App.ico('eye', 14)}Abrir</button>
      <button class="btn-sm" data-wb-code>${App.ico('code', 14)}Código</button>`;
    chip.querySelector('.wb-chip-txt span').textContent = v.title;
  }

  Ext.hydrators.push((el, msg, chat) => {
    const chips = el.querySelectorAll('.wb-chip');
    if (!chips.length) return;
    let created = false;
    if (!msg.wb) {                       // mensaje nuevo: cada bloque pasa a ser una versión
      msg.wb = [];
      chips.forEach(ch => {
        const code = (el._code[ch.dataset.key] || '').trim();
        if (code && code.length <= MAX_HTML) { msg.wb.push(addVersion(chat, code, msg.id).id); created = true; }
        else msg.wb.push(null);
      });
    }
    chips.forEach((ch, i) => fillChip(ch, chat, findV(chat, msg.wb[i])));
    if (created && chat === App.chat() && ui) { open(); render(true); }
  });

  Ext.clickHandlers.push((e) => {
    const chip = e.target.closest('.wb-chip');
    if (!chip) return false;
    const isCode = e.target.closest('[data-wb-code]');
    if (!e.target.closest('[data-wb-open]') && !isCode) return false;
    const chat = App.chat(), b = getBoard(chat);
    if (b && chip.dataset.v && findV(chat, chip.dataset.v)) { b.current = chip.dataset.v; App.saveChat(chat); }
    codeView = !!isCode;
    open(); render(true);
    return true;
  });

  Ext.removed.push((chat, msg) => {
    const b = getBoard(chat);
    if (!b || !msg?.id) return;
    b.versions = b.versions.filter(v => v.msg !== msg.id);
    if (!b.versions.some(v => v.id === b.current)) b.current = b.versions.length ? b.versions[b.versions.length - 1].id : null;
    if (ui) render(true);
  });

  Ext.chatChanged.push(() => { if (ui) { codeView = false; hideErr(); render(true); } });

  /* ── Panel lateral ──────────────────────────────────────── */

  let ui = null;
  let codeView = false;
  let shown = { id: null, theme: null };

  const EXAMPLES = ['una calculadora de propinas', 'un contador con historial', 'un temporizador pomodoro', 'una lista de tareas'];

  function build() {
    const aside = document.createElement('aside');
    aside.className = 'board';
    aside.id = 'board';
    aside.hidden = true;
    aside.innerHTML = `
      <div class="board-head">
        <div class="board-title">${App.ico('layout', 16)}<b>Pizarra</b></div>
        <select class="board-versions" id="wbVersions" aria-label="Versiones"></select>
        <span class="spacer"></span>
        <button class="icon-btn sm" data-wb="code" title="Ver código">${App.ico('code', 15)}</button>
        <button class="icon-btn sm" data-wb="copy" title="Copiar código">${App.ico('copy', 15)}</button>
        <button class="icon-btn sm" data-wb="reload" title="Reiniciar">${App.ico('rotate-ccw', 15)}</button>
        <button class="icon-btn sm" data-wb="full" title="Pantalla completa">${App.ico('maximize', 15)}</button>
        <button class="icon-btn sm" data-wb="close" title="Cerrar">${App.ico('x', 15)}</button>
      </div>
      <div class="board-err" hidden><span class="board-err-ico">${App.ico('alert', 15)}</span><span class="board-err-txt"></span><button class="btn-sm" data-wb="fix">Pedir que lo corrija</button></div>
      <div class="board-body">
        <iframe class="board-frame" title="Pizarra" sandbox="allow-scripts" referrerpolicy="no-referrer"></iframe>
        <pre class="board-code" hidden><code class="hljs language-xml"></code></pre>
        <div class="board-empty">
          <div class="be-ico">${App.ico('layout', 28)}</div>
          <h4>Tu pizarra está vacía</h4>
          <p>Pídele a Sunstar que cree algo: una herramienta, un juego, un formulario. Cada cambio se guarda como una versión.</p>
          <div class="be-chips">${EXAMPLES.map(x => `<button class="suggest sm" data-ex="${App.escHtml(x)}">${App.ico('plus', 14)}<span>${App.escHtml(x[0].toUpperCase() + x.slice(1))}</span></button>`).join('')}</div>
        </div>
      </div>
      <div class="board-foot">${App.ico('shield', 13)}<span>Se ejecuta aislada: sin red y sin acceso a Sunstar ni a tus keys.</span></div>`;
    document.querySelector('.app').appendChild(aside);

    // botón en la barra superior
    const btn = document.createElement('button');
    btn.className = 'icon-btn';
    btn.id = 'boardBtn';
    btn.title = 'Pizarra';
    btn.innerHTML = App.ico('layout', 16) + '<i class="dotbadge" hidden></i>';
    document.getElementById('consoleBtn').before(btn);

    const frame = aside.querySelector('.board-frame');
    const select = aside.querySelector('#wbVersions');
    const ui2 = { aside, btn, frame, select, code: aside.querySelector('.board-code'), empty: aside.querySelector('.board-empty'), err: aside.querySelector('.board-err') };

    btn.addEventListener('click', () => (aside.hidden ? open() : close()));
    select.addEventListener('change', () => {
      const chat = App.chat(), b = getBoard(chat);
      if (b) { b.current = select.value; App.saveChat(chat); render(true); }
    });

    aside.addEventListener('click', async (e) => {
      const ex = e.target.closest('[data-ex]');
      if (ex) { const t = `En la pizarra, crea ${ex.dataset.ex}`; if (!App.send(t)) { document.getElementById('userInput').value = t; } return; }
      const a = e.target.closest('[data-wb]');
      if (!a) return;
      const chat = App.chat(), b = getBoard(chat), v = b && findV(chat, b.current);
      switch (a.dataset.wb) {
        case 'close':  close(); break;
        case 'full':   aside.classList.toggle('full'); a.innerHTML = App.ico(aside.classList.contains('full') ? 'minimize' : 'maximize', 15); break;
        case 'reload': hideErr(); render(true); break;
        case 'code':   codeView = !codeView; render(true); break;
        case 'copy':   if (v) { await navigator.clipboard.writeText(v.html); a.innerHTML = App.ico('check', 15); setTimeout(() => { a.innerHTML = App.ico('copy', 15); }, 1500); } break;
        case 'fix': {
          const msg = ui.err.querySelector('.board-err-txt').textContent;
          aside.classList.remove('full');
          if (!App.send(`La pizarra muestra este error: "${msg}". Corrígelo y devuelve el código completo actualizado.`)) document.getElementById('userInput').focus();
          break;
        }
      }
    });

    // mensajes del iframe (solo los nuestros, solo de ese iframe)
    window.addEventListener('message', (e) => {
      if (e.source !== frame.contentWindow) return;
      const d = e.data;
      if (!d || d.sunstar !== 'wb') return;
      if (d.type === 'error') showErr(String(d.msg));
      else if (d.type === 'ready') { /* sin errores al cargar */ }
    });

    document.addEventListener('themechange', () => {
      try { frame.contentWindow?.postMessage({ sunstar: 'theme', theme: Theme.resolved }, '*'); } catch (_) {}
    });

    return ui2;
  }

  function showErr(text) {
    ui.err.hidden = false;
    ui.err.querySelector('.board-err-txt').textContent = text;
  }
  function hideErr() { if (ui) ui.err.hidden = true; }

  function open()  { if (!ui) return; ui.aside.hidden = false; ui.btn.classList.add('on'); try { localStorage.setItem('board_open', '1'); } catch (_) {} }
  function close() { if (!ui) return; ui.aside.hidden = true; ui.aside.classList.remove('full'); ui.btn.classList.remove('on'); try { localStorage.setItem('board_open', ''); } catch (_) {} }

  /** Pinta el estado actual. force = recargar el iframe aunque no haya cambiado */
  function render(force = false) {
    if (!ui) return;
    const chat = App.chat(), b = getBoard(chat);
    const versions = b?.versions || [];
    const v = b && findV(chat, b.current);

    ui.btn.querySelector('.dotbadge').hidden = !versions.length;
    ui.select.innerHTML = versions.slice().reverse().map(x =>
      `<option value="${x.id}"${x.id === b.current ? ' selected' : ''}>v${x.n} · ${App.escHtml(x.title)} · ${new Date(x.t).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}</option>`).join('');
    ui.select.hidden = versions.length < 1;
    ui.aside.querySelector('[data-wb="code"]').classList.toggle('on', codeView);

    ui.empty.hidden = !!v;
    ui.frame.hidden = !v || codeView;
    ui.code.hidden  = !v || !codeView;
    if (!v) { shown = { id: null, theme: null }; ui.frame.removeAttribute('srcdoc'); return; }

    if (codeView) {
      const codeEl = ui.code.querySelector('code');
      try { codeEl.innerHTML = hljs.highlight(v.html, { language: 'xml', ignoreIllegals: true }).value; }
      catch (_) { codeEl.textContent = v.html; }
      return;
    }
    if (force || shown.id !== v.id) {
      hideErr();
      ui.frame.srcdoc = buildDoc(v.html);
      shown = { id: v.id, theme: Theme.resolved };
    }
  }

  /* ── API pública y arranque ─────────────────────────────── */

  window.Board = {
    open: () => { open(); render(); },
    close,
    toggle: () => (ui?.aside.hidden ? (open(), render()) : close()),
    hasVersions: () => !!getBoard(App.chat())?.versions.length,
  };

  document.addEventListener('DOMContentLoaded', () => {
    ui = build();
    loadFonts();
    render();
    try { if (localStorage.getItem('board_open')) { open(); } } catch (_) {}
  });
})();
