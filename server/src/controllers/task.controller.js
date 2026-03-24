"use strict";

/**
 * @module controllers/task.controller
 * @description Capa de controladores — orquesta peticiones HTTP y validaciones.
 *
 * Cada función de este módulo:
 *   1. Extrae los datos de la petición (req.body, req.params).
 *   2. Aplica validación defensiva en la frontera de red (antes de tocar el servicio).
 *   3. Invoca al servicio con datos limpios.
 *   4. Formatea y envía la respuesta HTTP con el código de estado correcto.
 *
 * Si la validación falla, responde directamente con 400.
 * Si el servicio lanza una excepción, la pasa al middleware de errores con next(err).
 */

const taskService = require("../services/task.service");

// ─── Valores válidos para validación ─────────────────────

/** @type {string[]} Categorías permitidas por la aplicación. */
const VALID_CATEGORIES = ["Trabajo", "Personal", "Estudio", "Salud", "Gestiones"];

/** @type {string[]} Niveles de prioridad permitidos. */
const VALID_PRIORITIES = ["Alta", "Media", "Baja"];

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isValidDueDate(value) {
  return value === null || (typeof value === "number" && Number.isFinite(value));
}

function isValidOptionalString(value) {
  return value === undefined || typeof value === "string";
}

function isValidOptionalNullableString(value) {
  return value === undefined || value === null || typeof value === "string";
}

function isValidCompletedAt(value) {
  return value === null || (typeof value === "number" && Number.isFinite(value));
}

function validarTareaSincronizada(task, index) {
  if (!isPlainObject(task)) {
    return { ok: false, error: `La tarea en la posición ${index} debe ser un objeto JSON.` };
  }

  if (typeof task.id !== "string" || task.id.trim() === "") {
    return { ok: false, error: `La tarea en la posición ${index} debe incluir un id válido.` };
  }

  if (typeof task.text !== "string" || task.text.trim().length < 3) {
    return { ok: false, error: `La tarea en la posición ${index} debe incluir un texto de al menos 3 caracteres.` };
  }

  if (!VALID_CATEGORIES.includes(task.category)) {
    return { ok: false, error: `La tarea en la posición ${index} tiene una categoría no válida.` };
  }

  if (!VALID_PRIORITIES.includes(task.priority)) {
    return { ok: false, error: `La tarea en la posición ${index} tiene una prioridad no válida.` };
  }

  if (typeof task.completed !== "boolean") {
    return { ok: false, error: `La tarea en la posición ${index} debe incluir completed como booleano.` };
  }

  if (typeof task.createdAt !== "number" || !Number.isFinite(task.createdAt)) {
    return { ok: false, error: `La tarea en la posición ${index} debe incluir createdAt como timestamp numérico.` };
  }

  if (!isValidCompletedAt(task.completedAt ?? null)) {
    return { ok: false, error: `La tarea en la posición ${index} debe incluir completedAt como timestamp numérico o null.` };
  }

  if (!isValidDueDate(task.dueDate ?? null)) {
    return { ok: false, error: `La tarea en la posición ${index} debe incluir dueDate como timestamp numérico o null.` };
  }

  if (typeof task.notes !== "string") {
    return { ok: false, error: `La tarea en la posición ${index} debe incluir notes como texto.` };
  }

  if (!isValidOptionalNullableString(task.project ?? null)) {
    return { ok: false, error: `La tarea en la posición ${index} debe incluir project como texto o null.` };
  }

  return {
    ok: true,
    task: {
      id: task.id.trim(),
      text: task.text.trim(),
      category: task.category,
      priority: task.priority,
      completed: task.completed,
      createdAt: task.createdAt,
      completedAt: task.completedAt ?? null,
      dueDate: task.dueDate ?? null,
      notes: task.notes.trim(),
      project: task.project === null ? null : task.project?.trim() || null,
    },
  };
}

// ─── GET /api/v1/tasks ───────────────────────────────────

/**
 * Devuelve todas las tareas.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
function obtenerTodas(req, res) {
  const tasks = taskService.obtenerTodas();
  res.json(tasks);
}

// ─── GET /api/v1/tasks/:id ───────────────────────────────

/**
 * Devuelve una tarea por su ID.
 * @param {import('express').Request} req — req.params.id contiene el UUID.
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next — Pasa errores al middleware global.
 */
function obtenerPorId(req, res, next) {
  try {
    const task = taskService.obtenerPorId(req.params.id);
    res.json(task);
  } catch (err) {
    next(err);
  }
}

// ─── POST /api/v1/tasks ──────────────────────────────────

