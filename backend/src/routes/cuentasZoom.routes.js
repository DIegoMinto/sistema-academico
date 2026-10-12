const express = require('express');

const cuentasZoomController =
  require('../controllers/cuentasZoom.controller');

const requireAuth =
  require('../middlewares/auth.middleware');

const router = express.Router();

router.get(
  '/',
  requireAuth,
  cuentasZoomController.obtenerCuentas
);

router.get(
  '/:id',
  requireAuth,
  cuentasZoomController.obtenerCuenta
);

router.post(
  '/',
  requireAuth,
  cuentasZoomController.crearCuenta
);

router.put(
  '/:id',
  requireAuth,
  cuentasZoomController.actualizarCuenta
);

router.put(
  '/:id/estado',
  requireAuth,
  cuentasZoomController.actualizarEstado
);

router.delete(
  '/:id',
  requireAuth,
  cuentasZoomController.eliminarCuenta
);

module.exports = router;