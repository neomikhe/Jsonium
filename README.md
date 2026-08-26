# Jsonium

**A local-first JSON workbench that opens 100 MB files in under a second — and never sends your data anywhere.**

> ⚠️ **Early development (v0.1.0).** The performance core is built and measured. The rest of the
> toolbelt — semantic diff, jq, JSON Schema, codegen, mocks — is on the roadmap below.

![Jsonium exploring a 100 MB document](assets/screenshot-100mb.png)

---

## Why

Every developer ends up on some "json formatter online" site. Those sites are full of ads, they
**upload your payload to a server**, and they die on anything large. Paste a production response
with customer data or a bearer token, and it has already left your machine.

Jsonium is the opposite: everything runs in your browser, in Web Workers, and the app makes
**zero network requests** after the initial load. You can verify that in DevTools with the network
tab open — or just turn on airplane mode.

## Benchmarks

Measured on a 100 MB synthetic JSON file (256,098 records, 6.4 M nodes, nesting depth 6).
Reproduce them yourself with `npm run bench` — the fixture generator is in `bench/`.

| Operation | Chrome (Web Worker) | Node 24 |
| --- | ---: | ---: |
| `JSON.parse` of 100 MB | **300–347 ms** | 789 ms |
| Full document scan (6.4 M nodes) | **384 ms** | 294 ms |
| Text search across 100 MB (200 hits) | **32 ms** | — |
| First tree render | instant (virtualized) | — |
| Heap after parse | — | 285 MB |

Other numbers that matter:

| Metric | Value |
| --- | ---: |
| Initial bundle (gzip) | **75.3 kB** |
| Editor chunk (gzip, loaded lazily) | 102.7 kB |
| Network requests after load | **0** |
| DOM nodes for a 256,098-item array | ~35 |

## Privacy, concretely

- **Zero network.** No analytics, no remote fonts, no CDNs, no telemetry — not even "just for errors".
- **Enforced by the browser.** The production build ships a strict Content Security Policy with
  `default-src 'none'` and `connect-src 'none'`. The browser itself refuses to let the page open a
  connection, whatever the code tries to do.
- **Enforced by CI.** The build fails if network primitives (`fetch`, `XMLHttpRequest`, `WebSocket`,
  `sendBeacon`) appear anywhere in the application code, and if the service worker's precache list
  points at any origin but your own. The one place `fetch` does exist is the Workbox runtime, because
  serving from cache is precisely what a service worker does.
- **Enforced by lint.** Those same primitives are ESLint errors in the source.
- **One copy of your document.** The parsed document lives only inside the worker. The UI asks for
  small page-sized slices by node id and never receives the whole thing.

One thing to be upfront about: recent documents up to 5 MB are kept in your browser's IndexedDB so
they survive a reload. That is local storage on your own machine — it never syncs and never leaves
the device — but it is stored unencrypted, so a payload with tokens in it stays on disk until you
remove it. Every tab has a close button, **Borrar guardados** wipes the lot, and files above 5 MB
are never stored at all.

## Why another JSON tool?

An honest answer, because there are plenty already:

