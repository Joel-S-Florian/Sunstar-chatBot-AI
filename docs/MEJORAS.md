# Mejoras posibles para Sunstar

Lista priorizada de ideas. Cada una indica el **impacto** para el usuario y el **esfuerzo** aproximado (S = horas, M = días, L = semana o más).

## 1. Solicitadas

### 1.1 Enviar imágenes al modelo (entrada)  ·  Impacto alto · Esfuerzo M

Permitir adjuntar, arrastrar o pegar imágenes (capturas, fotos, diagramas) para que el modelo las analice.

- **UI**: botón de clip en el compositor, arrastrar y soltar sobre el chat y pegar desde el portapapeles (`paste` con `clipboardData.files`). Miniaturas con botón para quitar antes de enviar.
- **Formato por proveedor** (el servidor traduce el mensaje interno `{role, content, attachments}`):
  - Claude: bloques `{type:'image', source:{type:'base64', media_type, data}}` dentro de `content`.
  - OpenAI y compatibles (Grok, Qwen-VL, Mistral Pixtral, OpenRouter...): `{type:'image_url', image_url:{url:'data:image/png;base64,...'}}`.
  - Gemini: `parts: [{inline_data:{mime_type, data}}]`.
- **Almacenamiento**: `localStorage` (~5 MB) no alcanza. Guardar las imágenes en **IndexedDB** y dejar en el chat solo una referencia.
- **Límites**: redimensionar en el cliente (canvas, lado máximo ~1568 px) y recomprimir a JPEG/WebP antes de enviar; subir `express.json({limit})` o pasar a `multipart`.
- **Capacidades**: marcar qué modelos aceptan imágenes (`vision: true` en `providers.js`) y avisar si se adjunta una imagen a un modelo que no la soporta.
- **Seguridad**: validar el tipo MIME real (no confiar en la extensión) y no renderizar SVG subidos como HTML.

### 1.2 Recibir imágenes (salida)  ·  Impacto alto · Esfuerzo M

Que el modelo pueda generar o devolver imágenes y se vean en el chat.

- **Generación**: OpenAI (`/images/generations`), Gemini (modelos de imagen con `responseModalities`), y proveedores locales. Añadir un comando `/imagen <descripción>` y la detección de peticiones de imagen.
- **Render**: bloque de imagen con zoom (reusar el visor de pantalla completa de los diagramas), descargar, copiar y "usar en la pizarra".
- **Streaming**: las imágenes llegan completas; mostrar un esqueleto de carga con el tiempo transcurrido.
- **Persistencia**: IndexedDB (igual que la entrada).
- **Imágenes embebidas en Markdown**: permitir solo `data:` y `blob:` (evitar rastreo por URLs remotas) o pedir confirmación para URLs externas.

### 1.3 Enviar y recibir archivos  ·  Impacto alto · Esfuerzo L

**Entrada** (PDF, DOCX, XLSX, CSV, TXT, código):

- Texto plano y código: leer con `FileReader` e insertar como contexto (con nombre y tamaño visibles).
- PDF: `pdf.js` en el cliente para extraer texto; Claude y Gemini aceptan PDF nativo (`document` / `inline_data`).
- DOCX: `mammoth`; XLSX/CSV: `SheetJS`, resumiendo hojas grandes (primeras filas + esquema).
- Archivos grandes: troceado con resumen o **RAG local** (embeddings en el navegador o vía API) para no exceder el contexto.
- Mostrar el consumo estimado de tokens antes de enviar.

**Salida** (el modelo devuelve un archivo):

