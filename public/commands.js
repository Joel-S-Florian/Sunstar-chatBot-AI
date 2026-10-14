/**
 * Comandos con "/".  Para agregar uno nuevo basta una entrada en COMMANDS:
 *   { name, args (texto de ayuda), desc, run(argString) }
 * Usa la API global `App` (definida en app.js).
 */

const ROLES = {
  programador: 'Eres un programador senior. Responde con código limpio y comentado, explica brevemente las decisiones y señala posibles errores o mejoras.',
  profesor:    'Eres un profesor paciente. Explica paso a paso, con ejemplos simples y analogías, y verifica que el concepto quede claro.',
  traductor:   'Eres un traductor profesional. Traduce el texto del usuario al idioma que pida (por defecto español a inglés y viceversa) conservando tono y formato. Responde solo con la traducción.',
  resumidor:   'Eres un experto en síntesis. Resume cualquier texto en puntos clave claros y concisos.',
  revisor:     'Eres un revisor de código riguroso. Busca bugs, problemas de seguridad y de rendimiento, y propón correcciones concretas.',
  creativo:    'Eres un escritor creativo. Usa un lenguaje vivo, metáforas y propuestas originales.',
};

const fmtList = (items) => items.map(i => `\`${i}\``).join(', ');

const COMMANDS = [
  {
    name: 'ayuda', args: '', desc: 'Muestra todos los comandos',
    run() {
      const esc = (t) => t.replace(/\|/g, '\\|');
      const rows = COMMANDS.map(c => `| \`/${c.name}${c.args ? ' ' + esc(c.args) : ''}\` | ${c.desc} |`).join('\n');
      App.say(`### Comandos disponibles\n\n| Comando | Descripción |\n|---|---|\n${rows}\n\n:::tip\nEscribe \`/\` para ver el menú de autocompletado. Usa las flechas y Tab.\n:::`);
    },
  },
  {
    name: 'consola', args: '', desc: 'Muestra u oculta la consola de logs',
    run() { App.toggleConsole(); },
  },
  {
    name: 'verificar', args: '', desc: 'Verifica la API key del proveedor actual',
    async run() { App.toggleConsole(true); await App.checkKey(); },
  },
  {
    name: 'config', args: '[seccion]', desc: 'Abre la configuración',
    run(arg) {
      const tabs = { apariencia: 'appearance', seguridad: 'security', modelo: 'model', datos: 'data' };
      App.openSettings(tabs[arg.toLowerCase()] || 'appearance');
    },
  },
  {
    name: 'nuevo', args: '', desc: 'Inicia un chat nuevo',
    run() { App.newChat(); },
  },
  {
    name: 'borrar', args: '', desc: 'Elimina el chat actual',
    run() { App.deleteCurrentChat(); },
  },
  {
    name: 'modelo', args: '[nombre]', desc: 'Muestra o cambia el modelo',
    run(arg) {
      const list = App.models();
      if (!arg) return App.say(`Modelo actual: \`${App.currentModel()}\`\n\nDisponibles (${list.length}): ${fmtList(list.slice(0, 25))}${list.length > 25 ? ' …' : ''}`);
      const m = list.find(x => x === arg) || list.find(x => x.includes(arg.toLowerCase()));
      if (!m) return App.say(`:::danger Modelo no encontrado\nPrueba con \`/modelo\` para ver la lista.\n:::`);
      App.setModel(m);
      App.say(`:::success\nModelo cambiado a \`${m}\`\n:::`);
    },
  },
  {
    name: 'proveedor', args: '[nombre]', desc: 'Muestra o cambia el proveedor de IA',
    run(arg) {
      const p = arg.toLowerCase();
      if (!PROVIDERS[p]) return App.say(`Proveedor actual: **${PROVIDERS[App.provider()].name}**.\n\nDisponibles: ${fmtList(PROVIDER_IDS)}`);
      App.setProvider(p);
      App.say(`:::success\nProveedor: **${PROVIDERS[p].name}** · modelo \`${App.currentModel()}\`\n:::`);
    },
  },
  {
    name: 'preguntas', args: '[tema]', desc: 'Sunstar te hace un cuestionario interactivo',
    run(arg) {
      App.send(arg
        ? `Hazme un cuestionario interactivo (entre 3 y 5 preguntas) para definir bien lo que necesito sobre: ${arg}`
        : 'Antes de continuar, hazme un cuestionario interactivo (entre 3 y 5 preguntas) para aclarar lo que necesites saber de mí y de lo que quiero lograr.');
    },
  },
  {
    name: 'pizarra', args: '[idea]', desc: 'Abre la pizarra o crea algo en ella',
    run(arg) {
      if (!arg) return Board.toggle();
      Board.open();
      App.send(`En la pizarra, crea ${arg}`);
    },
  },
  {
    name: 'diagrama', args: '<qué dibujar>', desc: 'Pide un diagrama (Mermaid)',
    run(arg) {
      if (!arg) return App.say('Indica qué dibujar, por ejemplo: `/diagrama flujo de inicio de sesión`.');
      App.send(`Dibuja un diagrama mermaid de: ${arg}`);
    },
  },
  {
    name: 'tema', args: 'claro|oscuro|sistema', desc: 'Cambia el tema',
    run(arg) {
      const map = { claro: 'light', oscuro: 'dark', sistema: 'system' };
      const t = map[arg.toLowerCase()];
      if (!t) return App.say(`Tema actual: \`${Theme.pref}\`. Opciones: \`claro\`, \`oscuro\`, \`sistema\`.`);
      Theme.set(t);
      App.say(`:::success\nTema **${arg.toLowerCase()}** aplicado.\n:::`);
    },
  },
  {
    name: 'colores', args: 'on|off', desc: 'Activa o desactiva el formato enriquecido del bot',
    run(arg) {
      if (!['on', 'off'].includes(arg)) return App.say(`Formato enriquecido: **${App.settings.colors ? 'on' : 'off'}**. Usa \`/colores on\` o \`/colores off\`.`);
      App.settings.colors = arg === 'on';
      App.applySettings();
      App.say(`Formato enriquecido **${arg}**. Se aplica desde el siguiente mensaje.`);
    },
  },
  {
    name: 'sistema', args: '<texto>|reset', desc: 'Define un prompt de sistema propio',
    run(arg) {
      if (!arg) return App.say(App.settings.system ? `Prompt de sistema actual:\n\n> ${App.settings.system}` : 'No hay prompt de sistema personalizado.');
      App.settings.system = arg === 'reset' ? '' : arg;
      App.applySettings();
      App.say(arg === 'reset' ? 'Prompt de sistema eliminado.' : ':::success\nPrompt de sistema guardado.\n:::');
    },
  },
  {
    name: 'rol', args: '[nombre]|reset', desc: 'Aplica un rol predefinido',
    run(arg) {
      const names = Object.keys(ROLES);
      if (!arg) return App.say(`Roles: ${fmtList(names)}\n\nActual: \`${App.settings.role || 'ninguno'}\``);
      if (arg === 'reset') { App.settings.role = ''; App.applySettings(); return App.say('Rol eliminado.'); }
      if (!ROLES[arg]) return App.say(`:::danger Rol no encontrado\nDisponibles: ${fmtList(names)}\n:::`);
      App.settings.role = arg;
      App.applySettings();
      App.say(`:::success\nRol **${arg}** activado.\n:::`);
    },
  },
  {
    name: 'temperatura', args: '0-1|reset', desc: 'Ajusta la creatividad del modelo',
    run(arg) {
      if (!arg) return App.say(`Temperatura: \`${App.settings.temperature ?? 'por defecto'}\``);
      if (arg === 'reset') { App.settings.temperature = null; App.applySettings(); return App.say('Temperatura restablecida.'); }
      const n = parseFloat(arg.replace(',', '.'));
      if (!Number.isFinite(n) || n < 0 || n > 1) return App.say(':::danger\nUsa un número entre 0 y 1.\n:::');
      App.settings.temperature = n;
      App.applySettings();
      App.say(`:::success\nTemperatura: \`${n}\`\n:::`);
    },
  },
  {
    name: 'regenerar', args: '', desc: 'Repite la última respuesta',
    run() { App.regenerate(); },
  },
  {
    name: 'resumir', args: '', desc: 'Pide un resumen de la conversación',
    run() {
      if (!App.history().length) return App.say('Aún no hay nada que resumir.');
      App.send('Resume nuestra conversación hasta ahora en puntos clave.');
    },
  },
  {
    name: 'tokens', args: '', desc: 'Estimación de tokens usados',
    run() {
      const h = App.history();
      const chars = h.reduce((n, m) => n + m.content.length, 0) + App.buildSystem().length;
      App.say(`| Mensajes | Caracteres | Tokens aprox. |\n|---|---|---|\n| ${h.length} | ${chars} | ~${Math.ceil(chars / 4)} |\n\n:::note\nEs una estimación (cerca de 4 caracteres por token).\n:::`);
    },
  },
  {
    name: 'exportar', args: 'md|json|html', desc: 'Descarga la conversación',
    run(arg) {
      const fmt = arg || 'md';
      if (!['md', 'json', 'html'].includes(fmt)) return App.say('Formatos: `md`, `json`, `html`.');
      if (!App.history().length) return App.say('No hay conversación para exportar.');
      App.exportChat(fmt);
    },
  },
];

/** Devuelve true si el texto era un comando (y lo ejecutó). */
function runCommand(text) {
  const m = /^\/(\S+)\s*([\s\S]*)$/.exec(text.trim());
  if (!m) return false;
  const cmd = COMMANDS.find(c => c.name === m[1].toLowerCase());
  if (!cmd) {
    App.say(`:::danger Comando desconocido\n\`/${m[1]}\` no existe. Escribe \`/ayuda\` para ver la lista.\n:::`);
    return true;
  }
  cmd.run(m[2].trim());
  return true;
}
