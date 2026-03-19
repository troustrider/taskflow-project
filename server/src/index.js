const express = require("express");
const cors = require("cors");
const { PORT } = require("./config/env");
const taskRoutes = require("./routes/task.routes");

const app = express();

// ─── Middlewares globales ────────────────────────────────
app.use(cors());
app.use(express.json());

// Middleware de auditoría: registra método, ruta, código y duración
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

// ─── Rutas ───────────────────────────────────────────────
app.get("/", (req, res) => {
  res.json({ message: "TaskFlow API funcionando" });
});

app.use("/api/v1/tasks", taskRoutes);

// ─── Arrancar servidor ───────────────────────────────────
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