- Bloque de código con nombre de archivo (`` ```csv nombre=datos.csv ``) y botón **Descargar**.
- Generar en el cliente: CSV, JSON, Markdown, HTML, SVG y `.zip` de varios archivos (`fflate`).
- Para DOCX/XLSX/PDF reales: ejecutar librerías en el servidor (opcional) o usar las herramientas de ejecución de código de los proveedores.
- Pizarra: botón "Exportar como .html" con el CSS de diseño incluido.

## 2. Sugeridas

### Conversación

| Idea | Impacto | Esfuerzo | Notas |
|---|---|---|---|
| Editar un mensaje y reenviar (ramificar la conversación) | Alto | M | Guardar un árbol de mensajes en lugar de una lista |
| Resumen automático de chats largos | Alto | M | Cuando el historial se acerca al límite de contexto, resumir lo antiguo |
| Respuestas con razonamiento visible | Medio | S | Mostrar `reasoning_content` (DeepSeek, o1) en un bloque plegable |
| Comparar modelos lado a lado | Medio | M | Enviar el mismo mensaje a dos modelos y mostrar ambas columnas |
| Plantillas de prompts y roles propios | Medio | S | Editor de roles en Configuración, con importar/exportar |
| Fijar, archivar y etiquetar chats; carpetas | Medio | M | |
| Búsqueda dentro de un chat y salto a resultado | Medio | S | |
| Estimar y mostrar el costo por mensaje y por chat | Medio | M | Tabla de precios por modelo en `providers.js` |

### Herramientas y conocimiento

| Idea | Impacto | Esfuerzo | Notas |
|---|---|---|---|
| Búsqueda web | Alto | M | Tool use / function calling con un proveedor de búsqueda; citar fuentes |
| Herramientas (function calling) con confirmación del usuario | Alto | L | Ejecutar acciones locales (leer una carpeta, consultar una API) con permisos explícitos |
| Memoria entre chats | Alto | L | Hechos del usuario guardados localmente, editables y desactivables |
| Base de conocimiento (RAG) por proyecto | Alto | L | Carpeta de documentos + búsqueda semántica |
| Servidores MCP | Medio | L | Conectar herramientas externas estandarizadas |

### Pizarra y diagramas

| Idea | Impacto | Esfuerzo | Notas |
|---|---|---|---|
| Varias pizarras por chat y comparación entre versiones (diff) | Medio | M | |
| Exportar pizarra como `.html` autocontenido | Medio | S | |
| Ejecutar el JS de la pizarra en un Worker con límite de tiempo | Medio | M | Evita congelar la pestaña con bucles infinitos |
| Diagramas: exportar a PNG, editar el código con vista previa en vivo | Medio | S | |
| Gráficos de datos (Chart.js empaquetado local) disponibles en la pizarra | Medio | M | Sin CDN, por la CSP |

### Experiencia

| Idea | Impacto | Esfuerzo | Notas |
|---|---|---|---|
| Voz: dictado y lectura en voz alta | Medio | S | Web Speech API, sin dependencias |
| PWA instalable y uso offline de lo ya cargado | Medio | S | Manifest + service worker |
| Atajos de teclado configurables y paleta de comandos (`Ctrl+K` global) | Medio | S | |
| Internacionalización (inglés, portugués...) | Medio | M | Extraer textos a diccionarios |
| Accesibilidad: lector de pantalla, foco visible, contraste AA verificado | Alto | M | Revisar roles ARIA de menús y modales |
| Importar chats (JSON de Sunstar) | Medio | S | Complementa `/exportar` |

### Datos y despliegue

| Idea | Impacto | Esfuerzo | Notas |
|---|---|---|---|
| Persistencia opcional en el servidor (SQLite) | Alto | L | Chats accesibles desde varios dispositivos |
| Autenticación y multiusuario | Alto | L | Requisito antes de exponer el servidor fuera de localhost |
| Límite de peticiones y registro de uso | Medio | S | `express-rate-limit` |
| Empaquetado: Docker, ejecutable de escritorio (Electron o Tauri) | Medio | M | |
| Integración continua: `npm test` + `npm run test:ui` en cada cambio | Medio | S | GitHub Actions con Chromium |
| Cifrar también los chats guardados (misma bóveda de contraseña) | Medio | M | |
| Copias de seguridad automáticas a un archivo | Bajo | S | |

## 3. Orden sugerido

1. **Imágenes de entrada** (1.1): es lo que más amplía lo que se puede hacer y reutiliza casi todo.
2. **Archivos de texto/PDF de entrada** y **descargar archivos generados** (1.3, primera parte).
3. **Edición de mensajes con ramas** y **resumen automático** de chats largos.
4. **Imágenes de salida** (1.2).
5. **Búsqueda web** y **function calling**.
6. Persistencia en servidor + autenticación, si se quiere usar desde varios dispositivos.

## 4. Deuda técnica conocida

- `localStorage` limita los chats a ~5 MB: migrar a IndexedDB antes de añadir imágenes y archivos.
- Los modelos se muestran tal como los devuelve cada API (sin metadatos de capacidades ni precios): mantener una tabla propia.
- La detección de "modelos no aptos para chat" es una expresión regular (`HIDE_MODEL_RE`); conviene reemplazarla por las capacidades reales que expone cada API.
- Mermaid se carga desde un CDN; para uso sin conexión, servir la librería localmente.
- Las fuentes de la pizarra se incrustan descargándolas de Google Fonts en tiempo de ejecución; empaquetarlas localmente quitaría esa dependencia.
