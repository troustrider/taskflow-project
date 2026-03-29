/**
 * @module config/env
 * @description Carga las variables de entorno desde .env con dotenv.
 * Si PORT no está definido en local, lanza error para que el servidor
 * no arranque sin configuración. En Vercel, PORT no es necesario.
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
  PORT: Number(process.env.PORT) || 3000,
  NODE_ENV: process.env.NODE_ENV || "development",
};
