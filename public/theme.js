/**
 * Tema: solo claro u oscuro (o seguir al sistema).
 * El tema real se refleja en <html data-theme="light|dark">.
 */
const Theme = (() => {
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  let pref = 'system';
  try { pref = localStorage.getItem('theme') || 'system'; } catch (_) {}

  const resolved = () => (pref === 'system' ? (mq.matches ? 'dark' : 'light') : pref);

  function apply() {
    const r = resolved();
    document.documentElement.dataset.theme = r;
    // La hoja de resaltado de código debe coincidir con el tema
    const light = document.getElementById('hljs-light');
    const dark  = document.getElementById('hljs-dark');
    if (light) light.disabled = r !== 'light';
    if (dark)  dark.disabled  = r !== 'dark';
    document.dispatchEvent(new CustomEvent('themechange', { detail: { pref, resolved: r } }));
  }

  mq.addEventListener('change', () => { if (pref === 'system') apply(); });

  return {
    get pref() { return pref; },
    get resolved() { return resolved(); },
    set(p) {
      if (!['light', 'dark', 'system'].includes(p)) return false;
      pref = p;
      try { localStorage.setItem('theme', p); } catch (_) {}
      apply();
      return true;
    },
    toggle() { this.set(resolved() === 'dark' ? 'light' : 'dark'); },
    apply,
  };
})();
