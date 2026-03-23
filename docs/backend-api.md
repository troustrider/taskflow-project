# Herramientas de desarrollo y documentación de APIs

Documento de referencia sobre herramientas profesionales mencionadas en el enunciado de la Fase 3 del bootcamp InfraOps.

---

## Axios

**Qué es:** Librería JavaScript para hacer peticiones HTTP desde el navegador o desde Node.js.

**Qué problema resuelve:** La API nativa `fetch` del navegador funciona, pero tiene algunas incomodidades: no lanza error automáticamente con códigos 4xx/5xx (hay que comprobar `response.ok` manualmente), no transforma JSON automáticamente, y gestionar timeouts requiere código extra. Axios envuelve todo esto en una API más cómoda.

**Por qué se usa:** Simplifica el código de peticiones HTTP. Características principales: transformación automática de JSON, interceptores para añadir headers (como tokens de autenticación) a todas las peticiones, cancelación de peticiones, timeouts configurables, y mejor gestión de errores (lanza excepciones con códigos 4xx/5xx directamente).

**Por qué no lo usamos en TaskFlow:** El enunciado especifica JavaScript puro (vanilla JS). Usamos `fetch` nativo con un wrapper propio (`apiRequest` en `src/api/client.js`) que resuelve las mismas incomodidades sin añadir dependencias.

**Instalación:** `npm install axios`

**Ejemplo básico:**
```javascript
const axios = require('axios');

// GET — carga tareas
const { data } = await axios.get('http://localhost:3000/api/v1/tasks');

// POST — crea tarea (Axios hace JSON.stringify automáticamente)
const { data: nueva } = await axios.post('http://localhost:3000/api/v1/tasks', {
  text: "Estudiar para el examen",
  category: "Estudio",
  priority: "Alta"
});
```

---

## Postman

**Qué es:** Aplicación de escritorio (y web) para diseñar, probar y documentar APIs REST.

**Qué problema resuelve:** Cuando desarrollas un backend, necesitas probar los endpoints antes de conectar el frontend. Escribir peticiones HTTP a mano es tedioso. Postman proporciona una interfaz gráfica donde configuras método, URL, headers, body, y ves la respuesta formateada.

**Por qué se usa:** Permite organizar las peticiones en "colecciones" (por ejemplo, una colección "TaskFlow API" con todos los endpoints), guardar variables de entorno (URL base, tokens), ejecutar tests automatizados sobre las respuestas, y generar documentación compartible. Es el estándar de facto para pruebas manuales de APIs.

**Alternativas:**
- **Thunder Client** — Extensión de VS Code que hace lo mismo dentro del editor, sin salir.
- **curl** — Herramienta de línea de comandos. Más ágil para pruebas puntuales y muy útil para documentar ejemplos reproducibles.
- **Insomnia** — Alternativa open source a Postman con interfaz similar.

**Cómo lo usamos en TaskFlow:** La entrega incluye una colección Postman exportable para las pruebas manuales pedidas en la consigna, y mantiene ejemplos con `curl` en los README para disponer también de una vía rápida desde terminal.

---

## Swagger (OpenAPI)

**Qué es:** Especificación estándar para describir APIs REST de forma legible por máquinas y humanos. Se escribe en YAML o JSON y define los endpoints, parámetros, cuerpos de petición, respuestas y códigos de error de toda la API.

**Qué problema resuelve:** La documentación de una API escrita a mano (como nuestro README) se desactualiza fácilmente. Swagger genera documentación interactiva directamente desde la especificación: una página web donde puedes ver todos los endpoints, sus parámetros, y probarlos en vivo desde el navegador.

**Por qué se usa:** Es el estándar de la industria para documentación de APIs. Beneficios principales: documentación siempre sincronizada con el código, interfaz interactiva para probar endpoints ("Try it out"), generación automática de clientes SDK, y validación de que la API cumple su contrato.

**Herramientas del ecosistema Swagger:**
- **swagger-jsdoc** — Genera la especificación OpenAPI a partir de comentarios JSDoc en el código (lo que ya escribimos).
- **swagger-ui-express** — Monta una página web interactiva en una ruta del servidor (ej: `/api/docs`).

**Ejemplo de integración en Express:**
```javascript
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const specs = swaggerJsdoc({
  definition: {
    openapi: '3.0.0',
    info: { title: 'TaskFlow API', version: '1.0.0' },
  },
  apis: ['./src/routes/*.js'],
});

app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(specs));
```

Con esto, accediendo a `http://localhost:3000/api/docs` se vería la documentación interactiva de toda la API.

---

## Sentry

**Qué es:** Plataforma de monitorización de errores en tiempo real para aplicaciones en producción.

**Qué problema resuelve:** Cuando tu aplicación está desplegada y un usuario encuentra un error, ¿cómo te enteras? Los `console.error` del servidor se pierden. Sentry captura automáticamente las excepciones no controladas, las agrupa, te avisa por email/Slack, y te muestra el stack trace completo con contexto (qué petición lo causó, qué usuario, qué navegador).

**Por qué se usa:** En producción no puedes estar mirando los logs 24/7. Sentry te da visibilidad sobre qué errores ocurren, con qué frecuencia, a cuántos usuarios afectan, y si un despliegue nuevo introdujo regresiones. Es la herramienta estándar de observabilidad de errores.

**Cómo se integra con Express:**
```javascript
const Sentry = require('@sentry/node');

Sentry.init({ dsn: 'https://tu-dsn@sentry.io/123' });

// Middleware de captura — va ANTES de las rutas
app.use(Sentry.Handlers.requestHandler());

// ... rutas ...

// Middleware de errores de Sentry — va DESPUÉS de las rutas, ANTES del errorHandler
app.use(Sentry.Handlers.errorHandler());

// Tu middleware de errores normal sigue al final
app.use(errorHandler);
```

**Por qué no lo usamos en TaskFlow:** Es una herramienta de producción que requiere una cuenta en sentry.io y configuración de DSN. En desarrollo local, el `console.error` de nuestro `errorHandler` es suficiente.

---

## Resumen comparativo

| Herramienta | Categoría | Cuándo usarla |
|---|---|---|
| **Axios** | Cliente HTTP | Cuando `fetch` nativo se queda corto (interceptores, cancelación, timeouts) |
| **Postman** | Pruebas de API | Para diseñar, probar y documentar APIs con interfaz gráfica |
| **curl** | Pruebas de API | Para pruebas rápidas desde terminal y documentación reproducible |
| **Swagger** | Documentación | Para generar documentación interactiva y validar contratos de API |
| **Sentry** | Monitorización | Para capturar y alertar errores en producción |
