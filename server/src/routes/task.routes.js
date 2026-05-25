"use strict";

/**
 * @module routes/task.routes
 * @description Conecta cada verbo HTTP + URL con su controlador.
 * No tiene lógica de negocio. Montado en index.js bajo /api/v1/tasks.
 *
 * GET    /       → obtenerTodas       POST   /       → crearTarea
 * GET    /:id    → obtenerPorId       PUT    /       → sincronizarTodas
 * PATCH  /:id    → actualizarTarea     DELETE /:id    → eliminarTarea
 */

const express = require("express");
const router = express.Router();
const taskController = require("../controllers/task.controller");

/**
 * @openapi
 * /api/v1/tasks:
 *   get:
 *     summary: Listar todas las tareas
 *     description: Devuelve el array completo de tareas almacenadas en memoria.
 *     tags: [Tareas]
 *     responses:
 *       200:
 *         description: Array de tareas (puede estar vacío).
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Task'
 */
router.get("/", taskController.obtenerTodas);

/**
 * @openapi
 * /api/v1/tasks/{id}:
 *   get:
 *     summary: Obtener una tarea por ID
 *     description: Busca una tarea por su UUID y la devuelve.
 *     tags: [Tareas]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID de la tarea.
 *     responses:
 *       200:
 *         description: Tarea encontrada.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Task'
 *       404:
 *         description: Tarea no encontrada.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/:id", taskController.obtenerPorId);

/**
 * @openapi
 * /api/v1/tasks:
 *   post:
 *     summary: Crear una nueva tarea
 *     description: Valida los datos de entrada y crea una tarea con UUID generado por el servidor.
 *     tags: [Tareas]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TaskInput'
 *     responses:
 *       201:
 *         description: Tarea creada con éxito.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Task'
 *       400:
 *         description: Datos de entrada inválidos.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: "El texto es obligatorio y debe tener al menos 3 caracteres."
 */
router.post("/", taskController.crearTarea);

/**
 * @openapi
 * /api/v1/tasks:
 *   put:
 *     summary: Sincronización masiva de tareas
 *     description: |
 *       Reemplaza todas las tareas del servidor con el array enviado por el frontend.
 *       Se reserva para operaciones masivas como reordenación drag-and-drop,
 *       vaciado de completadas, deshacer borrados o carga de ejemplos.
 *       Las operaciones normales usan POST, PATCH y DELETE.
 *     tags: [Tareas]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: array
 *             items:
 *               $ref: '#/components/schemas/Task'
 *     responses:
 *       200:
 *         description: Array resultante tras la sincronización.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Task'
 *       400:
 *         description: El cuerpo no es un array.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: "El cuerpo debe ser un array de tareas."
 */
router.put("/", taskController.sincronizarTodas);

/**
 * @openapi
 * /api/v1/tasks/{id}:
 *   patch:
 *     summary: Actualizar parcialmente una tarea
 *     description: Modifica solo los campos incluidos en el cuerpo. Requiere al menos un campo.
 *     tags: [Tareas]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID de la tarea a actualizar.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TaskUpdate'
 *           example:
 *             completed: true
 *     responses:
 *       200:
 *         description: Tarea actualizada.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Task'
 *       400:
 *         description: Datos inválidos o ningún campo enviado.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Tarea no encontrada.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.patch("/:id", taskController.actualizarTarea);

/**
 * @openapi
 * /api/v1/tasks/{id}:
 *   delete:
 *     summary: Eliminar una tarea
 *     description: Elimina una tarea por su UUID. Responde 204 sin cuerpo si tiene éxito.
 *     tags: [Tareas]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID de la tarea a eliminar.
 *     responses:
 *       204:
 *         description: Tarea eliminada (sin cuerpo de respuesta).
 *       404:
 *         description: Tarea no encontrada.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete("/:id", taskController.eliminarTarea);

module.exports = router;
