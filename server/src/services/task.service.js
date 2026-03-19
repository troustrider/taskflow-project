"use strict";

// Persistencia simulada en memoria (sustituirá a una base de datos en el futuro)
let tasks = [];

/**
 * Devuelve todas las tareas.
 */
function obtenerTodas() {
  return tasks;
}

/**
 * Busca una tarea por su ID.
 * Si no existe, lanza un error con mensaje "NOT_FOUND".
 */
function obtenerPorId(id) {
  const task = tasks.find((t) => t.id === id);

  if (!task) {
    throw new Error("NOT_FOUND");
  }

  return task;
}

/**
 * Crea una nueva tarea y la añade al array.
 * Devuelve la tarea creada con su ID generado.
 */
function crearTarea(data) {
  const nueva = {
    id: crypto.randomUUID(),
    text: data.text,
    category: data.category || "Personal",
    priority: data.priority || "Media",
    completed: false,
    createdAt: Date.now(),
    completedAt: null,
  };

  tasks.unshift(nueva);
  return nueva;
}

/**
 * Actualiza parcialmente una tarea existente.
 * Si no existe, lanza un error con mensaje "NOT_FOUND".
 */
function actualizarTarea(id, data) {
  const task = obtenerPorId(id);

  if (data.text !== undefined) task.text = data.text;
  if (data.category !== undefined) task.category = data.category;
  if (data.priority !== undefined) task.priority = data.priority;
  if (data.completed !== undefined) {
    task.completed = data.completed;
    task.completedAt = data.completed ? Date.now() : null;
  }

  return task;
}

/**
 * Elimina una tarea por su ID.
 * Si no existe, lanza un error con mensaje "NOT_FOUND".
 */
function eliminarTarea(id) {
  const index = tasks.findIndex((t) => t.id === id);

  if (index === -1) {
    throw new Error("NOT_FOUND");
  }

  tasks.splice(index, 1);
}

module.exports = {
  obtenerTodas,
  obtenerPorId,
  crearTarea,
  actualizarTarea,
  eliminarTarea,
};
