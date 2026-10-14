/**
 * Utilidades para las pruebas de interfaz (npm run test:ui).
 * Usan puppeteer-core con un navegador ya instalado: Brave, Chrome o Chromium.
 * Variables: BROWSER_PATH (ruta del ejecutable) y UI_SHOTS (carpeta donde guardar capturas).
 */
const http = require('node:http');
const fs   = require('node:fs');
const path = require('node:path');

const CANDIDATES = [
  process.env.BROWSER_PATH,
  'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  '/usr/bin/brave-browser', '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
  '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
];

const browserPath = () => CANDIDATES.find(p => p && fs.existsSync(p));

async function startApp() {
  const app = require('../../server.js');
  const srv = http.createServer(app);
  await new Promise(r => srv.listen(0, r));
  return {
    base: `http://127.0.0.1:${srv.address().port}/`,
    close: () => { srv.closeAllConnections?.(); srv.close(); },
  };
}

const skipReason = () => (browserPath() ? false : 'No se encontró un navegador. Define BROWSER_PATH con la ruta de Brave/Chrome.');

module.exports = { browserPath, startApp, skipReason, shotsDir: process.env.UI_SHOTS && path.resolve(process.env.UI_SHOTS) };
