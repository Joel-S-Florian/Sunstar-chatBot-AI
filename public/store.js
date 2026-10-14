/**
 * Persistencia en el navegador.
 *  - ChatStore: conversaciones (localStorage)
 *  - Vault:     API keys, con tres modos de almacenamiento:
 *      session -> sessionStorage (se borra al cerrar la pestaña)
 *      device  -> localStorage   (sin cifrar)
 *      locked  -> localStorage cifrado con AES-GCM (clave derivada con PBKDF2)
 */

const safe = {
  get(store, k)    { try { return store.getItem(k); } catch (_) { return null; } },
  set(store, k, v) { try { store.setItem(k, v); return true; } catch (_) { return false; } },
  del(store, k)    { try { store.removeItem(k); } catch (_) {} },
};

/* ── Chats ─────────────────────────────────────────────────── */

const ChatStore = {
  KEY: 'chats_v1',
  load() {
    try {
      const list = JSON.parse(safe.get(localStorage, this.KEY) || '[]');
      return Array.isArray(list) ? list : [];
    } catch (_) { return []; }
  },
  save(list) { return safe.set(localStorage, this.KEY, JSON.stringify(list)); },
  clear()    { safe.del(localStorage, this.KEY); },
};

/* ── Cifrado ───────────────────────────────────────────────── */

const b64   = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const unb64 = (s)   => Uint8Array.from(atob(s), c => c.charCodeAt(0));

async function deriveKey(pass, salt) {
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(pass), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 250000, hash: 'SHA-256' },
    base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}

async function encryptJson(obj, pass) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv   = crypto.getRandomValues(new Uint8Array(12));
  const key  = await deriveKey(pass, salt);
  const ct   = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(JSON.stringify(obj)));
  return JSON.stringify({ s: b64(salt), i: b64(iv), d: b64(ct) });
}

async function decryptJson(str, pass) {
  const { s, i, d } = JSON.parse(str);
  const key = await deriveKey(pass, unb64(s));
  const pt  = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(i) }, key, unb64(d));
  return JSON.parse(new TextDecoder().decode(pt));
}

/* ── Vault de API keys ─────────────────────────────────────── */

const Vault = (() => {
  const MODE = 'key_mode', PLAIN = 'keys', ENC = 'keys_enc';
  const PROVIDERS = PROVIDER_IDS;

  let mode   = 'device';
  let keys   = {};
  let pass   = null;      // contraseña en memoria mientras está desbloqueado
  let locked = false;

  const canEncrypt = () => !!(window.crypto && crypto.subtle);

  function wipeStores() {
    safe.del(sessionStorage, PLAIN);
    safe.del(localStorage,   PLAIN);
    safe.del(localStorage,   ENC);
  }

  async function persist() {
    if (locked) return;   // no sobrescribir lo cifrado sin conocer la contraseña
    if (mode === 'session') {
      safe.del(localStorage, PLAIN); safe.del(localStorage, ENC);
      safe.set(sessionStorage, PLAIN, JSON.stringify(keys));
    } else if (mode === 'device') {
      safe.del(sessionStorage, PLAIN); safe.del(localStorage, ENC);
      safe.set(localStorage, PLAIN, JSON.stringify(keys));
    } else if (mode === 'locked' && pass) {
      safe.del(sessionStorage, PLAIN); safe.del(localStorage, PLAIN);
      safe.set(localStorage, ENC, await encryptJson(keys, pass));
    }
  }

  function readPlain(store) {
    try { return { ...JSON.parse(safe.get(store, PLAIN) || '{}') }; }
    catch (_) { return {}; }
  }

  return {
    PROVIDERS,
    get mode()   { return mode; },
    get locked() { return locked; },
    canEncrypt,

    init() {
      mode = safe.get(localStorage, MODE) || 'device';

      // Migración desde la versión anterior (key_claude / key_gemini)
      const old = {};
      PROVIDERS.forEach(p => { const v = safe.get(localStorage, `key_${p}`); if (v) old[p] = v; safe.del(localStorage, `key_${p}`); });

      if (mode === 'locked' && safe.get(localStorage, ENC)) {
        locked = true;
      } else {
        if (mode === 'locked') mode = 'device';   // no hay datos cifrados: vuelve al modo simple
        keys = readPlain(mode === 'session' ? sessionStorage : localStorage);
        if (Object.keys(old).length) { keys = { ...keys, ...old }; persist(); }
      }
      safe.set(localStorage, MODE, mode);
      return { locked };
    },

    get(p)    { return keys[p] || ''; },
    set(p, v) { keys[p] = v.trim(); return persist(); },

    async unlock(passphrase) {
      keys = { ...(await decryptJson(safe.get(localStorage, ENC), passphrase)) };
      pass = passphrase;
      locked = false;
      return true;
    },

    /** Cambia el modo de almacenamiento. Para 'locked' exige contraseña. */
    async setMode(newMode, passphrase) {
      if (locked) throw new Error('Desbloquea las keys primero.');
      if (newMode === 'locked') {
        if (!canEncrypt()) throw new Error('El cifrado no está disponible en este navegador (requiere localhost o HTTPS).');
        if (!passphrase || passphrase.length < 6) throw new Error('La contraseña debe tener al menos 6 caracteres.');
        pass = passphrase;
      } else {
        pass = null;
      }
      wipeStores();
      mode = newMode;
      safe.set(localStorage, MODE, mode);
      await persist();
    },

    /** Borra todas las keys de memoria y de los almacenes. */
    clear() {
      keys = {};
      pass = null; locked = false;
      wipeStores();
      if (mode === 'locked') { mode = 'device'; safe.set(localStorage, MODE, mode); }
    },
  };
})();
