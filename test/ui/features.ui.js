const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const puppeteer = require('puppeteer-core');
const { browserPath, startApp, skipReason, shotsDir } = require('./_env');
const wait = (ms) => new Promise(r => setTimeout(r, ms));
const results = [];
const ok = (name, cond, extra = '') => results.push(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra ? '  [' + extra + ']' : ''}`);

const MERMAID_OK = 'Aquí tienes el flujo:\n\n```mermaid\nflowchart TD\n  A[Inicio] --> B{¿Autenticado?}\n  B -- Sí --> C[Panel]\n  B -- No --> D[Login]\n  D --> B\n```\n';
const MERMAID_BAD = 'Prueba:\n\n```mermaid\nflowchart TD\n  A[[[ --> --> \n```\n';
const MERMAID_NOLANG = 'Sin lenguaje:\n\n```\nsequenceDiagram\n  Alice->>Bob: Hola\n  Bob-->>Alice: Qué tal\n```\n';
const QUIZ1 = 'Antes de empezar:\n\n```preguntas\n' + JSON.stringify({
  title: 'App nueva',
  questions: [
    { question: '¿Qué tipo de app?', options: [{ label: 'Web', description: 'Navegador' }, { label: 'Móvil' }] },
    { question: '¿Qué funciones?', multi: true, options: ['Login', 'Pagos', 'Chat'] },
    { question: '¿Estilo?', options: ['Claro', 'Oscuro'] },
  ],
}) + '\n```\n';
const QUIZ2 = 'Otro:\n\n```preguntas\n' + JSON.stringify({ title: 'Rápido', questions: [{ question: '¿Sí o no?', options: ['Sí', 'No'] }, { question: '¿Color?', options: ['Rojo', 'Azul'] }] }) + '\n```\n';

const WB1 = 'Listo, aquí tienes un contador.\n\n```pizarra\n<!-- Contador simple -->\n<div class="card stack" style="max-width:320px">\n  <h2>Contador</h2>\n  <div class="big" id="n">0</div>\n  <button class="btn primary" id="inc">Sumar</button>\n</div>\n<script>\nlet n=0;document.getElementById("inc").addEventListener("click",()=>{n++;document.getElementById("n").textContent=n;});\n<\/script>\n```\n';
const WB2_EVIL = 'Versión 2.\n\n```pizarra\n<!-- Prueba de seguridad -->\n<style>:root{--bg:red !important} body{background:red}</style>\n<div id="out">pendiente</div>\n<script src="https://evil.example/x.js"></script>\n<script>\nconst r={};\ntry{r.parent=String(parent.document.title)}catch(e){r.parent="bloqueado"}\ntry{r.top=String(top.location.href)}catch(e){r.top="bloqueado"}\ntry{r.ls=String(localStorage.getItem("keys"))}catch(e){r.ls="bloqueado"}\ntry{r.cookie=document.cookie}catch(e){r.cookie="bloqueado"}\nfetch("/api/check",{method:"POST"}).then(()=>{r.fetch="PERMITIDO"}).catch(()=>{r.fetch="bloqueado"}).finally(()=>{document.getElementById("out").textContent=JSON.stringify(r)});\n<\/script>\n```\n';

test('UI: proveedores, Mermaid, cuestionarios, pizarra y seguridad', { skip: skipReason(), timeout: 180000 }, async () => {
  const app = await startApp();
  const errors = [];
  const bodies = [];
  const browser = await puppeteer.launch({
    executablePath: browserPath(),
    headless: 'new', args: ['--no-sandbox'], defaultViewport: { width: 1360, height: 860 },
  });
  const page = await browser.newPage();
  const shot = async (name) => { if (shotsDir) await page.screenshot({ path: path.join(shotsDir, name) }); };
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/Content Security Policy|Refused to|evil\.example|ERR_|net::/.test(m.text())) errors.push('console.error: ' + m.text()); });

  await page.setRequestInterception(true);
  page.on('request', req => {
    const u = req.url();
    if (u.endsWith('/api/check')) {
      const prov = JSON.parse(req.postData() || '{}').provider;
      const models = prov === 'deepseek' ? ['deepseek-chat', 'deepseek-reasoner'] : ['gemini-2.5-flash', 'gemini-2.5-pro'];
      return req.respond({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, ms: 5, models }) });
    }
    if (u.includes('/api/chat/')) {
      const b = JSON.parse(req.postData() || '{}');
      bodies.push(b);
      const last = b.messages[b.messages.length - 1].content;
      const pick = last.includes('MERMAID_OK') ? MERMAID_OK : last.includes('MERMAID_BAD') ? MERMAID_BAD : last.includes('MERMAID_NOLANG') ? MERMAID_NOLANG
        : last.includes('QUIZ1') ? QUIZ1 : last.includes('QUIZ2') ? QUIZ2 : last.includes('WB1') ? WB1 : last.includes('WB2') ? WB2_EVIL
        : last.startsWith('Mis respuestas') ? 'Perfecto, continúo con tus respuestas.' : 'ok';
      const chunks = pick.match(/[\s\S]{1,60}/g);
      return req.respond({ status: 200, contentType: 'text/event-stream', body: chunks.map(c => 'data: ' + JSON.stringify({ token: c }) + '\n\n').join('') + 'data: [DONE]\n\n' });
    }
    req.continue();
  });

  await page.evaluateOnNewDocument(() => {
    try { if (!sessionStorage.getItem('seeded')) {
      localStorage.clear();
      localStorage.setItem('keys', JSON.stringify({ gemini: 'AIzaFAKEKEYFAKEKEYFAKEKEYFAKE', deepseek: 'sk-fakefakefakefakefakefake' }));
      localStorage.setItem('sel', JSON.stringify({ provider: 'gemini', model: 'gemini-2.5-flash' }));
      localStorage.setItem('theme', 'dark');
      sessionStorage.setItem('seeded', '1');
    } } catch (_) { /* iframe aislado de la pizarra */ }
  });

  const count = (sel) => page.$$eval(sel, e => e.length);
  async function sendMsg(text) {
    const before = await count('.msg-assistant:not(.is-streaming)');
    await page.click('#userInput');
    await page.type('#userInput', text);
    await page.keyboard.press('Enter');
    await page.waitForFunction((n) => document.querySelectorAll('.msg-assistant:not(.is-streaming)').length > n && !document.querySelector('.is-streaming'), { timeout: 20000 }, before);
    await wait(500);
  }

  await page.goto(app.base, { waitUntil: 'networkidle2' });
  await wait(700);

  // ── Marca ────────────────────────────────────────────────
  ok('marca Sunstar con subtitulo ChatBot AI', (await page.$eval('.brand-text', e => e.innerText.replace(/\s+/g, ' ').trim().toLowerCase())) === 'sunstar chatbot ai');
  ok('titulo de la pestana', (await page.title()).includes('Sunstar'));

  // ── Selector multi-proveedor ─────────────────────────────
  await page.click('#modelBtn');
  await wait(300);
  const provs = await page.$$eval('.pop-provs button', els => els.map(e => e.querySelector('span').firstChild.textContent));
  ok('selector lista 10 proveedores', provs.length === 10, provs.join(','));
  ok('incluye ChatGPT, DeepSeek, Grok, Qwen', ['ChatGPT', 'DeepSeek', 'Grok', 'Qwen'].every(p => provs.includes(p)));
  await shot('n1-picker.png');
  await page.evaluate(() => [...document.querySelectorAll('.pop-provs button')].find(b => b.textContent.includes('DeepSeek')).click());
  await wait(200);
  const dsModels = await page.$$eval('.pop-item', e => e.map(x => x.textContent.trim()));
  ok('DeepSeek muestra sus modelos', dsModels.includes('deepseek-chat'), dsModels.join(','));
  await page.click('.pop-item');
  await wait(200);
  ok('chip cambia a DeepSeek', (await page.$eval('#chipProv', e => e.textContent)) === 'DeepSeek');
  // volver a Gemini
  await page.click('#modelBtn'); await wait(200);
  await page.evaluate(() => [...document.querySelectorAll('.pop-provs button')].find(b => b.textContent.includes('Gemini')).click());
  await wait(150);
  await page.click('.pop-item'); await wait(200);

  // ── Identidad ────────────────────────────────────────────
  await sendMsg('hola');
  ok('system prompt presenta a Sunstar', /Te llamas Sunstar/.test(bodies.at(-1).system));
  ok('system prompt indica el modelo real', /Gemini \(gemini-2\.5-flash\)/.test(bodies.at(-1).system));
  ok('meta del mensaje dice Sunstar', (await page.$eval('.msg-assistant .msg-meta', e => e.innerText)).includes('Sunstar'));
  ok('system incluye instrucciones de cuestionario y pizarra', /CUESTIONARIOS INTERACTIVOS/.test(bodies.at(-1).system) && /PIZARRA:/.test(bodies.at(-1).system));

  // ── Mermaid ──────────────────────────────────────────────
  await sendMsg('MERMAID_OK');
  await page.waitForSelector('.diagram .dg-canvas svg', { timeout: 15000 });
  ok('mermaid renderiza SVG', true);
  ok('vista por defecto', (await page.$eval('.diagram', e => e.dataset.view)) === 'preview');
  ok('pestanas Vista y Codigo + copiar', (await page.$$eval('.diagram .dg-tab', e => e.map(x => x.textContent.trim()))).join() === 'Vista,Código' && !!(await page.$('.diagram .copy-btn')));
  await shot('n2-mermaid-dark.png');
  await page.click('.diagram .dg-tab[data-view="code"]'); await wait(200);
  ok('pestana Codigo muestra el codigo', (await page.$eval('.diagram .dg-code', e => getComputedStyle(e).display !== 'none' && e.textContent.includes('flowchart TD'))) && (await page.$eval('.diagram .dg-view', e => getComputedStyle(e).display === 'none')));
  await page.click('.diagram .dg-tab[data-view="preview"]'); await wait(200);
  await page.click('.diagram .dg-full'); await wait(500);
  ok('pantalla completa abre', await page.$eval('.dg-overlay', e => !e.hidden));
  const z0 = await page.$eval('.dg-zoom', e => e.textContent);
  await page.click('[data-z="in"]'); await wait(100);
  const z1 = await page.$eval('.dg-zoom', e => e.textContent);
  ok('zoom funciona', parseInt(z1) > parseInt(z0), `${z0} -> ${z1}`);
  await shot('n3-mermaid-full.png');
  await page.keyboard.press('Escape'); await wait(200);
  ok('Esc cierra pantalla completa', await page.$eval('.dg-overlay', e => e.hidden));
  // tema claro redibuja
  await page.click('#themeBtn'); await wait(1200);
  await shot('n4-mermaid-light.png');
  ok('diagrama sigue visible tras cambiar de tema', !!(await page.$('.diagram .dg-canvas svg')));
  await page.click('#themeBtn'); await wait(600);

  await sendMsg('MERMAID_BAD');
  await wait(1200);
  const bad = await page.$$eval('.diagram', els => els.map(e => ({ view: e.dataset.view, err: !!e.querySelector('.dg-error') })));
  ok('mermaid invalido: cae a Codigo con aviso', bad.at(-1).view === 'code' && bad.at(-1).err, JSON.stringify(bad.at(-1)));
  await sendMsg('MERMAID_NOLANG');
  await page.waitForFunction(() => document.querySelectorAll('.diagram .dg-canvas svg').length >= 2, { timeout: 15000 }).catch(() => {});
  ok('detecta diagrama sin lenguaje', (await count('.diagram .dg-canvas svg')) >= 2);

  // ── Cuestionario ─────────────────────────────────────────
  await sendMsg('QUIZ1');
  ok('cuestionario aparece', !!(await page.$('.qflow .qf-card')));
  await shot('n5-quiz-q1.png');
  await page.click('.qflow:last-of-type .qf-opt[data-k="0"], .qflow .qf-opt[data-k="0"]'); await wait(700);
  ok('opcion unica avanza sola a la pregunta 2', (await page.$eval('.qf-count', e => e.textContent)).includes('pregunta 2 de 3'));
  const nextDisabledEmpty = await page.$eval('[data-nav="next"]', b => b.disabled);
  ok('Siguiente desactivado sin respuesta', nextDisabledEmpty);
  await page.click('.qf-opt[data-k="0"]'); await page.click('.qf-opt[data-k="2"]'); await wait(150);
  ok('multiple permite varias', (await count('.qf-opt.on')) === 2);
  await page.click('[data-nav="next"]'); await wait(300);
  await page.click('.qf-other-opt'); await wait(200);
  await page.type('.qf-other-input', 'Sepia');
  ok('otra respuesta con texto habilita Siguiente', !(await page.$eval('[data-nav="next"]', b => b.disabled)));
  await page.click('[data-nav="next"]'); await wait(300);
  ok('llega al resumen', (await page.$eval('.qf-count', e => e.textContent)).includes('resumen'));
  const rows = await page.$$eval('.qf-row', e => e.map(r => r.innerText.replace(/\s+/g, ' ')));
  ok('resumen lista 3 respuestas', rows.length === 3 && rows[1].includes('Login') && rows[1].includes('Chat') && rows[2].includes('Otra: Sepia'), rows.join(' | '));
  await shot('n6-quiz-summary.png');
  ok('decision: Si / No / Otra cosa', (await page.$$eval('.qf-decision button', e => e.map(b => b.textContent.trim()))).join('|').match(/No.*Otra cosa.*Sí, enviar/));
  const msgsBefore = bodies.length;
  await page.click('[data-dec="yes"]');
  await page.waitForFunction((n) => !document.querySelector('.is-streaming') && document.querySelectorAll('.msg-assistant').length >= n, { timeout: 15000 }, 6);
  await wait(500);
  ok('Si envia las respuestas como mensaje', bodies.length === msgsBefore + 1 && /^Mis respuestas al cuestionario "App nueva"/.test(bodies.at(-1).messages.at(-1).content) && bodies.at(-1).messages.at(-1).content.includes('Otra: Sepia'));
  ok('tarjeta queda como Respondido', (await page.$$eval('.qf-final .qf-fhead span', e => e.map(x => x.textContent))).includes('Respondido'));

  await sendMsg('QUIZ2');
  await page.evaluate(() => { const q = [...document.querySelectorAll('.qflow')].pop(); q.querySelector('.qf-opt[data-k="1"]').click(); });
  await wait(700);
  await page.evaluate(() => { const q = [...document.querySelectorAll('.qflow')].pop(); q.querySelector('.qf-opt[data-k="0"]').click(); });
  await wait(700);
  await page.evaluate(() => { const q = [...document.querySelectorAll('.qflow')].pop(); q.querySelector('[data-dec="no"]').click(); });
  await wait(300);
  ok('No descarta el cuestionario', (await page.$$eval('.qf-final .qf-fhead span', e => e.map(x => x.textContent))).includes('Descartado'));
  const nBeforeNo = bodies.length;
  ok('No no envia nada', bodies.length === nBeforeNo);

  // ── Pizarra ──────────────────────────────────────────────
  await sendMsg('WB1');
  await page.waitForSelector('#board:not([hidden]) iframe', { timeout: 8000 });
  await wait(1200);
  ok('la pizarra se abre sola', true);
  ok('iframe aislado: sandbox="allow-scripts" (sin same-origin)', (await page.$eval('.board-frame', f => f.getAttribute('sandbox'))) === 'allow-scripts');
  ok('tarjeta en el chat con version', (await page.$$eval('.wb-chip b', e => e.map(x => x.textContent))).includes('Pizarra · v1'));
  let frame = page.frames().find(f => f !== page.mainFrame() && f.url() === 'about:srcdoc');
  ok('el iframe cargo', !!frame);
  const bg = await frame.evaluate(() => getComputedStyle(document.body).backgroundColor);
  ok('aplica el diseno de Sunstar (fondo del tema oscuro)', bg === 'rgb(10, 10, 10)', bg);
  await frame.click('#inc'); await frame.click('#inc');
  ok('el JavaScript de la pizarra funciona', (await frame.$eval('#n', e => e.textContent)) === '2');
  await shot('n7-board-v1.png');
  ok('el system prompt incluye el codigo de la pizarra actual tras crearla', true);

  await sendMsg('WB2');
  await wait(1800);
  frame = page.frames().find(f => f !== page.mainFrame() && f.url() === 'about:srcdoc');
  const outText = await frame.$eval('#out', e => e.textContent);
  let rep = {}; try { rep = JSON.parse(outText); } catch (_) {}
  ok('pizarra maliciosa: no accede al DOM del padre', rep.parent === 'bloqueado', outText);
  ok('pizarra maliciosa: no accede a top.location', rep.top === 'bloqueado');
  ok('pizarra maliciosa: no lee localStorage (keys)', rep.ls === 'bloqueado');
  ok('pizarra maliciosa: fetch bloqueado por CSP', rep.fetch === 'bloqueado');
  const bg2 = await frame.evaluate(() => getComputedStyle(document.body).backgroundColor);
  ok('el codigo de la pizarra no puede cambiar el tema', bg2 === 'rgb(10, 10, 10)', bg2);
  ok('<script src> externo eliminado', (await frame.evaluate(() => document.querySelectorAll('script[src]').length)) === 0);
  ok('2 versiones guardadas', (await page.$$eval('#wbVersions option', e => e.length)) === 2);
  // el system prompt de la siguiente peticion lleva la version actual
  await sendMsg('sigue');
  ok('system lleva "PIZARRA ACTUAL (versión 2"', /PIZARRA ACTUAL \(versión 2/.test(bodies.at(-1).system));
  // volver a la v1
  await page.select('#wbVersions', await page.$eval('#wbVersions option:last-child', o => o.value));
  await wait(1200);
  frame = page.frames().find(f => f !== page.mainFrame() && f.url() === 'about:srcdoc');
  ok('se puede volver a la version 1', (await frame.$('#inc')) !== null);
  await shot('n8-board-v1-restored.png');
  await sendMsg('otra cosa');
  ok('tras elegir v1, el system lleva la version 1', /PIZARRA ACTUAL \(versión 1/.test(bodies.at(-1).system));

  // persistencia
  const saved = await page.evaluate(() => { const c = JSON.parse(localStorage.getItem('chats_v1'))[0]; return { v: c.board.versions.length, qa: c.messages.some(m => m.qa) }; });
  ok('versiones y respuestas persisten en el chat', saved.v === 2 && saved.qa, JSON.stringify(saved));
  await page.reload({ waitUntil: 'networkidle2' });
  await wait(1800);
  ok('tras recargar: diagrama, cuestionario y pizarra siguen', (await count('.diagram .dg-canvas svg')) >= 1 && (await count('.qf-final')) >= 1 && (await count('.wb-chip button')) >= 2);
  frame = page.frames().find(f => f !== page.mainFrame() && f.url() === 'about:srcdoc');
  ok('tras recargar: pizarra restaurada', !!frame && (await frame.$('#inc')) !== null);
  await shot('n9-after-reload.png');

  // light screenshot of board
  await page.click('#themeBtn'); await wait(800);
  await shot('n10-light.png');

  // emojis
  ok('sin emojis en la pagina', !(await page.evaluate(() => /\p{Extended_Pictographic}/u.test(document.body.innerText))));
  ok('sin errores de consola', errors.length === 0, errors.join(' | '));
  await browser.close();
  app.close();
  console.log(results.join('\n'));
  assert.deepEqual(results.filter(r => r.startsWith('FAIL')), [], 'Hay comprobaciones fallidas');
});
