/**
 * Cuestionarios interactivos.
 * El modelo responde con un bloque ```preguntas (JSON) y la interfaz muestra un
 * asistente paso a paso. Al final hay un resumen y el usuario decide:
 * Sí (enviar), No (descartar) u Otra cosa (enviar con una nota propia).
 */
(() => {
  const LANGS = new Set(['preguntas', 'cuestionario', 'questions', 'quiz']);

  const QUESTIONS_PROMPT = `CUESTIONARIOS INTERACTIVOS: cuando falte información importante antes de actuar, o el usuario te pida que le hagas preguntas, NO las escribas como texto. Responde con un bloque de código de lenguaje "preguntas" que contenga JSON válido con este formato exacto:
{"title":"Título breve","questions":[{"question":"¿Texto de la pregunta?","multi":false,"options":[{"label":"Opción","description":"Detalle opcional"}]}]}
Reglas: entre 2 y 6 preguntas; de 2 a 5 opciones por pregunta; "multi": true solo si se pueden elegir varias; no agregues la opción "Otra" (la interfaz ya la incluye); escribe una frase corta antes del bloque y nada después. Cuando el usuario responda, continúa con sus decisiones. Úsalo solo cuando realmente haga falta.`;

  Ext.systemParts.push(() => QUESTIONS_PROMPT);

  /* ── Lectura tolerante del JSON ─────────────────────────── */

  function parseSpec(code) {
    let data;
    try { data = JSON.parse(code.trim()); } catch (_) { return null; }
    if (Array.isArray(data)) data = { questions: data };
    const raw = data?.questions || data?.preguntas;
    if (!Array.isArray(raw)) return null;

    const questions = raw.slice(0, 8).map(q => {
      const text = q?.question || q?.pregunta || q?.q;
      const opts = (q?.options || q?.opciones || []).slice(0, 8).map(o =>
        typeof o === 'string' ? { label: o, description: '' }
          : { label: o?.label || o?.etiqueta || o?.name || '', description: o?.description || o?.descripcion || o?.desc || '' });
      const multi = q?.multi === true || q?.multiple === true || q?.tipo === 'multiple';
      return { question: String(text || ''), multi, options: opts.filter(o => o.label) };
    }).filter(q => q.question && q.options.length);

    return questions.length ? { title: String(data.title || data.titulo || ''), questions } : null;
  }

  const esc = (s) => App.escHtml(s);

  /* ── Marcado del bloque ─────────────────────────────────── */

  Ext.codeHandlers.push({
    render(lang, code, key, ctx) {
      if (!LANGS.has(lang)) return null;
      return `<div class="qflow" data-key="${key}" data-idx="${ctx.index('q')}"><div class="qf-loading"><span class="thinking"><i></i><i></i><i></i></span>Preparando cuestionario</div></div>`;
    },
  });

  Ext.hydrators.push((el, msg, chat) => {
    el.querySelectorAll('.qflow').forEach(box => {
      const idx  = +box.dataset.idx;
      const spec = parseSpec(el._code[box.dataset.key] || '');
      if (!spec) {
        box.innerHTML = `<div class="qf-error">${App.ico('alert', 16)}<span>No se pudo leer el cuestionario.</span></div>`;
        return;
      }
      mount(box, spec, msg, idx, chat);
    });
  });

  /* ── Asistente paso a paso ──────────────────────────────── */

  function mount(box, spec, msg, idx, chat) {
    const n = spec.questions.length;
    const saved = msg.qa?.[idx];
    if (saved) return renderSaved(box, spec, saved, () => { delete msg.qa[idx]; App.saveChat(chat); mount(box, spec, msg, idx, chat); });

    const ans = spec.questions.map(() => ({ sel: new Set(), otherOn: false, other: '' }));
    let step = 0;
    let mode = 'ask';   // 'ask' | 'other-note'

    const answered = (i) => ans[i].sel.size > 0 || (ans[i].otherOn && ans[i].other.trim() !== '');
    const answerText = (i) => {
      const q = spec.questions[i], a = ans[i];
      const parts = [...a.sel].sort((x, y) => x - y).map(k => q.options[k].label);
      if (a.otherOn && a.other.trim()) parts.push(`Otra: ${a.other.trim()}`);
      return parts.join(', ');
    };

    function dots() {
      return `<div class="qf-dots">${spec.questions.map((_, i) => `<i class="${i === step ? 'cur' : answered(i) ? 'done' : ''}"></i>`).join('')}<i class="${step === n ? 'cur' : ''}"></i></div>`;
    }

    function renderAsk() {
      const q = spec.questions[step], a = ans[step];
      const opts = q.options.map((o, k) => `
        <button class="qf-opt${a.sel.has(k) ? ' on' : ''}" data-k="${k}" role="${q.multi ? 'checkbox' : 'radio'}" aria-checked="${a.sel.has(k)}">
          <span class="qf-mark ${q.multi ? 'sq' : ''}">${App.ico('check', 12)}</span>
          <span class="qf-txt"><b>${esc(o.label)}</b>${o.description ? `<small>${esc(o.description)}</small>` : ''}</span>
        </button>`).join('');
      box.innerHTML = `
        <div class="qf-card">
          <div class="qf-head"><span class="qf-count">${esc(spec.title || 'Cuestionario')} · pregunta ${step + 1} de ${n}</span>${dots()}</div>
          <div class="qf-body enter">
            <h4 class="qf-q">${esc(q.question)}</h4>
            ${q.multi ? '<p class="qf-hint">Puedes elegir varias.</p>' : ''}
            <div class="qf-opts">
              ${opts}
              <button class="qf-opt qf-other-opt${a.otherOn ? ' on' : ''}" data-k="other" role="${q.multi ? 'checkbox' : 'radio'}" aria-checked="${a.otherOn}">
                <span class="qf-mark ${q.multi ? 'sq' : ''}">${App.ico('check', 12)}</span>
                <span class="qf-txt"><b>Otra respuesta</b></span>
              </button>
              ${a.otherOn ? `<input class="field qf-other-input" type="text" placeholder="Escribe tu respuesta" value="${esc(a.other)}" maxlength="200" />` : ''}
            </div>
          </div>
          <div class="qf-nav">
            <button class="btn" data-nav="back" ${step === 0 ? 'disabled' : ''}>${App.ico('chevron-left', 14)}Atrás</button>
            <span class="spacer"></span>
            <button class="btn primary" data-nav="next" ${answered(step) ? '' : 'disabled'}>${step === n - 1 ? 'Revisar' : 'Siguiente'}${App.ico('chevron-right', 14)}</button>
          </div>
        </div>`;
      box.querySelector('.qf-other-input')?.focus();
    }

    function renderSummary() {
      const rows = spec.questions.map((q, i) => `
        <div class="qf-row">
          <span class="qf-rn">${i + 1}</span>
          <div><b>${esc(q.question)}</b><span>${esc(answerText(i))}</span></div>
          <button class="qf-edit" data-edit="${i}">Editar</button>
        </div>`).join('');
      box.innerHTML = `
        <div class="qf-card">
          <div class="qf-head"><span class="qf-count">${esc(spec.title || 'Cuestionario')} · resumen</span>${dots()}</div>
          <div class="qf-body enter">
            <div class="qf-rows">${rows}</div>
            ${mode === 'other-note'
              ? `<textarea class="field qf-note" rows="3" maxlength="600" placeholder="Escribe qué prefieres hacer o añadir..."></textarea>`
              : ''}
          </div>
          <div class="qf-decision">
            <span>¿Enviar estas respuestas?</span>
            <span class="spacer"></span>
            ${mode === 'other-note'
              ? `<button class="btn" data-dec="back">Volver</button><button class="btn primary" data-dec="send-note">${App.ico('arrow-up', 14)}Enviar con mi nota</button>`
              : `<button class="btn" data-dec="no">No</button><button class="btn" data-dec="other">Otra cosa</button><button class="btn primary" data-dec="yes">${App.ico('check', 14)}Sí, enviar</button>`}
          </div>
        </div>`;
      box.querySelector('.qf-note')?.focus();
    }

    const render = () => (step < n ? renderAsk() : renderSummary());

    function submit(note) {
      const lines = spec.questions.map((q, i) => `${i + 1}. ${q.question} → ${answerText(i)}`);
      const text = `Mis respuestas al cuestionario${spec.title ? ` "${spec.title}"` : ''}:\n${lines.join('\n')}${note ? `\n\nAdemás: ${note}` : ''}`;
      msg.qa = msg.qa || {};
      msg.qa[idx] = { lines, note: note || '', decision: note ? 'other' : 'yes', at: Date.now() };
      if (!App.send(text)) { delete msg.qa[idx]; return; }   // sin key o respondiendo: se queda abierto
      App.saveChat(chat);
      renderSaved(box, spec, msg.qa[idx], null);
    }

    box.onclick = (e) => {
      const opt = e.target.closest('.qf-opt');
      if (opt && step < n) {
        const q = spec.questions[step], a = ans[step];
        if (opt.dataset.k === 'other') {
          if (q.multi) a.otherOn = !a.otherOn;
          else { a.sel.clear(); a.otherOn = true; }
        } else {
          const k = +opt.dataset.k;
          if (q.multi) { a.sel.has(k) ? a.sel.delete(k) : a.sel.add(k); }
          else { a.sel = new Set([k]); a.otherOn = false; }
        }
        renderAsk();
        // pregunta de una sola respuesta: avanza sola tras un instante
        if (!q.multi && a.sel.size === 1) setTimeout(() => { if (step < n && answered(step) && ans[step].sel.size === 1) { step++; render(); } }, 260);
        return;
      }
      const nav = e.target.closest('[data-nav]');
      if (nav) { step += nav.dataset.nav === 'next' ? 1 : -1; mode = 'ask'; render(); return; }
      const edit = e.target.closest('[data-edit]');
      if (edit) { step = +edit.dataset.edit; render(); return; }
      const dec = e.target.closest('[data-dec]');
      if (dec) {
        const d = dec.dataset.dec;
        if (d === 'yes') submit('');
        else if (d === 'other') { mode = 'other-note'; renderSummary(); }
        else if (d === 'back') { mode = 'ask'; renderSummary(); }
        else if (d === 'send-note') {
          const note = box.querySelector('.qf-note')?.value.trim();
          if (note) submit(note); else box.querySelector('.qf-note')?.focus();
        } else if (d === 'no') {
          msg.qa = msg.qa || {};
          msg.qa[idx] = { dismissed: true, at: Date.now() };
          App.saveChat(chat);
          renderSaved(box, spec, msg.qa[idx], () => { delete msg.qa[idx]; App.saveChat(chat); mount(box, spec, msg, idx, chat); });
        }
      }
    };

    box.oninput = (e) => {
      if (e.target.classList.contains('qf-other-input')) {
        ans[step].other = e.target.value;
        const next = box.querySelector('[data-nav="next"]');
        if (next) next.disabled = !answered(step);
      }
    };

    box.onkeydown = (e) => {
      if (e.key === 'Enter' && e.target.classList.contains('qf-other-input') && answered(step)) {
        e.preventDefault(); step++; render();
      }
    };

    render();
  }

  /** Tarjeta de solo lectura: ya respondido o descartado */
  function renderSaved(box, spec, saved, onReopen) {
    box.onclick = box.oninput = box.onkeydown = null;
    if (saved.dismissed) {
      box.innerHTML = `
        <div class="qf-card qf-final dismissed">
          <div class="qf-fhead">${App.ico('x', 16)}<b>${esc(spec.title || 'Cuestionario')}</b><span>Descartado</span>
            ${onReopen ? '<span class="spacer"></span><button class="qf-edit" data-reopen>Responder de todos modos</button>' : ''}</div>
        </div>`;
    } else {
      box.innerHTML = `
        <div class="qf-card qf-final">
          <div class="qf-fhead">${App.ico('check-circle', 16)}<b>${esc(spec.title || 'Cuestionario')}</b><span>Respondido</span></div>
          <div class="qf-rows">${saved.lines.map(l => `<div class="qf-row ro"><div>${esc(l)}</div></div>`).join('')}</div>
          ${saved.note ? `<div class="qf-note-ro"><b>Nota</b>${esc(saved.note)}</div>` : ''}
        </div>`;
    }
    if (onReopen) box.onclick = (e) => { if (e.target.closest('[data-reopen]')) onReopen(); };
  }
})();
