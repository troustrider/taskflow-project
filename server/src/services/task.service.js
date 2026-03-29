"use strict";

/**
 * @module services/task.service
 * @description Lógica de negocio para la gestión de tareas.
 *
 * Este archivo no sabe nada de Express ni de HTTP. Solo trabaja con
 * arrays y objetos de JavaScript. Así se puede cambiar el framework
 * o añadir tests sin tocar los controladores.
 *
 * Las tareas se guardan en un array en memoria (se pierden al reiniciar).
 */

/** @type {Array<Object>} Array en memoria que almacena las tareas. */
let tasks = [];

/**
 * Devuelve todas las tareas almacenadas.
 * @returns {Array<Object>} Array completo de tareas.
 */
function obtenerTodas() {
  return tasks;
}

/**
 * Busca una tarea por su ID.
 * @param {string} id — UUID de la tarea.
 * @returns {Object} La tarea encontrada.
 * @throws {Error} Con mensaje "NOT_FOUND" si el ID no existe.
 */
function obtenerPorId(id) {
  const task = tasks.find((t) => t.id === id);

  if (!task) {
    throw new Error("NOT_FOUND");
  }

  return task;
}

/**
 * Crea una nueva tarea, le asigna un UUID y la inserta al inicio del array.
 * @param {Object} data — Datos de la tarea.
 * @param {string} data.text — Texto de la tarea (obligatorio, ya validado por el controlador).
 * @param {string} [data.category="Personal"] — Categoría de la tarea.
 * @param {string} [data.priority="Media"] — Prioridad de la tarea.
 * @param {number|null} [data.dueDate=null] — Timestamp de la fecha límite.
 * @param {string} [data.notes=""] — Notas adicionales.
 * @param {string|null} [data.project=null] — Nombre del proyecto asociado.
 * @returns {Object} La tarea creada con su ID generado.
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
    dueDate: data.dueDate ?? null,
    notes: data.notes ?? "",
    project: data.project ?? null,
  };

  tasks.unshift(nueva);
  return nueva;
}

/**
 * Actualiza parcialmente una tarea existente.
 * Solo modifica los campos que se incluyen en el objeto `data`.
 * @param {string} id — UUID de la tarea a actualizar.
 * @param {Object} data — Campos a modificar (todos opcionales).
 * @param {string} [data.text] — Nuevo texto.
 * @param {string} [data.category] — Nueva categoría.
 * @param {string} [data.priority] — Nueva prioridad.
 * @param {boolean} [data.completed] — Nuevo estado de completado.
 * @param {number|null} [data.dueDate] — Nueva fecha límite.
 * @param {string} [data.notes] — Nuevas notas.
 * @param {string|null} [data.project] — Nuevo proyecto.
 * @returns {Object} La tarea actualizada.
 * @throws {Error} Con mensaje "NOT_FOUND" si el ID no existe.
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
  if (data.dueDate !== undefined) task.dueDate = data.dueDate;
  if (data.notes !== undefined) task.notes = data.notes;
  if (data.project !== undefined) task.project = data.project;

  return task;
}

/**
 * Elimina una tarea por su ID.
 * @param {string} id — UUID de la tarea a eliminar.
 * @throws {Error} Con mensaje "NOT_FOUND" si el ID no existe.
 */
function eliminarTarea(id) {
  const index = tasks.findIndex((t) => t.id === id);

  if (index === -1) {
    throw new Error("NOT_FOUND");
  }

  tasks.splice(index, 1);
}

/**
 * Reemplaza el array completo de tareas.
 * Usado por el endpoint PUT /api/v1/tasks para sincronización masiva
 * desde el frontend (el frontend envía su estado completo al servidor).
 * @param {Array<Object>} nuevasTareas — Nuevo array de tareas.
 */
function reemplazarTodas(nuevasTareas) {
  tasks = nuevasTareas.map((task) => ({ ...task }));
}

module.exports = {
  obtenerTodas,
  obtenerPorId,
  crearTarea,
  actualizarTarea,
  eliminarTarea,
  reemplazarTodas,
};
