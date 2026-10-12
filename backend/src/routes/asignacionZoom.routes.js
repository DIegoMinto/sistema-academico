
const express = require('express');

const router = express.Router();
const requireAuth = require('../middlewares/auth.middleware');

const controller = require('../controllers/asignacionZoom.controller');

router.get(
  '/',
  requireAuth,
  controller.obtenerAsignaciones
);

router.post(
  '/validar',
  requireAuth,
  controller.previsualizarAsignacion
);

router.put(
  '/modulo/:idModulo',
  requireAuth,
  controller.guardarAsignacion
);

router.delete(
  '/modulo/:idModulo',
  requireAuth,
  controller.eliminarAsignacion
);

module.exports = router;
