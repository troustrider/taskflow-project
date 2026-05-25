"use strict";

/**
 * @module config/swagger
 * @description Configuración de Swagger (OpenAPI 3.0) para documentación interactiva.
 *
 * Usa swagger-jsdoc para generar la especificación OpenAPI a partir de
 * comentarios JSDoc con formato @openapi en los archivos de rutas.
 *
 * La documentación resultante se monta en /api/docs via swagger-ui-express.
 */

const path = require("path");
const swaggerJsdoc = require("swagger-jsdoc");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "TaskFlow API",
      version: "1.0.0",
      description:
        "API REST para gestionar tareas del proyecto TaskFlow. " +
        "Construida con Node.js y Express como parte del bootcamp InfraOps de Corner Estudios.",
      contact: {
        name: "Bootcamp InfraOps — Corner Estudios",
      },
    },
    servers: [
      {
        url: "http://localhost:3000",
        description: "Servidor de desarrollo local",
      },
    ],
    components: {
      schemas: {
        Task: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid", example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890" },
            text: { type: "string", example: "Preparar presentación Q2" },
            category: { type: "string", enum: ["Trabajo", "Personal", "Estudio", "Salud", "Gestiones"], example: "Trabajo" },
            priority: { type: "string", enum: ["Alta", "Media", "Baja"], example: "Alta" },
            completed: { type: "boolean", example: false },
            createdAt: { type: "number", description: "Timestamp Unix en milisegundos", example: 1710850000000 },
            completedAt: { type: "number", nullable: true, example: null },
            dueDate: { type: "number", nullable: true, description: "Timestamp de fecha límite", example: 1710936400000 },
            notes: { type: "string", example: "Incluir gráficos de Q1" },
            project: { type: "string", nullable: true, example: "Sprint 14" },
          },
        },
        TaskInput: {
          type: "object",
          required: ["text"],
          properties: {
            text: { type: "string", minLength: 3, example: "Estudiar para el examen" },
            category: { type: "string", enum: ["Trabajo", "Personal", "Estudio", "Salud", "Gestiones"], example: "Estudio" },
            priority: { type: "string", enum: ["Alta", "Media", "Baja"], example: "Alta" },
            dueDate: { type: "number", nullable: true, example: 1710936400000 },
            notes: { type: "string", example: "Capítulos 3 y 4" },
            project: { type: "string", nullable: true, example: "Sprint 14" },
          },
        },
        TaskUpdate: {
          type: "object",
          properties: {
            text: { type: "string", minLength: 3 },
            category: { type: "string", enum: ["Trabajo", "Personal", "Estudio", "Salud", "Gestiones"] },
            priority: { type: "string", enum: ["Alta", "Media", "Baja"] },
            completed: { type: "boolean" },
            dueDate: { type: "number", nullable: true },
            notes: { type: "string" },
            project: { type: "string", nullable: true },
          },
        },
        Error: {
          type: "object",
          properties: {
            error: { type: "string", example: "Recurso no encontrado" },
          },
        },
      },
    },
  },
  // Ruta absoluta para que funcione tanto en local como en Vercel (serverless),
  // donde el CWD no es predecible. __dirname apunta a server/src/config/.
  apis: [path.resolve(__dirname, "../routes/*.js")],
};

module.exports = swaggerJsdoc(options);