/**
 * Crea una nueva tarea tras validar los datos de entrada.
 * Responde con 201 (Created) si tiene éxito.
 * Responde con 400 si la validación falla.
 * @param {import('express').Request} req — req.body contiene { text, category, priority, dueDate, notes, project }.
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
function crearTarea(req, res, next) {
  try {
    if (!isPlainObject(req.body)) {
      return res.status(400).json({
        error: "El cuerpo de la petición debe ser un objeto JSON.",
      });
    }

    const { text, category, priority, dueDate, notes, project } = req.body;

    // Validación defensiva del texto (campo obligatorio)
    if (!text || typeof text !== "string" || text.trim().length < 3) {
      return res.status(400).json({
        error: "El texto es obligatorio y debe tener al menos 3 caracteres.",
      });
    }

    // Validación de categoría (opcional, pero si se envía debe ser válida)
    if (category && !VALID_CATEGORIES.includes(category)) {
      return res.status(400).json({
        error: `Categoría no válida. Opciones: ${VALID_CATEGORIES.join(", ")}`,
      });
    }

    // Validación de prioridad (opcional, pero si se envía debe ser válida)
    if (priority && !VALID_PRIORITIES.includes(priority)) {
      return res.status(400).json({
        error: `Prioridad no válida. Opciones: ${VALID_PRIORITIES.join(", ")}`,
      });
    }

    if (!isValidDueDate(dueDate ?? null)) {
      return res.status(400).json({
        error: "La fecha límite debe ser un timestamp numérico o null.",
      });
    }

    if (!isValidOptionalString(notes)) {
      return res.status(400).json({
        error: "Las notas deben ser un texto.",
      });
    }

    if (!isValidOptionalNullableString(project)) {
      return res.status(400).json({
        error: "El proyecto debe ser un texto o null.",
      });
    }

    const nueva = taskService.crearTarea({
      text: text.trim(),
      category,
      priority,
      dueDate: dueDate ?? null,
      notes: notes?.trim() ?? "",
      project: project?.trim() || null,
    });

    res.status(201).json(nueva);
  } catch (err) {
    next(err);
  }
}

// ─── PATCH /api/v1/tasks/:id ─────────────────────────────

/**
 * Actualiza parcialmente una tarea existente.
 * Solo modifica los campos incluidos en el cuerpo de la petición.
 * Responde con 200 y la tarea actualizada.
 * @param {import('express').Request} req — req.params.id + req.body con campos a modificar.
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
function actualizarTarea(req, res, next) {
  try {
    if (!isPlainObject(req.body)) {
      return res.status(400).json({
        error: "El cuerpo de la petición debe ser un objeto JSON.",
      });
    }

    const { text, category, priority, completed, dueDate, notes, project } = req.body;

    // Validar que se envía al menos un campo para actualizar
    if (
      text === undefined && category === undefined && priority === undefined &&
      completed === undefined && dueDate === undefined && notes === undefined &&
      project === undefined
    ) {
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

    // Validar completed si se envía (debe ser booleano estricto)
    if (completed !== undefined && typeof completed !== "boolean") {
      return res.status(400).json({
        error: "El campo completed debe ser true o false.",
      });
    }

    if (dueDate !== undefined && !isValidDueDate(dueDate)) {
      return res.status(400).json({
        error: "La fecha límite debe ser un timestamp numérico o null.",
      });
    }

    if (!isValidOptionalString(notes)) {
      return res.status(400).json({
        error: "Las notas deben ser un texto.",
      });
    }

    if (!isValidOptionalNullableString(project)) {
      return res.status(400).json({
        error: "El proyecto debe ser un texto o null.",
      });
    }

    const actualizada = taskService.actualizarTarea(req.params.id, {
      text: text?.trim(),
      category,
      priority,
      completed,
      dueDate,
      notes: notes?.trim(),
      project: project === undefined ? undefined : (project?.trim() || null),
    });

    res.json(actualizada);
  } catch (err) {
    next(err);
  }
}

// ─── PUT /api/v1/tasks ───────────────────────────────────

/**
 * Sincronización masiva: reemplaza todas las tareas del servidor
 * con el array enviado por el frontend.
 *
 * Se usa solo para operaciones masivas del frontend, como reordenación,
 * vaciado de completadas, deshacer borrados o carga de ejemplos.
 * Las operaciones normales usan POST, PATCH y DELETE.
 *
 * Responde con 200 y el array resultante.
 * @param {import('express').Request} req — req.body debe ser un Array de tareas.
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
function sincronizarTodas(req, res, next) {
  try {
    const tasks = req.body;

    if (!Array.isArray(tasks)) {
      return res.status(400).json({
        error: "El cuerpo debe ser un array de tareas.",
      });
    }

    const normalizedTasks = [];

    for (const [index, task] of tasks.entries()) {
      const validation = validarTareaSincronizada(task, index);
      if (!validation.ok) {
        return res.status(400).json({ error: validation.error });
      }
      normalizedTasks.push(validation.task);
    }

    taskService.reemplazarTodas(normalizedTasks);
    res.json(taskService.obtenerTodas());
  } catch (err) {
    next(err);
  }
}

// ─── DELETE /api/v1/tasks/:id ────────────────────────────

/**
 * Elimina una tarea por su ID.
 * Responde con 204 (No Content) si tiene éxito — sin cuerpo de respuesta.
 * @param {import('express').Request} req — req.params.id contiene el UUID.
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
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
  sincronizarTodas,
  eliminarTarea,
};
