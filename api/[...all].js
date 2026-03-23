"use strict";

/**
 * Entry point para Vercel Serverless Functions.
 *
 * Cualquier request que llegue a /api/* se resuelve aquí y se delega
 * en la app Express definida en server/src/index.js.
 */
module.exports = require("../server/src/index");
