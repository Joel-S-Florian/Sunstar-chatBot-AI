const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const puppeteer = require('puppeteer-core');
const { browserPath, startApp, skipReason, shotsDir } = require('./_env');
const wait = (ms) => new Promise(r => setTimeout(r, ms));
const results = [];
const ok = (name, cond, extra = '') => results.push(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra ? '  ' + extra : ''}`);

test('UI: chats, cifrado de keys, formato y temas', { skip: skipReason(), timeout: 180000 }, async () => {
  const app = await startApp();
  const errors = [];
  const browser = await puppeteer.launch({
    executablePath: browserPath(),
    headless: 'new', args: ['--no-sandbox'], defaultViewport: { width: 1280, height: 820 },
  });
  const page = await browser.newPage();
  const shot = async (name) => { if (shotsDir) await page.screenshot({ path: path.join(shotsDir, name) }); };
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('console.error: ' + m.text()); });

  await page.setRequestInterception(true);
  page.on('request', req => {
    const u = req.url();
    if (u.endsWith('/api/check')) return req.respond({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, ms: 5, models: ['gemini-2.5-flash'] }) });
    if (u.includes('/api/chat/')) {
      const text = ':::warning Ojo\nRevisa la {color:rojo}version{/color} y ==resalta== esto.\n:::\n\nTexto con `codigo` y **negrita**.';
      return req.respond({ status: 200, contentType: 'text/event-stream', body: 'data: ' + JSON.stringify({ token: text }) + '\n\ndata: [DONE]\n\n' });
    }
    req.continue();
  });

  await page.evaluateOnNewDocument(() => {
    try { if (!sessionStorage.getItem('seeded')) {
      localStorage.clear();
      localStorage.setItem('keys', JSON.stringify({ claude: '', gemini: 'AIzaFAKEKEYFAKEKEYFAKEKEYFAKE' }));
      localStorage.setItem('sel', JSON.stringify({ provider: 'gemini', model: 'gemini-2.5-flash' }));
      localStorage.setItem('theme', 'light');
      sessionStorage.setItem('seeded', '1');
    } } catch (_) { /* iframe aislado de la pizarra */ }
  });

  await page.goto(app.base, { waitUntil: 'networkidle2' });

  // 1) formato dentro de cajas
  await page.type('#userInput', 'hola');
  await page.keyboard.press('Enter');
  await wait(1200);
  ok('callout renderiza color rojo', !!(await page.$('.callout .c-red')));
  ok('callout renderiza resaltado', !!(await page.$('.callout mark')));
  ok('callout tiene icono SVG (sin emoji)', !!(await page.$('.callout-title svg')));
  const inlineCode = await page.$eval('.msg-assistant .msg-content p code', c => getComputedStyle(c).backgroundColor);
  ok('codigo en linea con fondo propio en tema claro', inlineCode !== 'rgba(0, 0, 0, 0)', inlineCode);

  // 2) renombrar chat
  await page.hover('.chat-item');
  await page.click('.chat-item [data-act="rename"]');
  await page.$eval('.chat-rename', i => { i.value = ''; });
  await page.type('.chat-rename', 'Mi chat renombrado');
  await page.keyboard.press('Enter');
  await wait(200);
  ok('renombrar chat', (await page.$eval('.chat-name', e => e.textContent)) === 'Mi chat renombrado');
  ok('titulo persistido', (await page.evaluate(() => JSON.parse(localStorage.getItem('chats_v1'))[0].title)) === 'Mi chat renombrado');

  // 3) cifrado de keys
  const enc = await page.evaluate(async () => {
    await Vault.setMode('locked', 'secreto123');
    return { plain: localStorage.getItem('keys'), enc: !!localStorage.getItem('keys_enc'), mode: localStorage.getItem('key_mode'), leaks: (localStorage.getItem('keys_enc') || '').includes('AIza') };
  });
  ok('modo locked guarda cifrado y borra texto plano', enc.enc && enc.plain === null && enc.mode === 'locked' && !enc.leaks);

  await page.reload({ waitUntil: 'networkidle2' });
  await wait(400);
  ok('al recargar pide contraseña', await page.$eval('#lockModal', m => !m.hidden));
  await page.type('#unlockPass', 'incorrecta');
  await page.keyboard.press('Enter');
  await wait(1200);
  ok('contraseña incorrecta rechazada', (await page.$eval('#unlockErr', e => e.textContent)).includes('incorrecta') && (await page.$eval('#lockModal', m => !m.hidden)));
  await page.$eval('#unlockPass', i => { i.value = ''; });
  await page.type('#unlockPass', 'secreto123');
  await page.keyboard.press('Enter');
  await wait(1500);
  ok('contraseña correcta desbloquea', await page.$eval('#lockModal', m => m.hidden));
  ok('key recuperada tras desbloqueo', (await page.evaluate(() => Vault.get('gemini'))).startsWith('AIza'));
  ok('el chat sigue ahi tras recargar', (await page.$$eval('.msg', e => e.length)) >= 2);

  // 4) modo sesion
  await page.evaluate(async () => { await Vault.setMode('session'); });
  const ses = await page.evaluate(() => ({ ls: localStorage.getItem('keys'), enc: localStorage.getItem('keys_enc'), ss: !!sessionStorage.getItem('keys') }));
  ok('modo sesion: solo sessionStorage', ses.ls === null && ses.enc === null && ses.ss);

  // 5) borrar chat (doble clic de confirmacion)
  await page.hover('.chat-item');
  await page.click('.chat-item [data-act="delete"]');
  await page.click('.chat-item [data-act="delete"]');
  await wait(300);
  ok('borrar chat', (await page.evaluate(() => JSON.parse(localStorage.getItem('chats_v1')).length)) === 0 && !(await page.$('.chat-item')));

  // 6) emojis en la UI
  const emoji = await page.evaluate(() => /\p{Extended_Pictographic}/u.test(document.body.innerText));
  ok('sin emojis en el texto de la pagina', !emoji);

  ok('sin errores de consola', errors.length === 0, errors.join(' | '));
  await browser.close();
  app.close();
  console.log(results.join('\n'));
  assert.deepEqual(results.filter(r => r.startsWith('FAIL')), [], 'Hay comprobaciones fallidas');
});
