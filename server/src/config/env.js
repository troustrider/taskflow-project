/**
 * @module config/env
 * @description Módulo de configuración de variables de entorno.
 *
 * Carga las variables desde el archivo .env usando dotenv y aplica
 * validación estricta: si PORT no está definido y NO estamos en un
 * entorno serverless (Vercel), el servidor se niega a arrancar
 * (principio fail fast de la metodología 12-Factor App).
 *
 * En Vercel, la plataforma gestiona el puerto internamente, por lo que
 * PORT no es obligatorio y se usa un valor por defecto de 3000.
 */

const dotenv = require("dotenv");
const path = require("path");

// Carga el archivo .env desde la raíz de server/ (dos niveles arriba de config/)
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const isServerless = process.env.VERCEL === "1";

if (!process.env.PORT && !isServerless) {
  throw new Error(
    "El puerto no está definido. Asegúrate de crear un archivo .env con PORT=3000"
  );
}

module.exports = {
  /** @type {number} Puerto en el que escucha el servidor HTTP (ignorado en Vercel). */
  PORT: Number(process.env.PORT) || 3000,

  /** @type {string} Entorno de ejecución: "development" | "production" | "test". */
  NODE_ENV: process.env.NODE_ENV || "development",
};
