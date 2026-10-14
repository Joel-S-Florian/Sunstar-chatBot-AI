/**
 * Registro de extensiones. Cada módulo (diagramas, cuestionarios, pizarra...)
 * se engancha aquí sin que app.js tenga que conocerlo. Los módulos se cargan
 * ANTES que app.js y solo usan sus funciones (App, ico, escHtml...) en tiempo
 * de ejecución, nunca al cargarse.
 *
 *  codeHandlers   { render(lang, code, key, ctx) -> html | null }   bloques ``` especiales
 *                 ctx = { partial, index(tipo) }  (partial = el mensaje aún se está escribiendo)
 *  hydrators      (msgEl, msg, chat) => void       tras terminar de renderizar un mensaje
 *  systemParts    () => string                     texto extra para el prompt de sistema
 *  clickHandlers  (event, msgEl) => boolean        clics dentro de los mensajes (true = atendido)
 *  chatChanged    (chat) => void                   al abrir o crear un chat
 *  removed        (chat, msg) => void              al descartar un mensaje (regenerar)
 */
const Ext = {
  codeHandlers:  [],
  hydrators:     [],
  systemParts:   [],
  clickHandlers: [],
  chatChanged:   [],
  removed:       [],
};
