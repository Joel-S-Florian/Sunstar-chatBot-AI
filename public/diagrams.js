/**
 * Diagramas Mermaid.
 * Un bloque ```mermaid (o un bloque sin lenguaje que empiece como un diagrama) se
 * muestra con las pestañas Vista | Código, y un visor a pantalla completa con
 * zoom y desplazamiento. La vista se dibuja al terminar el mensaje.
 */
(() => {
  const DIAGRAM_RE = /^\s*(%%\{[\s\S]*?\}%%\s*)?(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram(-v2)?|erDiagram|gantt|pie|journey|mindmap|timeline|gitGraph|quadrantChart|requirementDiagram|C4\w+|sankey-beta|xychart-beta|block-beta|architecture-beta|packet-beta)\b/;
  const isDiagram = (lang, code) => lang === 'mermaid' || lang === 'mmd' || ((lang === 'text' || lang === '') && DIAGRAM_RE.test(code));

  const FONT = "Geist, system-ui, 'Segoe UI', sans-serif";

  function mermaidConfig() {
    const dark = Theme.resolved === 'dark';
    return {
      startOnLoad: false,
      securityLevel: 'strict',
      theme: 'base',
      fontFamily: FONT,
      flowchart: { htmlLabels: true, curve: 'basis', padding: 14 },
      themeVariables: dark ? {
        darkMode: true, background: '#0a0a0a', fontFamily: FONT,
        primaryColor: '#1b1b1b', primaryTextColor: '#ededed', primaryBorderColor: '#4c9aff',
        secondaryColor: '#141414', tertiaryColor: '#0f0f0f', lineColor: '#8a8a8a',
        noteBkgColor: '#1b1b1b', noteTextColor: '#ededed', edgeLabelBackground: '#0a0a0a',
        clusterBkg: '#111111', clusterBorder: '#333333', titleColor: '#ededed',
      } : {
        background: '#ffffff', fontFamily: FONT,
        primaryColor: '#f5f5f5', primaryTextColor: '#171717', primaryBorderColor: '#0969da',
        secondaryColor: '#fafafa', tertiaryColor: '#ffffff', lineColor: '#6b7280',
        noteBkgColor: '#fff8c5', noteTextColor: '#171717', edgeLabelBackground: '#ffffff',
        clusterBkg: '#fafafa', clusterBorder: '#d4d4d4', titleColor: '#171717',
      },
    };
  }

  let seq = 0;
  async function draw(code) {
    if (typeof mermaid === 'undefined') throw new Error('Mermaid no se pudo cargar (¿sin conexión a internet?).');
    mermaid.initialize(mermaidConfig());
    const id = `mmd${++seq}`;
    try {
      const { svg } = await mermaid.render(id, code.trim());
      return svg;
    } finally {
      document.getElementById(`d${id}`)?.remove();   // Mermaid deja un nodo de error si falla
    }
  }

  function setView(box, view) {
    box.dataset.view = view;
    box.querySelectorAll('.dg-tab').forEach(t => t.classList.toggle('on', t.dataset.view === view));
  }

  async function renderBox(box, code) {
    const canvas = box.querySelector('.dg-canvas');
    if (!canvas || !code) return;
    try {
      const svg = await draw(code);
      box._svg = svg;
      canvas.innerHTML = svg;
      canvas.classList.add('ready');
      if (box.dataset.view !== 'code' || !box._userChoseCode) setView(box, 'preview');
    } catch (err) {
      canvas.classList.remove('ready');
      canvas.innerHTML = '';
      const msg = document.createElement('div');
      msg.className = 'dg-error';
      msg.innerHTML = `${App.ico('alert', 16)}<div><b>No se pudo dibujar el diagrama</b><span></span></div>`;
      msg.querySelector('span').textContent = String(err.message || err).split('\n')[0];
      canvas.appendChild(msg);
      setView(box, 'code');
    }
  }

  /* ── Marcado del bloque ─────────────────────────────────── */

  Ext.codeHandlers.push({
    render(lang, code, key, ctx) {
      if (!isDiagram(lang, code)) return null;
      const view = ctx.partial ? 'code' : 'preview';
      const tab = (v, icon, label) =>
        `<button class="dg-tab${view === v ? ' on' : ''}" data-view="${v}" role="tab">${App.ico(icon, 13)}<span>${label}</span></button>`;
      return `<div class="code-block diagram" data-key="${key}" data-view="${view}">
  <div class="code-head">
    <span class="code-lang">mermaid</span>
    <span class="spacer"></span>
    <div class="dg-tabs" role="tablist">${tab('preview', 'eye', 'Vista')}${tab('code', 'code', 'Código')}</div>
    <button class="dg-full" title="Pantalla completa" aria-label="Pantalla completa">${App.ico('maximize', 14)}</button>
    <button class="copy-btn" data-code="${key}">${App.ico('copy', 13)}<span>Copiar</span></button>
  </div>
  <div class="dg-view"><div class="dg-canvas"><span class="dg-loading"><i></i><i></i><i></i></span></div></div>
  <pre class="dg-code"><code>${App.escHtml(code)}</code></pre>
</div>`;
    },
  });

  Ext.hydrators.push((el) => {
    el.querySelectorAll('.diagram').forEach(box => renderBox(box, el._code[box.dataset.key]));
  });

  Ext.clickHandlers.push((e) => {
    const tab = e.target.closest('.dg-tab');
    if (tab) {
      const box = tab.closest('.diagram');
      box._userChoseCode = tab.dataset.view === 'code';
      setView(box, tab.dataset.view);
      return true;
    }
    const full = e.target.closest('.dg-full');
    if (full) { openViewer(full.closest('.diagram')); return true; }
    return false;
  });

  // Doble clic sobre el diagrama también lo abre a pantalla completa
  document.addEventListener('dblclick', (e) => {
    const canvas = e.target.closest('.dg-canvas.ready');
    if (canvas) openViewer(canvas.closest('.diagram'));
  });

  // Redibuja al cambiar el tema (los colores de Mermaid van dentro del SVG)
  document.addEventListener('themechange', () => {
    document.querySelectorAll('.msg .diagram').forEach(box => {
      const code = box.closest('.msg')?._code?.[box.dataset.key];
      if (code && box._svg) renderBox(box, code);
    });
  });

  /* ── Visor a pantalla completa (zoom + desplazamiento) ──── */

  let viewer = null;
  const st = { s: 1, x: 0, y: 0, w: 0, h: 0 };
  const clamp = (v, a, b) => Math.min(Math.max(v, a), b);

  function buildViewer() {
    const o = document.createElement('div');
    o.className = 'dg-overlay';
    o.hidden = true;
    o.innerHTML = `
      <div class="dg-bar">
        <span class="dg-title">${App.ico('workflow', 16)}<b>Diagrama</b></span>
        <span class="spacer"></span>
        <button class="icon-btn" data-z="out" title="Alejar (-)">${App.ico('zoom-out', 16)}</button>
        <span class="dg-zoom" data-z="label">100%</span>
        <button class="icon-btn" data-z="in" title="Acercar (+)">${App.ico('zoom-in', 16)}</button>
        <button class="icon-btn" data-z="fit" title="Ajustar (0)">${App.ico('fit', 16)}</button>
        <button class="icon-btn" data-z="svg" title="Descargar SVG">${App.ico('download', 16)}</button>
        <button class="icon-btn" data-z="close" title="Cerrar (Esc)">${App.ico('x', 16)}</button>
      </div>
      <div class="dg-stage"><div class="dg-pan"></div></div>
      <div class="dg-hint">Arrastra para mover · rueda para zoom · doble clic para ajustar · Esc para salir</div>`;
    document.body.appendChild(o);

    const stage = o.querySelector('.dg-stage');
    const pan = o.querySelector('.dg-pan');
    const label = o.querySelector('[data-z="label"]');

    const apply = () => {
      pan.style.transform = `translate(${st.x}px, ${st.y}px) scale(${st.s})`;
      label.textContent = Math.round(st.s * 100) + '%';
    };
    const fit = () => {
      const r = stage.getBoundingClientRect();
      const pad = 56;
      const s = clamp(Math.min((r.width - pad * 2) / st.w, (r.height - pad * 2) / st.h), 0.1, 2.5);
      st.s = s; st.x = (r.width - st.w * s) / 2; st.y = (r.height - st.h * s) / 2;
      apply();
    };
    const zoomAt = (f, cx, cy) => {
      const ns = clamp(st.s * f, 0.1, 8), k = ns / st.s;
      st.x = cx - (cx - st.x) * k; st.y = cy - (cy - st.y) * k; st.s = ns;
      apply();
    };
    const center = () => { const r = stage.getBoundingClientRect(); return [r.width / 2, r.height / 2]; };

    stage.addEventListener('wheel', (e) => {
      e.preventDefault();
      const r = stage.getBoundingClientRect();
      zoomAt(e.deltaY < 0 ? 1.12 : 1 / 1.12, e.clientX - r.left, e.clientY - r.top);
    }, { passive: false });

    let drag = null;
    stage.addEventListener('pointerdown', (e) => { drag = { x: e.clientX - st.x, y: e.clientY - st.y }; stage.setPointerCapture(e.pointerId); stage.classList.add('grab'); });
    stage.addEventListener('pointermove', (e) => { if (drag) { st.x = e.clientX - drag.x; st.y = e.clientY - drag.y; apply(); } });
    stage.addEventListener('pointerup',   (e) => { drag = null; stage.releasePointerCapture(e.pointerId); stage.classList.remove('grab'); });
    stage.addEventListener('dblclick', fit);

    o.addEventListener('click', (e) => {
      const b = e.target.closest('[data-z]');
      if (!b) return;
      const z = b.dataset.z;
      if (z === 'close') closeViewer();
      else if (z === 'in')  zoomAt(1.25, ...center());
      else if (z === 'out') zoomAt(1 / 1.25, ...center());
      else if (z === 'fit') fit();
      else if (z === 'svg') {
        const svg = pan.querySelector('svg');
        if (!svg) return;
        const xml = new XMLSerializer().serializeToString(svg);
        const url = URL.createObjectURL(new Blob([xml], { type: 'image/svg+xml' }));
        const a = Object.assign(document.createElement('a'), { href: url, download: 'diagrama.svg' });
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
    });

    document.addEventListener('keydown', (e) => {
      if (o.hidden) return;
      if (e.key === 'Escape') { e.stopPropagation(); closeViewer(); }
      else if (e.key === '+' || e.key === '=') zoomAt(1.25, ...center());
      else if (e.key === '-') zoomAt(1 / 1.25, ...center());
      else if (e.key === '0') fit();
    }, true);

    window.addEventListener('resize', () => { if (!o.hidden) fit(); });
    return { el: o, pan, fit };
  }

  function openViewer(box) {
    if (!box || !box._svg) return;
    if (!viewer) viewer = buildViewer();
    viewer.pan.innerHTML = box._svg;
    const svg = viewer.pan.querySelector('svg');
    // tamaño natural del dibujo (Mermaid lo entrega con width="100%")
    const vb = svg.viewBox?.baseVal;
    st.w = vb && vb.width ? vb.width : svg.getBBox().width;
    st.h = vb && vb.height ? vb.height : svg.getBBox().height;
    svg.removeAttribute('style');
    svg.setAttribute('width', st.w);
    svg.setAttribute('height', st.h);
    viewer.el.hidden = false;
    document.body.classList.add('dg-open');
    requestAnimationFrame(() => viewer.fit());
  }

  function closeViewer() {
    if (!viewer) return;
    viewer.el.hidden = true;
    document.body.classList.remove('dg-open');
  }
})();
