# Pizarra: diseño, API y seguridad

La pizarra ejecuta código generado por un modelo dentro de un `iframe` aislado. Este documento describe lo que el código puede usar, cómo se versiona y por qué es seguro.

## Cómo funciona

1. El prompt de sistema le enseña al modelo que, cuando se le pide algo interactivo, debe responder con **un bloque de código de lenguaje `pizarra`** con el código completo.
2. Al terminar la respuesta, cada bloque `pizarra` se guarda como una **versión** del chat (`chat.board.versions`) y la pizarra se abre mostrándola.
3. En cada petición, el prompt de sistema incluye el código de la **versión actual** (hasta 24 000 caracteres) para que el modelo parta de él al hacer cambios.
4. Al elegir otra versión en el selector, esa pasa a ser la actual y el modelo editará esa.
5. Si regeneras una respuesta, las versiones que creó se eliminan.

Datos guardados por chat:

```json
{ "board": { "seq": 3, "current": "ab12cd34",
    "versions": [ { "id": "ab12cd34", "n": 3, "title": "Contador", "html": "...", "t": 1730000000000, "msg": "<id del mensaje>" } ] } }
```

Límites: 60 versiones por chat y 300 000 caracteres por versión.

## Formato del bloque

````text
```pizarra
<!-- Calculadora de propinas -->
<div class="card stack">
  <h2>Propinas</h2>
  <input id="monto" type="number" placeholder="Monto">
  <button class="btn primary" id="calc">Calcular</button>
  <div class="big" id="res">0</div>
</div>
<style>/* solo layout; los colores salen de las variables */</style>
<script>
  document.getElementById('calc').addEventListener('click', () => { /* ... */ });
</script>
```
````

- La primera línea (comentario HTML, `<title>` o un `<h1>`/`<h2>`) se usa como título de la versión.
- Fragmento HTML: sin `<html>` ni `<head>`. `<style>` y `<script>` pueden ir donde se quiera.
- Todo debe ser autocontenido: sin CDN, fuentes ni imágenes por URL (SVG inline o `data:` URI).
- El estado vive en variables de JavaScript (no hay `localStorage`).

## Sistema de diseño (fijo)

Variables CSS (cambian solas con el tema claro/oscuro):

`--bg`, `--surface`, `--surface-2`, `--border`, `--border-2`, `--text`, `--text-2`, `--text-3`, `--primary`, `--on-primary`, `--green`, `--red`, `--amber`, `--blue`, `--focus`, `--radius`

Clases utilitarias y componentes:

| Clase | Uso |
|---|---|
| `.stack` / `.col` | Columna con separación |
| `.row` | Fila con separación y alineación central |
| `.grid` | Rejilla responsive de columnas automáticas |
| `.gap-1` … `.gap-4`, `.p-1` … `.p-4`, `.mt-2`, `.mt-3` | Espaciado |
| `.between`, `.center`, `.wrap`, `.grow`, `.w-full`, `.hidden` | Layout |
| `.card` | Tarjeta |
| `.btn`, `.btn.primary`, `.btn.danger` | Botones (también el elemento `button`) |
| `.field` | Campo de texto (también `input`, `select`, `textarea`) |
| `.badge` | Etiqueta |
| `.progress > i` | Barra de progreso (`style="width:40%"` en el `<i>`) |
| `.big` | Número grande tabular |
| `.muted`, `.faint`, `.mono`, `.text-center` | Texto |
| `.ok`, `.err`, `.warn` | Colores semánticos |

Los elementos nativos (`h1`–`h4`, `p`, `a`, `table`, `kbd`, `code`, `hr`, `input[type=range]`...) ya traen estilo.

**Lo que no se puede cambiar:** las variables de tema, el fondo de la página, el color de texto base y la tipografía base se reinyectan después del código del modelo con `!important` y mayor especificidad. El código puede añadir su propio layout, pero no redefinir el aspecto del sistema.

## Seguridad

Amenaza considerada: un modelo (por error o por una instrucción maliciosa escondida en un texto que el usuario pegó) genera código que intenta robar las API keys, leer los chats, enviar datos a un servidor externo o alterar Sunstar.

| Control | Detalle |
|---|---|
| Origen opaco | `sandbox="allow-scripts"` sin `allow-same-origin`. El iframe no puede acceder a `parent.document`, `top.location`, `localStorage`, `sessionStorage` ni cookies de Sunstar |
| Sin red | CSP `default-src 'none'; connect-src 'none'; frame-src 'none'; form-action 'none'; base-uri 'none'; object-src 'none'`. Solo se permiten `script/style` en línea y `img/media/font` de tipo `data:` y `blob:` |
| Sin navegación | Sandbox sin `allow-top-navigation`, `allow-popups`, `allow-forms` ni `allow-modals`; además se bloquean enlaces, formularios, `window.open` y los cuadros de diálogo |
| HTML depurado | Se eliminan `meta`, `base`, `link`, `iframe`, `frame`, `object`, `embed` y `<script src>` antes de inyectarlo |
| Canal de mensajes | El iframe solo puede enviar `error` y `ready`. Sunstar comprueba `event.source === iframe.contentWindow`, ignora cualquier otro tipo y muestra el texto con `textContent` |
| Diseño blindado | Tokens y estilos base reinyectados al final con `!important` |

Cómo se verifica: la suite `npm run test:ui` carga una pizarra "maliciosa" que intenta leer `parent.document`, `top.location.href`, `localStorage`, `document.cookie`, hacer `fetch` al servidor local, redefinir `--bg` y cargar un `<script src>` externo. La prueba exige que todo quede bloqueado.

### Limitaciones conocidas

- **Bucles infinitos**: un `while(true)` en el código de la pizarra puede congelar la pestaña (JavaScript es de un solo hilo y el iframe comparte proceso en algunos navegadores). Si pasa, recarga la página; la pizarra se reinicia con el botón de recargar.
- **Navegación del propio iframe**: el código podría redirigir el iframe a otra URL (por ejemplo con `location.href`). No obtiene ningún dato de Sunstar al hacerlo, pero podría mostrar una página externa dentro de la pizarra. El cierre completo requeriría la directiva CSP `navigate-to`, que los navegadores no soportan.
- **Consumo de recursos**: no hay límite de CPU/memoria.

## Ideas

- Varias pizarras por chat y comparación visual entre versiones (diff).
- Exportar una versión como archivo `.html` autocontenido.
- Ejecutar el JavaScript en un Worker con tiempo límite para evitar bucles infinitos.
