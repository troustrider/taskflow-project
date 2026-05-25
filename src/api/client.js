"use strict";

/**
 * @fileoverview Capa de red del frontend — cliente HTTP para la API de TaskFlow.
 *
 * Este archivo sustituye a localStorage como fuente de datos.
 * Cada función corresponde a un endpoint del backend Express:
 *
 *   apiCargarTareas()         → GET    /api/v1/tasks
 *   apiCrearTarea(data)       → POST   /api/v1/tasks
 *   apiActualizarTarea(id, d) → PATCH  /api/v1/tasks/:id
 *   apiEliminarTarea(id)      → DELETE /api/v1/tasks/:id
 *   apiSincronizarTareas(arr) → PUT    /api/v1/tasks (operaciones masivas)
 *
 * Todas las funciones son asíncronas (async/await) porque las peticiones
 * HTTP tardan un tiempo indeterminado en ir y volver por la red — a diferencia
 * de localStorage, que era instantáneo.
 *
 * Se carga en index.html ANTES de app.js para que las funciones estén
 * disponibles cuando app.js las invoque.
 */

// ─── Configuración ───────────────────────────────────────

/**
 * URL base de la API.
 *
 * Usa ruta relativa ("/api/v1/tasks") para que funcione tanto en desarrollo
 * local (http://localhost:3000) como en producción (Vercel), donde frontend
 * y backend se sirven desde el mismo origen.
 *
 * @type {string}
 */
const API_BASE_URL = "/api/v1/tasks";

// ─── Wrapper genérico ────────────────────────────────────

/**
 * Ejecuta una petición HTTP genérica contra la API.
 *
 * Gestiona tres escenarios:
 *   1. Error de red (servidor caído, sin conexión) → lanza Error descriptivo.
 *   2. Respuesta 204 (No Content) → devuelve null (usado por DELETE).
 *   3. Respuesta con error (4xx, 5xx) → lanza Error con el mensaje del servidor.
 *   4. Respuesta exitosa (2xx) → devuelve el JSON parseado.
 *
 * @param {string} url — URL completa del endpoint.
 * @param {RequestInit} [options={}] — Opciones de fetch (method, headers, body).
 * @returns {Promise<Object|Array|null>} Datos de la respuesta o null si 204.
 * @throws {Error} Si la red falla o el servidor responde con error.
 */
async function apiRequest(url, options = {}) {
  let respuesta;

  try {
    respuesta = await fetch(url, options);
  } catch (networkError) {
    throw new Error("No se pudo conectar con el servidor. ¿Está corriendo?");
  }

  // DELETE exitoso devuelve 204 sin cuerpo
  if (respuesta.status === 204) {
    return null;
  }

  const datos = await parseResponseBody(respuesta);

  // Si el código HTTP indica error (400, 404, 500...), lanzamos excepción
  // con el mensaje que envió el servidor para que el frontend lo muestre
  if (!respuesta.ok) {
    const errorMessage =
      (datos && typeof datos === "object" && typeof datos.error === "string" && datos.error) ||
      (typeof datos === "string" && datos.trim()) ||
      `Error HTTP ${respuesta.status}`;

    throw new Error(errorMessage);
  }

  return datos;
}

async function parseResponseBody(respuesta) {
  const contentType = respuesta.headers.get("content-type") || "";
  const raw = await respuesta.text();

  if (!raw) return null;

  if (contentType.includes("application/json")) {
    try {
      return JSON.parse(raw);
    } catch (parseError) {
      return raw;
    }
  }

  try {
    return JSON.parse(raw);
  } catch (parseError) {
    return raw;
  }
}

// ─── Funciones públicas ──────────────────────────────────

/**
 * Carga todas las tareas desde el servidor.
 * Equivalente al antiguo localStorage.getItem().
 * @returns {Promise<Array<Object>>} Array de tareas.
 */
async function apiCargarTareas() {
  return await apiRequest(API_BASE_URL);
}

/**
 * Envía una nueva tarea al servidor para que la cree.
 * @param {Object} data — Datos de la tarea: { text, category, priority, dueDate, notes, project }.
 * @returns {Promise<Object>} La tarea creada con su ID generado por el servidor.
 */
async function apiCrearTarea(data) {
  return await apiRequest(API_BASE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

/**
 * Envía una actualización parcial de una tarea al servidor.
 * @param {string} id — UUID de la tarea a actualizar.
 * @param {Object} data — Campos a modificar (ej: { completed: true }).
 * @returns {Promise<Object>} La tarea actualizada.
 */
async function apiActualizarTarea(id, data) {
  return await apiRequest(`${API_BASE_URL}/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

/**
 * Solicita al servidor que elimine una tarea.
 * @param {string} id — UUID de la tarea a eliminar.
 * @returns {Promise<null>} Null (el servidor responde 204 sin cuerpo).
 */
async function apiEliminarTarea(id) {
  return await apiRequest(`${API_BASE_URL}/${id}`, {
    method: "DELETE",
  });
}

/**
 * Sincronización masiva: envía el array completo de tareas al servidor.
 * Se usa solo para sincronizaciones masivas: reordenación, completar varias tareas,
 * borrar varias completadas, deshacer eliminaciones y cargar tareas de ejemplo.
 * Las operaciones individuales usan POST, PATCH y DELETE reales.
 *
 * @param {Array<Object>} tasks — Array completo de tareas.
 * @returns {Promise<Array<Object>>} Array confirmado por el servidor.
 */
async function apiSincronizarTareas(tasks) {
  return await apiRequest(API_BASE_URL, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(tasks),
  });
}
