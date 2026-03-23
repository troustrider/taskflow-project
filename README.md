# TaskFlow

Aplicación de gestión de tareas construida como proyecto del bootcamp InfraOps de Corner Estudios.

Frontend en vanilla JavaScript + Tailwind CSS v4. Backend en Node.js + Express 5. Persistencia en memoria (sin base de datos). Desplegado en Vercel.

**Demo en producción:** [https://taskflow-project-jet.vercel.app](https://taskflow-project-jet.vercel.app)

**Documentación interactiva de la API (Swagger):** [https://taskflow-project-jet.vercel.app/api/docs/](https://taskflow-project-jet.vercel.app/api/docs/)

**Repositorio:** [https://github.com/troustrider/taskflow-project](https://github.com/troustrider/taskflow-project)

---

## Arquitectura del proyecto

```
taskflow-project/
├── index.html                  # Punto de entrada del frontend
├── app.js                      # Lógica completa de la aplicación (modular, ~95 KB)
├── input.css                   # Archivo fuente de Tailwind CSS
├── css/
│   └── output.css              # CSS compilado generado por Tailwind
├── src/
│   └── api/
│       └── client.js           # Capa de red del frontend (fetch async → API REST)
├── api/
│   └── router.js               # Wrapper serverless único para Vercel + rewrites desde vercel.json
├── server/                     # Backend Express (Fase 3)
│   ├── .env                    # Variables de entorno (excluido del repo)
│   ├── package.json
│   └── src/
│       ├── index.js            # Servidor Express + middlewares + Swagger UI
│       ├── config/
│       │   ├── env.js          # Carga y validación de variables de entorno
│       │   └── swagger.js      # Especificación OpenAPI 3.0
│       ├── services/
│       │   └── task.service.js # Lógica de negocio pura (sin HTTP)
│       ├── controllers/
│       │   └── task.controller.js  # Validación defensiva y orquestación HTTP
│       └── routes/
│           └── task.routes.js  # Mapeo verbos HTTP → controladores + anotaciones @openapi
├── docs/
│   ├── backend-api.md          # Referencia: Axios, Postman, Sentry, Swagger
│   ├── design/
│   │   └── wireframe-taskflow.svg
│   ├── postman/
│   │   ├── taskflow-api-tests.md
│   │   └── taskflow-api.postman_collection.json
│   └── ai/                     # Reflexiones y experimentos con IA
├── vercel.json                 # Configuración de despliegue (frontend + backend serverless)
├── tailwind.config.js
├── package.json                # Dependencias del frontend (Tailwind)
└── README.md
```

## Stack tecnológico

**Frontend:** HTML5, vanilla JavaScript (ES2022+), Tailwind CSS v4 (compilado vía CLI).

**Backend:** Node.js, Express 5, cors, dotenv. Documentación interactiva con swagger-jsdoc + swagger-ui-express.

**Desarrollo:** nodemon (recarga automática del servidor), Tailwind CLI en modo watch.

**Despliegue:** Vercel — frontend como archivos estáticos, backend como Serverless Function.

## Cómo funciona

El frontend gestiona toda la interfaz: formulario con sintaxis rápida (`@viernes #trabajo !alta /proyecto`), filtros por categoría y proyecto, drag-and-drop entre secciones (Ahora / Pendiente / Hecho), Focus Mode, tema claro/oscuro, y geolocalización.

Al cargar la página, el frontend pide las tareas al backend con `GET /api/v1/tasks`. Las operaciones individuales usan el CRUD real de la API: `POST` para crear, `PATCH` para editar y completar, y `DELETE` para borrar. El endpoint `PUT /api/v1/tasks` se reserva para sincronizaciones masivas como reordenación, vaciado de completadas, deshacer borrados y carga de tareas de ejemplo. En ese sync masivo, el backend valida y normaliza la shape completa de cada tarea (`id`, `text`, `category`, `priority`, `completed`, `createdAt`, `completedAt`, `dueDate`, `notes` y `project`). El backend almacena las tareas en un array en memoria — se pierden al reiniciar el servidor porque aún no hay base de datos.

La capa de red (`src/api/client.js`) usa `fetch` con rutas relativas (`/api/v1/tasks`), así funciona igual en `localhost:3000` que en el despliegue de Vercel sin tocar código.

## Instalación y ejecución local

```bash
# 1. Clonar el repositorio
git clone https://github.com/troustrider/taskflow-project.git
cd taskflow-project

# 2. Instalar dependencias del frontend (Tailwind)
npm install

# 3. Instalar dependencias del backend
cd server
npm install

# 4. Crear archivo de variables de entorno
echo "PORT=3000" > .env
echo "NODE_ENV=development" >> .env

# 5. Arrancar el servidor (sirve frontend + API desde el mismo puerto)
npm run dev
```

Abrir `http://localhost:3000` en el navegador. Toda la aplicación (frontend + API) corre desde ahí. La documentación Swagger está en `http://localhost:3000/api/docs`.

Para compilar CSS en paralelo durante el desarrollo (otra terminal, desde la raíz):

```bash
npm run dev:css
```

## API REST

Base URL: `/api/v1/tasks`

| Método | Ruta | Descripción | Código éxito |
|---|---|---|---|
| GET | `/api/v1/tasks` | Listar todas las tareas | 200 |
| GET | `/api/v1/tasks/:id` | Obtener tarea por UUID | 200 |
| POST | `/api/v1/tasks` | Crear tarea nueva | 201 |
| PUT | `/api/v1/tasks` | Sincronización masiva | 200 |
| PATCH | `/api/v1/tasks/:id` | Actualización parcial | 200 |
| DELETE | `/api/v1/tasks/:id` | Eliminar tarea | 204 |

Documentación interactiva completa con esquemas, ejemplos y "Try it out" en [`/api/docs/`](https://taskflow-project-jet.vercel.app/api/docs/) (Swagger UI).

Pruebas de integración documentadas con Postman en `docs/postman/taskflow-api.postman_collection.json` y `docs/postman/taskflow-api-tests.md`.

### Ejemplos con curl

**Crear una tarea:**

```bash
curl -X POST http://localhost:3000/api/v1/tasks \
  -H "Content-Type: application/json" \
  -d '{"text": "Estudiar para el examen", "category": "Estudio", "priority": "Alta"}'
```

Respuesta 201:

```json
{
  "id": "a1b2c3d4-...",
  "text": "Estudiar para el examen",
  "category": "Estudio",
  "priority": "Alta",
  "completed": false,
  "createdAt": 1710850000000,
  "completedAt": null,
  "dueDate": null,
  "notes": "",
  "project": null
}
```

**Error 400 — POST sin texto:**

```bash
curl -X POST http://localhost:3000/api/v1/tasks \
  -H "Content-Type: application/json" \
  -d '{}'
```

Respuesta: `{"error":"El texto es obligatorio y debe tener al menos 3 caracteres."}`

**Error 404 — DELETE de tarea que no existe:**

```bash
curl -X DELETE http://localhost:3000/api/v1/tasks/id-inventado
```

Respuesta: `{"error":"Recurso no encontrado"}`

**Error 500 — JSON mal formado:**

```bash
curl -X POST http://localhost:3000/api/v1/tasks \
  -H "Content-Type: application/json" \
  -d 'esto no es json'
```

Respuesta: `{"error":"Error interno del servidor"}`

## Arquitectura del backend

El backend sigue separación de preocupaciones (SoC) con tres capas unidireccionales:

```
Petición HTTP → Ruta → Controlador → Servicio → Datos (array en memoria)
                                                    ↓
Respuesta HTTP ← Controlador ←─────────────── Resultado
```

**Rutas** (`task.routes.js`) — Capa "tonta". Conecta verbos HTTP con el controlador correspondiente. No toma decisiones lógicas. Incluye las anotaciones `@openapi` para Swagger.

**Controladores** (`task.controller.js`) — Extraen datos de `req.body` y `req.params`, aplican validaciones defensivas con sentencias `if`, invocan al servicio si los datos son correctos, y devuelven la respuesta HTTP con el código adecuado (201 para creación, 204 para borrado, 400 si la validación falla).

**Servicios** (`task.service.js`) — Lógica de negocio pura en JavaScript. No conocen Express, HTTP, `req` ni `res`. Lanzan errores estándar (`throw new Error("NOT_FOUND")`) que los controladores capturan con `try/catch` y pasan al middleware de errores con `next(err)`.

## Middlewares

El servidor procesa cada petición a través de estos middlewares, en orden:

1. **`cors()`** — Permite peticiones cross-origin (necesario cuando frontend y backend corren en puertos o dominios distintos).
2. **`express.json()`** — Parsea cuerpos JSON y los deja en `req.body`. Si el JSON es inválido, el error lo recoge el `errorHandler`.
3. **`express.static()`** — Sirve los archivos estáticos del frontend (HTML, JS, CSS) desde la raíz del proyecto.
4. **`logger`** (personalizado) — Registra cada petición en consola: método, ruta, código de respuesta y duración en milisegundos.
5. **`swagger-ui`** — Monta la documentación interactiva de la API en `/api/docs`.
6. **`errorHandler`** (4 parámetros) — Red de seguridad final. Recoge errores que los controladores pasan con `next(err)`. Si el mensaje es `NOT_FOUND`, responde 404. Cualquier otro error → `console.error(err)` + respuesta 500 con mensaje genérico, sin filtrar detalles técnicos al cliente.

## Manejo de errores

| Tipo | Código HTTP | Quién responde | Ejemplo |
|---|---|---|---|
| Datos inválidos del cliente | 400 | Controlador (directamente) | POST sin texto, categoría inválida |
| Recurso no encontrado | 404 | errorHandler (via `next(err)`) | DELETE de ID que no existe |
| Error inesperado del servidor | 500 | errorHandler (via `next(err)`) | JSON mal formado, error de runtime |

El `errorHandler` nunca expone stack traces ni nombres de variables al exterior. Solo devuelve mensajes genéricos en los 500.

## Conexión frontend ↔ backend

El frontend eliminó toda dependencia de `localStorage` para las tareas. La persistencia ahora pasa por el backend: `TaskStore` en `app.js` habla con el servidor a través de `src/api/client.js` usando `fetch` asíncrono.

La UI gestiona cuatro estados de red:

1. **Carga** — Spinner a pantalla completa con "Conectando con el servidor…" mientras la petición viaja.
2. **Sincronización en curso** — Badge flotante con "Sincronizando cambios…" mientras una operación asíncrona sigue pendiente.
3. **Éxito** — Se oculta el spinner y se renderizan las tareas.
4. **Error** — Banner rojo fijo con el mensaje del servidor y un botón "Reintentar" que vuelve a intentar la conexión.

`localStorage` solo se conserva para la preferencia de tema (claro/oscuro), y `sessionStorage` se usa como caché temporal de ubicación durante la sesión. Ninguno de los dos se usa para persistir tareas.

## Despliegue en Vercel

El proyecto se despliega como aplicación full-stack en Vercel:

- **Frontend** — Archivos estáticos servidos desde la raíz. El CSS se compila con `npm run build:css` como build command.
- **Backend** — Express sigue viviendo en `server/src/index.js`, pero en producción Vercel lo expone a través de un único wrapper serverless (`api/router.js`). Las rutas públicas `/api/v1/tasks` y `/api/docs` se redirigen a ese router mediante `rewrites` en `vercel.json`.
- **Variables de entorno** — `PORT` y `NODE_ENV` se configuran en el dashboard de Vercel (Settings → Environment Variables). El módulo `env.js` detecta el entorno Vercel para no exigir `PORT` (la plataforma lo gestiona internamente).
- **`app.listen()` condicional** — Solo se ejecuta en local. En Vercel, `index.js` exporta `module.exports = app` y la plataforma maneja el ciclo HTTP.

## Decisiones de implementación

- **`<aside>` mantenido con rediseño visual** — La interfaz sigue usando paneles laterales (`aside`) y muestra el progreso mediante un anillo SVG integrado en el sidebar y en la vista móvil.
- **Tailwind vía npm en vez de CDN** — Permite usar Tailwind v4 con `@import`, compilación local y minificación en producción.
- **`css/output.css` como artefacto generado** — Vercel lo regenera en cada despliegue con `npm run build:css`. No debe editarse manualmente; la fuente de verdad es `input.css`.
- **Colección Postman incluida** — La entrega incorpora una colección exportable con casos `200`, `201`, `204`, `400`, `404` y `500` para dejar trazabilidad de las pruebas manuales exigidas.

## Documentación adicional

- [`server/README.md`](server/README.md) — Documentación detallada del backend: arquitectura por capas, endpoints con ejemplos request/response, validaciones, pruebas de integración, y configuración de Swagger.
- [`docs/backend-api.md`](docs/backend-api.md) — Referencia sobre Axios, Postman, Sentry y Swagger: qué son, qué problema resuelven y por qué se usan.
- [`docs/postman/taskflow-api-tests.md`](docs/postman/taskflow-api-tests.md) — Secuencia de pruebas manuales con Postman y resultados esperados para la entrega.
