# TaskFlow API — Backend

API REST para gestionar tareas del proyecto TaskFlow, construida con Node.js y Express.

> **Estado actual**: Fases A y B completadas. Persistencia en memoria (sin base de datos). Pendiente: middleware global de errores (Fase C), conexión del frontend (Fase D).

---

## Arquitectura de carpetas

```
server/
├── .env                        # Variables de entorno (excluido del repo)
├── package.json
└── src/
    ├── index.js                # Punto de entrada — crea el servidor Express
    ├── config/
    │   └── env.js              # Carga y valida variables de entorno
    ├── services/
    │   └── task.service.js     # Lógica de negocio pura (toca los datos)
    ├── controllers/
    │   └── task.controller.js  # Valida peticiones y orquesta respuestas HTTP
    └── routes/
        └── task.routes.js      # Mapea URLs y verbos HTTP a controladores
```

## Arquitectura por capas

La aplicación sigue el principio de separación de preocupaciones (SoC) con tres capas unidireccionales:

```
Petición HTTP → Ruta → Controlador → Servicio → Datos
                                                   ↓
Respuesta HTTP ← Controlador ←──────────────── Resultado
```

**Ruta** (`task.routes.js`): Escucha la red. Conecta un verbo HTTP y una URL con el controlador adecuado. No toma decisiones lógicas.

**Controlador** (`task.controller.js`): Extrae datos de la petición (`req.body`, `req.params`), aplica validaciones defensivas, invoca al servicio y formatea la respuesta HTTP con el código de estado correcto.

**Servicio** (`task.service.js`): Contiene la lógica de negocio pura. Trabaja con los datos directamente. No sabe nada de Express, HTTP, `req` ni `res`. Es JavaScript puro.

## Middlewares

El servidor usa tres middlewares globales que procesan cada petición en orden:

1. **`cors()`** — Permite peticiones desde otros orígenes (necesario para que el frontend en un puerto distinto pueda comunicarse con el backend).
2. **`express.json()`** — Parsea el cuerpo de las peticiones JSON y lo coloca en `req.body`.
3. **`logger`** (personalizado) — Registra en consola cada petición con su método, ruta, código de respuesta y duración en milisegundos.

## Configuración y variables de entorno

Las variables de entorno se definen en `server/.env` (no se sube al repositorio):

```
PORT=3000
NODE_ENV=development
```

El módulo `src/config/env.js` carga estas variables con `dotenv` y **lanza un error si `PORT` no está definido**, impidiendo que el servidor arranque sin configuración (principio fail fast).

## Instalación y ejecución

```bash
cd server
npm install
npm run dev      # Desarrollo (con nodemon, recarga automática)
npm start        # Producción
```

## API REST — Endpoints

Base URL: `http://localhost:3000/api/v1/tasks`

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
    "completedAt": null
  }
]
```

### GET /api/v1/tasks/:id

Devuelve una tarea por su ID.

**Respuesta 200:**
```json
{
  "id": "a1b2c3d4-...",
  "text": "Estudiar para el examen",
  "category": "Estudio",
  "priority": "Alta",
  "completed": false,
  "createdAt": 1710850000000,
  "completedAt": null
}
```

**Respuesta 404** (ID no existe):
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
  "priority": "Alta"
}
```

**Campos obligatorios:** `text` (string, mínimo 3 caracteres).
**Campos opcionales:** `category` (por defecto "Personal"), `priority` (por defecto "Media").

**Categorías válidas:** Trabajo, Personal, Estudio, Proyectos, Salud, Errands.
**Prioridades válidas:** Alta, Media, Baja.

**Respuesta 201:**
```json
{
  "id": "e5f6g7h8-...",
  "text": "Preparar presentación",
  "category": "Trabajo",
  "priority": "Alta",
  "completed": false,
  "createdAt": 1710850100000,
  "completedAt": null
}
```

**Respuesta 400** (validación fallida):
```json
{ "error": "El texto es obligatorio y debe tener al menos 3 caracteres." }
```

### PATCH /api/v1/tasks/:id

Actualiza parcialmente una tarea existente. Solo se modifican los campos enviados.

**Request body** (todos opcionales, al menos uno obligatorio):
```json
{
  "completed": true
}
```

**Respuesta 200:**
```json
{
  "id": "a1b2c3d4-...",
  "text": "Estudiar para el examen",
  "category": "Estudio",
  "priority": "Alta",
  "completed": true,
  "createdAt": 1710850000000,
  "completedAt": 1710850200000
}
```

**Respuesta 400** (sin campos o datos inválidos):
```json
{ "error": "Debes enviar al menos un campo para actualizar." }
```

**Respuesta 404** (ID no existe):
```json
{ "error": "Recurso no encontrado" }
```

### DELETE /api/v1/tasks/:id

Elimina una tarea por su ID.

**Respuesta 204:** Sin cuerpo (éxito).

**Respuesta 404** (ID no existe):
```json
{ "error": "Recurso no encontrado" }
```

## Validaciones defensivas

El controlador aplica validaciones en la frontera de red antes de que los datos lleguen al servicio:

- `text`: obligatorio, tipo string, mínimo 3 caracteres tras trim.
- `category`: si se envía, debe ser una de las categorías válidas.
- `priority`: si se envía, debe ser una de las prioridades válidas.
- `completed`: si se envía, debe ser boolean (`true`/`false`).

Si alguna validación falla, el servidor responde con HTTP 400 y un mensaje descriptivo del error. Los datos nunca llegan al servicio si no son correctos.

## Dependencias

**Producción:**
- `express` — Framework web para Node.js
- `cors` — Middleware para permitir peticiones cross-origin
- `dotenv` — Carga variables de entorno desde `.env`

**Desarrollo:**
- `nodemon` — Reinicia el servidor automáticamente al guardar cambios
