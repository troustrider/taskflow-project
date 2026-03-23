"use strict";

/**
 * @module index
 * @description Punto de entrada del servidor Express de TaskFlow.
 *
 * Responsabilidades:
 *   - Configura los middlewares globales (CORS, parseo JSON, archivos estáticos, logger).
 *   - Monta las rutas de la API bajo el prefijo /api/v1/tasks.
 *   - Monta la documentación Swagger bajo /api/docs.
 *   - Registra el middleware global de errores como última pieza de la cadena.
 *   - Arranca el servidor HTTP en el puerto definido por variable de entorno.
 *   - Exporta la app Express para despliegues serverless (Vercel).
 */

const path = require("path");
const express = require("express");
const cors = require("cors");
const { PORT } = require("./config/env");
const taskRoutes = require("./routes/task.routes");
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./config/swagger");

const app = express();

// ─── Middlewares globales ────────────────────────────────

/** Permite peticiones cross-origin (necesario cuando frontend y backend corren en puertos distintos). */
app.use(cors());

/** Parsea el cuerpo de peticiones con Content-Type: application/json y lo deja en req.body. */
app.use(express.json());

/**
 * Sirve archivos estáticos del frontend (index.html, app.js, css/, src/).
 * La carpeta raíz del proyecto está dos niveles por encima de __dirname (server/src/).
 */
app.use(express.static(path.resolve(__dirname, "../..")));

/**
 * Middleware de auditoría: registra cada petición HTTP en consola.
 * Formato: [MÉTODO] /ruta - Estado: código (duración en ms)
 *
 * Se suscribe al evento 'finish' del stream de respuesta para medir
 * el tiempo total entre la llegada de la petición y el envío de la respuesta.
 *
 * @param {import('express').Request} req - Objeto de petición HTTP
 * @param {import('express').Response} res - Objeto de respuesta HTTP
 * @param {import('express').NextFunction} next - Función para ceder el control al siguiente middleware
 */
const logger = (req, res, next) => {
  const inicio = performance.now();

  res.on("finish", () => {
    const duracion = performance.now() - inicio;
    console.log(
      `[${req.method}] ${req.originalUrl} - Estado: ${res.statusCode} (${duracion.toFixed(2)}ms)`
    );
  });

  next();
};

app.use(logger);

// ─── Documentación Swagger ───────────────────────────────

/** Monta Swagger UI en /api/docs para documentación interactiva de la API. */
app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: ".swagger-ui .topbar { display: none }",
  customSiteTitle: "TaskFlow API — Documentación",
}));

// ─── Rutas API ───────────────────────────────────────────

/** Monta el enrutador de tareas bajo el prefijo versionado /api/v1/tasks. */
app.use("/api/v1/tasks", taskRoutes);

// ─── Middleware global de errores ────────────────────────

/**
 * Middleware de manejo global de errores (4 parámetros).
 *
 * Express reconoce esta función como manejador de errores gracias a su
 * firma con 4 parámetros. Recibe cualquier error que los controladores
 * pasen con next(err).
 *
 * Mapeo de errores a códigos HTTP:
 *   - err.message === "NOT_FOUND" → 404 (recurso no encontrado)
 *   - Cualquier otro error        → 500 (error interno, sin filtrar detalles técnicos)
 *
 * @param {Error} err - Error capturado
 * @param {import('express').Request} req - Objeto de petición HTTP
 * @param {import('express').Response} res - Objeto de respuesta HTTP
 * @param {import('express').NextFunction} next - Función next (requerida por la firma de 4 parámetros)
 */
function errorHandler(err, req, res, next) {
  if (err.message === "NOT_FOUND") {
    res.status(404).json({ error: "Recurso no encontrado" });
  } else {
    console.error(err);
    res.status(500).json({ error: "Error interno del servidor" });
  }
}

app.use(errorHandler);

// ─── Arrancar servidor (solo en ejecución local) ─────────

/**
 * En Vercel, el servidor NO debe llamar a app.listen() porque la plataforma
 * gestiona el ciclo de vida HTTP. Solo escuchamos en local.
 */
if (process.env.VERCEL !== "1") {
  app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
    console.log(`Documentación Swagger en http://localhost:${PORT}/api/docs`);
  });
}

/** Exporta la app para que Vercel la use como Serverless Function. */
module.exports = app;