| | Strong at | Where it falls short |
| --- | --- | --- |
| "json formatter online" sites | SEO — they are what you find first | Ads, your payload goes to a server, they choke on large files |
| [jsoncrack](https://jsoncrack.com) | Graph visualisation, genuinely beautiful | Not a workbench: no semantic diff, no conversions |
| [jqplay](https://jqplay.org) | jq, done well | jq only, and it needs a backend |
| [it-tools](https://it-tools.tech) | Breadth — hundreds of small tools | No JSON depth: no semantic diff, no large files |
| **Jsonium** | JSON depth, privacy, and size | Younger, and it has to earn its audience without SEO |

If you only ever pretty-print small snippets, any of the above is fine and you do not need this. Jsonium
earns its place when the file is large, the payload is sensitive, or you need diff, search, conversion
and repair in one place instead of five tabs.

What it is **not**: a graph visualiser, a jq playground (JSONPath is here, jq is not — that is phase 4),
or a general-purpose "everything" toolbox.

## What works today

- **Open** a local JSON file by drag & drop, or paste JSON straight into the editor
- **Editor** (CodeMirror 6) with JSON syntax highlighting, folding and bracket matching
- **Format, minify and sort keys**, all computed in the worker
- **Repair near-valid JSON** — trailing commas, single and smart quotes, unquoted keys,
  `//` and `/* */` comments, and `True` / `False` / `None` / `NaN` / `undefined` — with a
  breakdown of every fix applied
- **Virtualized tree** with lazy expansion, paged 200 children at a time
- **Copy the JSONPath or the value** of any node
- **Click a node to reveal it in the editor** — it selects the exact span, in formatted or minified
  text alike
- **Search** keys and values across the whole document, with JSONPath results
- **JSONPath queries** with live results and an examples gallery: `$..price`, `$.store.book[*].author`,
  `$[0:5]`. Filters like `[?(@.price < 10)]` are deliberately not supported yet — that is the part
  most implementations solve with `eval`
- **Document statistics**: node count, max depth, and a histogram of value types
- **Generate types** for TypeScript, Go, Python and Rust from the document. Optionals map to each
  language properly: `?`, `Option<T>`, `| None`, and a Go pointer with `omitempty`
- **Validate against a JSON Schema** you drop in, with every failure pointing at its exact path.
  Written here rather than with ajv, which compiles every schema through `new Function` and so cannot
  run under this CSP. `$ref` is not resolved
- **Infer a JSON Schema** (draft-07) from the document: array elements merge into one `items`, and a
  key counts as required only when every sibling object has it
- **Convert to YAML, TOML or CSV** — and it tells you what each format silently loses: TOML has no
  null, and CSV turns nested values into JSON text that comes back as a string
- **Open YAML, TOML and CSV files** directly; they are converted to JSON on the way in
- **Export the diff** as JSON, and click any change to jump to it in the editor
- **Semantic diff** against a second document — arrays match by index, or by a key you name, so a
  reordered list stops drowning the real changes
- **Works offline.** A service worker precaches the whole app, so it keeps running with the server
  unreachable — verified by killing the server and reloading
- **Keyboard shortcuts**: Ctrl/Cmd + Shift + F, M and O for format, minify and sort keys
- **Recent documents** persisted in IndexedDB, so a reload does not lose your work
- Iterative traversal everywhere, so deeply nested documents cannot blow the stack
  (tested to 200,000 levels)

Above 5 MB the editor steps aside — keeping 100 MB of text in the main thread would freeze the
tab — and the tree becomes the way to navigate the document.

## Roadmap

| Phase | Scope | Status |
| --- | --- | --- |
| 1 | Editor, format / minify / sort keys, JSON repair, search, copy path, editor↔tree sync, tabs | ✅ done |
| 2 | Semantic diff between two documents | ✅ done |
| 2 | JSON ↔ YAML / CSV / TOML conversion with loss warnings, diff export | ✅ done |
| 3 | Offline PWA, keyboard shortcuts | ✅ done |
| 3 | v0.1.0 release | next |
| 4 | JSONPath playground | ✅ done |
| 4 | JSON Schema inference | ✅ done |
| 4 | JSON Schema validation | ✅ done |
| 4 | jq (WASM) | planned |
| 5 | Type generation (TypeScript, Go, Python, Rust) | ✅ done |
| 5 | Mocks, URL sharing via `#fragment` | planned |

## Getting started

```bash
npm install
npm run dev        # http://localhost:5173
```

Other scripts:

```bash
npm run typecheck  # tsc --noEmit
npm run lint       # ESLint, zero warnings allowed
npm test           # Vitest
npm run build      # production build with CSP injection
npm run preview    # serve the production build

node bench/generate.mjs 100   # generate a 100 MB fixture
npm run bench                 # measure parse + scan against it
```

Requires Node 24+.

## Architecture

```
UI (main thread)  ──postMessage──▶  parse worker
  tool tabs                          owns the single parsed copy
  virtualized tree                   answers with small node summaries
  node ids, never values             { id, key, kind, preview, childCount }
```

The document is parsed once inside the worker and never serialized back. The UI holds only the
summaries of the nodes currently on screen, which is what makes a 100 MB file feel the same as a
1 kB one.

Stack: Vite · React 19 · TypeScript (strict) · Web Workers · CodeMirror 6 · [virtua](https://github.com/inokawa/virtua) · js-yaml · smol-toml

## License

MIT

---
---

# Jsonium (español)

**Un banco de trabajo JSON local que abre archivos de 100 MB en menos de un segundo y nunca envía tus datos a ningún sitio.**

> ⚠️ **Desarrollo temprano (v0.1.0).** El núcleo de rendimiento está construido y medido. El resto de
> herramientas — diff semántico, jq, JSON Schema, generación de tipos y mocks — está en el roadmap.

## Por qué

Todo desarrollador acaba en alguna web de "json formatter online". Están llenas de anuncios,
**suben tu payload a un servidor** y se mueren con archivos grandes. Si pegas una respuesta de
producción con datos de clientes o un token, ya ha salido de tu máquina.

Jsonium es lo contrario: todo ocurre en tu navegador, dentro de Web Workers, y la aplicación hace
**cero peticiones de red** después de la carga inicial. Puedes comprobarlo en DevTools con la
pestaña de red abierta, o directamente en modo avión.

## Benchmarks

Medido sobre un JSON sintético de 100 MB (256.098 registros, 6,4 M de nodos, profundidad 6).
Reprodúcelo con `npm run bench`.

| Operación | Chrome (Web Worker) | Node 24 |
| --- | ---: | ---: |
| `JSON.parse` de 100 MB | **300–347 ms** | 789 ms |
| Recorrido completo (6,4 M nodos) | **384 ms** | 294 ms |
| Búsqueda de texto en 100 MB (200 aciertos) | **32 ms** | — |
| Primer render del árbol | instantáneo (virtualizado) | — |
| Heap tras el parse | — | 285 MB |

| Métrica | Valor |
| --- | ---: |
| Bundle inicial (gzip) | **75,3 kB** |
| Chunk del editor (gzip, carga perezosa) | 102,7 kB |
| Peticiones de red tras la carga | **0** |
| Nodos del DOM para un array de 256.098 elementos | ~35 |

## Privacidad, en concreto

- **Cero red.** Sin analítica, sin fuentes remotas, sin CDNs, sin telemetría.
- **Lo impone el navegador.** El build de producción incluye una CSP estricta con
  `default-src 'none'` y `connect-src 'none'`.
- **Lo impone la CI.** El build falla si aparecen primitivas de red en el código de la aplicación, y
  si el service worker precachea cualquier origen que no sea el tuyo. El único sitio donde `fetch`
  existe es el runtime de Workbox: servir desde caché es justo lo que hace un service worker.
- **Lo impone el linter.** Esas primitivas son errores de ESLint en el código fuente.
- **Una sola copia del documento.** El documento parseado vive únicamente en el worker.

Un matiz que conviene decir claro: los documentos recientes de hasta 5 MB se guardan en el
IndexedDB del navegador para sobrevivir a una recarga. Es almacenamiento local de tu equipo —no se
sincroniza ni sale del dispositivo—, pero **sin cifrar**: un payload con tokens queda en disco
hasta que lo borres. Cada pestaña tiene su aspa, **Borrar guardados** lo vacía todo, y por encima
de 5 MB no se guarda nada.

## Qué funciona hoy

- **Abrir** un archivo JSON local arrastrándolo, o pegar JSON directamente en el editor
- **Editor** (CodeMirror 6) con resaltado, plegado y emparejado de llaves
- **Formatear, minificar y ordenar claves**, todo calculado en el worker
- **Reparar JSON casi válido**: comas finales, comillas simples y tipográficas, claves sin comillas,
  comentarios `//` y `/* */`, y `True` / `False` / `None` / `NaN` / `undefined`, con el desglose de
  cada corrección aplicada
- **Árbol virtualizado** con expansión perezosa, paginado de 200 hijos
- **Copiar la ruta JSONPath o el valor** de cualquier nodo
- **Pulsar un nodo para verlo en el editor**: selecciona el fragmento exacto, tanto en texto
  formateado como minificado
- **Buscar** por clave y valor en todo el documento, con las rutas de cada coincidencia
- **Consultas JSONPath** con resultados en vivo y galería de ejemplos. Los filtros tipo
  `[?(@.precio < 10)]` no están soportados a propósito: son la parte que casi todas las
  implementaciones resuelven con `eval`
- **Estadísticas**: número de nodos, profundidad máxima e histograma de tipos
- **Generar tipos** para TypeScript, Go, Python y Rust a partir del documento. Los opcionales se
  traducen bien a cada lenguaje: `?`, `Option<T>`, `| None`, y puntero con `omitempty` en Go
- **Validar contra un JSON Schema** que sueltes, con cada incumplimiento apuntando a su ruta exacta.
  Está escrito aquí y no con ajv, que compila cada esquema con `new Function` y por tanto no puede
  ejecutarse bajo esta CSP. `$ref` no se resuelve
- **Inferir un JSON Schema** (draft-07) del documento: los elementos de un array se fusionan en un
  solo `items`, y una clave solo cuenta como requerida si la tienen todos los objetos hermanos
- **Convertir a YAML, TOML o CSV**, avisando de lo que cada formato pierde en silencio: TOML no
  tiene null, y CSV convierte lo anidado en texto JSON que vuelve como cadena
- **Abrir archivos YAML, TOML y CSV** directamente: se convierten a JSON al entrar
- **Exportar el diff** como JSON, y pulsar cualquier cambio para saltar a él en el editor
- **Diff semántico** contra un segundo documento: los arrays se emparejan por índice, o por la
  clave que indiques, de modo que reordenar una lista deje de tapar los cambios reales
- **Funciona sin conexión.** Un service worker precachea la aplicación entera, así que sigue
  funcionando con el servidor caído: verificado apagándolo y recargando
- **Atajos de teclado**: Ctrl/Cmd + Shift + F, M y O para formatear, minificar y ordenar claves
- **Documentos recientes** guardados en IndexedDB: recargar no pierde el trabajo
- Recorridos iterativos en todo el núcleo: el anidamiento profundo no desborda la pila
  (probado con 200.000 niveles)

Por encima de 5 MB el editor se aparta —mantener 100 MB de texto en el hilo principal congelaría la
pestaña— y el árbol pasa a ser la forma de navegar el documento.

## Empezar

```bash
npm install
npm run dev        # http://localhost:5173
```

Requiere Node 24+.

## Licencia

MIT
