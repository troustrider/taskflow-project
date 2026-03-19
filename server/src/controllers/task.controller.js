"use strict";

const taskService = require("../services/task.service");

// ─── Categorías y prioridades válidas ────────────────────
const VALID_CATEGORIES = ["Trabajo", "Personal", "Estudio", "Proyectos", "Salud", "Errands"];
const VALID_PRIORITIES = ["Alta", "Media", "Baja"];

// ─── GET /api/v1/tasks ───────────────────────────────────
function obtenerTodas(req, res) {
  const tasks = taskService.obtenerTodas();
  res.json(tasks);
}

// ─── GET /api/v1/tasks/:id ───────────────────────────────
function obtenerPorId(req, res, next) {
  try {
    const task = taskService.obtenerPorId(req.params.id);
    res.json(task);
  } catch (err) {
    next(err);
  }
}

// ─── POST /api/v1/tasks ──────────────────────────────────
function crearTarea(req, res, next) {
  try {
    const { text, category, priority } = req.body;

    // Validación defensiva del texto
    if (!text || typeof text !== "string" || text.trim().length < 3) {
      return res.status(400).json({
        error: "El texto es obligatorio y debe tener al menos 3 caracteres.",
      });
    }

    // Validación de categoría (si se envía)
    if (category && !VALID_CATEGORIES.includes(category)) {
      return res.status(400).json({
        error: `Categoría no válida. Opciones: ${VALID_CATEGORIES.join(", ")}`,
      });
    }

    // Validación de prioridad (si se envía)
    if (priority && !VALID_PRIORITIES.includes(priority)) {
      return res.status(400).json({
        error: `Prioridad no válida. Opciones: ${VALID_PRIORITIES.join(", ")}`,
      });
    }

    const nueva = taskService.crearTarea({
      text: text.trim(),
      category,
      priority,
    });

    res.status(201).json(nueva);
  } catch (err) {
    next(err);
  }
}

// ─── PATCH /api/v1/tasks/:id ─────────────────────────────
function actualizarTarea(req, res, next) {
  try {
    const { text, category, priority, completed } = req.body;

    // Validar que se envía al menos un campo
    if (text === undefined && category === undefined && priority === undefined && completed === undefined) {
      return res.status(400).json({
        error: "Debes enviar al menos un campo para actualizar.",
      });
    }

    // Validar texto si se envía
    if (text !== undefined && (typeof text !== "string" || text.trim().length < 3)) {
      return res.status(400).json({
        error: "El texto debe tener al menos 3 caracteres.",
      });
    }

    // Validar categoría si se envía
    if (category !== undefined && !VALID_CATEGORIES.includes(category)) {
      return res.status(400).json({
        error: `Categoría no válida. Opciones: ${VALID_CATEGORIES.join(", ")}`,
      });
    }

    // Validar prioridad si se envía
    if (priority !== undefined && !VALID_PRIORITIES.includes(priority)) {
      return res.status(400).json({
        error: `Prioridad no válida. Opciones: ${VALID_PRIORITIES.join(", ")}`,
      });
    }

    // Validar completed si se envía
    if (completed !== undefined && typeof completed !== "boolean") {
      return res.status(400).json({
        error: "El campo completed debe ser true o false.",
      });
    }

    const actualizada = taskService.actualizarTarea(req.params.id, {
      text: text?.trim(),
      category,
      priority,
      completed,
    });

    res.json(actualizada);
  } catch (err) {
    next(err);
  }
}

// ─── DELETE /api/v1/tasks/:id ────────────────────────────
function eliminarTarea(req, res, next) {
  try {
    taskService.eliminarTarea(req.params.id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

module.exports = {
  obtenerTodas,
  obtenerPorId,
  crearTarea,
  actualizarTarea,
  eliminarTarea,
};
