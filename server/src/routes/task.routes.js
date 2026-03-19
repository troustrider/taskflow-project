"use strict";

const express = require("express");
const router = express.Router();
const taskController = require("../controllers/task.controller");

router.get("/", taskController.obtenerTodas);
router.get("/:id", taskController.obtenerPorId);
router.post("/", taskController.crearTarea);
router.patch("/:id", taskController.actualizarTarea);
router.delete("/:id", taskController.eliminarTarea);

module.exports = router;
