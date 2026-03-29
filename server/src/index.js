"use strict";

/**
 * @module index
 * @description Punto de entrada del servidor Express.
 * Configura middlewares, monta las rutas de la API y Swagger,
 * registra el middleware de errores y arranca el servidor.
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
 * Logger: escribe en consola cada petición con método, ruta, código y duración.
 * Usa el evento 'finish' de la respuesta para medir el tiempo total.
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
 * Middleware de errores (4 parámetros — Express lo reconoce como error handler).
 * Si el error es NOT_FOUND → 404. Cualquier otro → 500 con mensaje genérico.
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

// En Vercel no se llama a app.listen() — la plataforma gestiona el servidor.
if (process.env.VERCEL !== "1") {
  app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
    console.log(`Documentación Swagger en http://localhost:${PORT}/api/docs`);
  });
}

// Exporta la app para que Vercel la use como Serverless Function.
module.exports = app;
