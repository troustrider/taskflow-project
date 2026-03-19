const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

if (!process.env.PORT) {
  throw new Error("El puerto no está definido. Asegúrate de crear un archivo .env con PORT=3000");
}

module.exports = {
  PORT: Number(process.env.PORT),
  NODE_ENV: process.env.NODE_ENV || "development",
};
