# TaskFlow API — Backend

API REST para gestionar tareas del proyecto TaskFlow, construida con Node.js y Express 5.

**API en producción:** [https://taskflow-project-jet.vercel.app/api/v1/tasks](https://taskflow-project-jet.vercel.app/api/v1/tasks)

**Documentación Swagger:** [https://taskflow-project-jet.vercel.app/api/docs/](https://taskflow-project-jet.vercel.app/api/docs/)

> Fases A, B, C y D completadas + Bonus (Swagger). Frontend conectado al backend con gestión de estados de red. Persistencia en memoria (sin base de datos — las tareas se pierden al reiniciar el servidor). Desplegado en Vercel como Serverless Function.

---

## Arquitectura de carpetas

```
server/
├── .env                        # Variables de entorno (excluido del repo)
├── package.json
└── src/
    ├── index.js                # Punto de entrada — Express + middlewares + Swagger UI
    ├── config/
    │   ├── env.js              # Carga y valida variables de entorno (fail fast)
    │   └── swagger.js          # Especificación OpenAPI 3.0 con swagger-jsdoc
    ├── services/
    │   └── task.service.js     # Lógica de negocio pura (sin HTTP)
    ├── controllers/
    │   └── task.controller.js  # Validación defensiva y orquestación HTTP
    └── routes/
        └── task.routes.js      # Verbos HTTP → controladores + anotaciones @openapi
```

## Arquitectura por capas

El backend sigue separación de preocupaciones (SoC) con tres capas unidireccionales:

```
Petición HTTP → Ruta → Controlador → Servicio → Datos (array en memoria)
                                                    ↓
Respuesta HTTP ← Controlador ←─────────────── Resultado
```

**Ruta** (`task.routes.js`) — Capa "tonta". Conecta un verbo HTTP y una URL con el controlador adecuado. No toma decisiones lógicas. Contiene las anotaciones `@openapi` que Swagger usa para generar la documentación interactiva.

**Controlador** (`task.controller.js`) — Extrae datos de `req.body` y `req.params`, aplica validaciones defensivas con sentencias `if`, invoca al servicio si los datos son correctos, y formatea la respuesta HTTP con el código de estado adecuado.

**Servicio** (`task.service.js`) — Lógica de negocio pura. No sabe nada de Express, HTTP, `req` ni `res`. Es JavaScript puro, lo que permite escribir tests sin levantar un servidor y reutilizar la lógica si se cambia de framework.

## Middlewares

El servidor procesa cada petición a través de estos middlewares, en orden:

1. **`cors()`** — Permite peticiones cross-origin (necesario cuando frontend y backend corren en puertos distintos o en dominios diferentes).
2. **`express.json()`** — Parsea el cuerpo de peticiones JSON y lo deja disponible en `req.body`. Si el JSON es inválido, el error lo recoge el `errorHandler`.
3. **`express.static()`** — Sirve los archivos estáticos del frontend (HTML, JS, CSS) desde la carpeta raíz del proyecto. Esto permite acceder a toda la aplicación desde `http://localhost:3000`.
4. **`logger`** (personalizado) — Registra cada petición en consola con método, ruta, código de respuesta y duración en milisegundos. Se suscribe al evento `finish` del stream de respuesta para medir el tiempo total.
5. **`swagger-ui`** — Monta la documentación interactiva de la API en `/api/docs` usando `swagger-ui-express` con la especificación generada por `swagger-jsdoc`.
6. **`errorHandler`** (4 parámetros) — Red de seguridad final. Recoge cualquier error no gestionado que los controladores pasen con `next(err)`. Mapea errores conocidos a códigos HTTP y oculta detalles técnicos al cliente.

## Manejo de errores

El sistema gestiona errores en dos niveles:

**Errores de validación (400):** El controlador detecta datos mal formados antes de invocar al servicio y responde directamente con `res.status(400).json(...)`. El middleware de errores no interviene.

**Errores de negocio y errores inesperados:** El servicio lanza excepciones con `throw`. El controlador las atrapa en un `catch` y las pasa con `next(err)`. El middleware global `errorHandler` las recibe y decide el código HTTP:

```
Servicio: throw → Controlador: catch → next(err) → errorHandler
```

| Tipo de error | Código HTTP | Quién responde | Ejemplo |
|---|---|---|---|
| Datos inválidos del cliente | 400 | Controlador (directamente) | POST sin texto, categoría inválida |
| Recurso no encontrado | 404 | errorHandler (via `next`) | DELETE de ID inexistente |
| Error inesperado del servidor | 500 | errorHandler (via `next`) | JSON mal formado, error de runtime |

El `errorHandler` nunca filtra detalles técnicos (stack traces, nombres de variables) al cliente. Solo envía mensajes genéricos en las respuestas 500.

## Configuración y variables de entorno

Las variables de entorno se definen en `server/.env` (excluido del repositorio vía `.gitignore`):

```
PORT=3000
NODE_ENV=development
```

El módulo `src/config/env.js` carga estas variables con `dotenv` y lanza un error si `PORT` no está definido en entorno local, impidiendo que el servidor arranque sin configuración (principio fail fast). En entornos serverless (Vercel), donde la plataforma gestiona el puerto internamente, se usa un valor por defecto sin lanzar error.

## Documentación Swagger (Bonus)

La API cuenta con documentación interactiva generada automáticamente a partir de anotaciones `@openapi` en los archivos de rutas.

**Acceso local:** [http://localhost:3000/api/docs](http://localhost:3000/api/docs)

**Acceso en producción:** [https://taskflow-project-jet.vercel.app/api/docs/](https://taskflow-project-jet.vercel.app/api/docs/)

**Implementación:**
- `src/config/swagger.js` — Define la especificación OpenAPI 3.0 con schemas reutilizables (Task, TaskInput, TaskUpdate, Error).
- `src/routes/task.routes.js` — Cada endpoint incluye anotaciones `@openapi` con parámetros, cuerpos de petición, respuestas y ejemplos.
- `src/index.js` — Monta `swagger-ui-express` en la ruta `/api/docs`.

La documentación incluye "Try it out" para probar cada endpoint directamente desde el navegador.

## Instalación y ejecución

```bash
cd server
npm install

# Crear .env si no existe
echo "PORT=3000" > .env
echo "NODE_ENV=development" >> .env

npm run dev      # Desarrollo (nodemon, recarga automática)
npm start        # Producción
```

Una vez corriendo, abrir `http://localhost:3000` para la aplicación completa y `http://localhost:3000/api/docs` para la documentación Swagger.

## Despliegue en Vercel

El backend se despliega como Serverless Function:

- `server/src/index.js` concentra la app Express, y Vercel la expone a través de un único wrapper serverless en `../api/router.js`.
- `vercel.json` redirige `/api/v1/tasks` y `/api/docs` hacia ese router con reglas `rewrites`, manteniendo las URLs públicas limpias.
- `index.js` exporta `module.exports = app` y solo llama a `app.listen()` en local (no en Vercel).
- `env.js` detecta el entorno Vercel (`VERCEL=1`) para no exigir `PORT`.
- Las variables de entorno se configuran en Vercel Dashboard → Settings → Environment Variables.

## API REST — Endpoints

Base URL: `/api/v1/tasks`

### GET /api/v1/tasks

Devuelve todas las tareas.

**Respuesta 200:**
```json
[
  {
    "id": "a1b2c3d4-...",
    "text": "Estudiar para el examen",
    "category": "Estudio",
    "priority": "Alta",
    "completed": false,
    "createdAt": 1710850000000,
    "completedAt": null,
    "dueDate": 1710936400000,
    "notes": "Capítulos 3 y 4",
    "project": "Sprint 14"
  }
]
```

### GET /api/v1/tasks/:id

Devuelve una tarea por su UUID.

**Respuesta 200:** Objeto de tarea individual.

**Respuesta 404:**
```json
{ "error": "Recurso no encontrado" }
```

### POST /api/v1/tasks

Crea una nueva tarea.

**Request body:**
```json
{
  "text": "Preparar presentación",
  "category": "Trabajo",
  "priority": "Alta",
  "dueDate": 1710936400000,
  "notes": "Incluir gráficos de Q1",
  "project": "Sprint 14"
}
```

| Campo | Tipo | Obligatorio | Valor por defecto |
|---|---|---|---|
| text | string (min 3 chars) | Sí | — |
| category | string | No | "Personal" |
| priority | string | No | "Media" |
| dueDate | number (timestamp) o null | No | null |
| notes | string | No | "" |
| project | string o null | No | null |

**Categorías válidas:** Trabajo, Personal, Estudio, Salud, Gestiones.

**Prioridades válidas:** Alta, Media, Baja.

**Respuesta 201:** Tarea creada con ID generado por el servidor.

**Respuesta 400:**
```json
{ "error": "El texto es obligatorio y debe tener al menos 3 caracteres." }
```

### PUT /api/v1/tasks

Sincronización masiva: reemplaza todas las tareas del servidor con el array enviado por el frontend. Existe para operaciones masivas del cliente, como reordenación, vaciado de completadas, deshacer borrados o carga de tareas de ejemplo, mientras que las operaciones individuales usan `POST`, `PATCH` y `DELETE`.

**Request body:** Array de objetos de tarea con shape completa.

Cada elemento del array debe incluir:

- `id`
- `text`
- `category`
- `priority`
- `completed`
- `createdAt`
- `completedAt`
- `dueDate`
- `notes`
- `project`

**Respuesta 200:** Array resultante.

**Respuesta 400:**
```json
{ "error": "El cuerpo debe ser un array de tareas." }
```

También responde `400` si alguna tarea del array no cumple la shape esperada o contiene tipos inválidos.

### PATCH /api/v1/tasks/:id

Actualiza parcialmente una tarea. Solo modifica los campos incluidos en el cuerpo.

**Request body** (al menos un campo):
```json
{ "completed": true }
```

**Respuesta 200:** Tarea actualizada.

**Respuesta 400:** Datos inválidos o ningún campo enviado.

**Respuesta 404:** ID no existe.

### DELETE /api/v1/tasks/:id

Elimina una tarea por su UUID.

**Respuesta 204:** Sin cuerpo (éxito).

**Respuesta 404:**
```json
{ "error": "Recurso no encontrado" }
```

## Validaciones defensivas

El controlador aplica validaciones en la frontera de red, antes de que los datos lleguen al servicio:

| Campo | Regla |
|---|---|
| text | Obligatorio, tipo string, mínimo 3 caracteres tras trim |
| category | Si se envía, debe ser una de las categorías válidas |
| priority | Si se envía, debe ser una de las prioridades válidas |
| completed | Si se envía, debe ser booleano estricto (true/false) |
| dueDate | Opcional, timestamp numérico o null |
| notes | Opcional, string |
| project | Opcional, string o null |

En `PUT /api/v1/tasks`, además de esas reglas, el backend exige una tarea completa y valida también:

| Campo | Regla |
|---|---|
| id | Obligatorio, string no vacío |
| createdAt | Obligatorio, timestamp numérico |
| completedAt | Obligatorio en la shape, timestamp numérico o null |

Si alguna validación falla, el servidor responde con HTTP 400 y un mensaje descriptivo. Los datos nunca llegan al servicio si no son correctos.

## Conexión frontend ↔ backend

El frontend eliminó toda dependencia de `localStorage` para tareas. `TaskStore` en `app.js` habla con el backend a través de `src/api/client.js`:

| Operación frontend | Función client.js | Endpoint |
|---|---|---|
| Cargar tareas al iniciar | `apiCargarTareas()` | GET /api/v1/tasks |
| Crear una tarea | `apiCrearTarea(data)` | POST /api/v1/tasks |
| Actualizar una tarea | `apiActualizarTarea(id, data)` | PATCH /api/v1/tasks/:id |
| Eliminar una tarea | `apiEliminarTarea(id)` | DELETE /api/v1/tasks/:id |
| Sincronización masiva | `apiSincronizarTareas(tasks)` | PUT /api/v1/tasks |

La UI gestiona cuatro estados de red:

1. **Carga** — Spinner con "Conectando con el servidor…" mientras se espera la respuesta.
2. **Sincronización en curso** — Badge flotante con "Sincronizando cambios…" mientras una operación sigue pendiente.
3. **Éxito** — Se oculta el spinner y se renderizan las tareas.
4. **Error** — Banner rojo con el mensaje de error y botón "Reintentar".

Fuera de la persistencia de tareas, el navegador solo conserva preferencias auxiliares como el tema visual y una caché temporal de ubicación durante la sesión.

## Pruebas de integración

La documentación incluye una colección real de Postman en `../docs/postman/taskflow-api.postman_collection.json` y una guía breve en `../docs/postman/taskflow-api-tests.md`. Los ejemplos `curl` se conservan como apoyo rápido desde terminal, pero la secuencia principal de pruebas manuales queda documentada con Postman.

### Prueba 1 — Crear y recuperar (201 + 200)

```bash
curl -X POST http://localhost:3000/api/v1/tasks \
  -H "Content-Type: application/json" \
  -d '{"text": "Tarea de prueba", "category": "Trabajo", "priority": "Alta"}'
```
**Resultado:** 201 — Tarea creada con ID generado.

```bash
curl http://localhost:3000/api/v1/tasks
```
**Resultado:** 200 — Array con la tarea.

### Prueba 2 — Error 400: POST sin texto

```bash
curl -X POST http://localhost:3000/api/v1/tasks \
  -H "Content-Type: application/json" \
  -d '{}'
```
**Resultado:** 400 — `{"error":"El texto es obligatorio y debe tener al menos 3 caracteres."}`

**Quién responde:** El controlador directamente (no pasa por `errorHandler`).

### Prueba 3 — Error 404: DELETE con ID inexistente

```bash
curl -X DELETE http://localhost:3000/api/v1/tasks/id-inventado
```
**Resultado:** 404 — `{"error":"Recurso no encontrado"}`

**Flujo:** Servicio lanza `throw new Error("NOT_FOUND")` → controlador lo captura en `catch` → `next(err)` → `errorHandler` responde 404.

### Prueba 4 — Error 500: JSON mal formado

```bash
curl -X POST http://localhost:3000/api/v1/tasks \
  -H "Content-Type: application/json" \
  -d 'esto no es json'
```
**Resultado:** 500 — `{"error":"Error interno del servidor"}`

**Flujo:** `express.json()` falla al parsear → `errorHandler` lo recoge → responde 500 con mensaje genérico, sin filtrar detalles técnicos.

## Dependencias

**Producción:**

| Paquete | Versión | Propósito |
|---|---|---|
| express | ^5.2.1 | Framework web para Node.js |
| cors | ^2.8.6 | Middleware para peticiones cross-origin |
| dotenv | ^17.3.1 | Carga variables de entorno desde .env |
| swagger-jsdoc | ^6.2.8 | Genera especificación OpenAPI desde comentarios JSDoc |
| swagger-ui-express | ^5.0.1 | Monta documentación interactiva en /api/docs |

**Desarrollo:**

| Paquete | Versión | Propósito |
|---|---|---|
| nodemon | ^3.1.14 | Reinicia el servidor automáticamente al guardar cambios |
