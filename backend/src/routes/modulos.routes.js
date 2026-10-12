
const express = require('express');
const router = express.Router();

const requireAuth = require('../middlewares/auth.middleware');
const modulosController = require('../controllers/modulos.controller');
const asesorasController = require('../controllers/asesoras.controller');
const asignacionController = require('../controllers/asignacion-asesoras.controller');
const programacionController = require(
  '../controllers/programacion-modulos.controller'
);

router.get(
  '/curso/:idCurso',
  (req, res, next) => {
    console.log('🔎 DIAGNÓSTICO MÓDULOS:', {
      sessionID: req.sessionID,
      sessionExiste: Boolean(req.session),
      usuario: req.session?.usuario
    });

    next();
  },
  requireAuth,
  modulosController.obtenerModulos
);

router.post(
  '/curso/:idCurso',
  requireAuth,
  modulosController.crearModulo
);

router.get(
  '/asesoras/monitoras',
  requireAuth,
  asesorasController.obtenerAsesorasMonitoras
);

router.put(
  '/:id',
  requireAuth,
  modulosController.actualizarModulo
);

router.delete(
  '/:id',
  requireAuth,
  modulosController.eliminarModulo
);
router.post(
  '/asignacion/preview',
  requireAuth,
  asignacionController.previsualizarAsignacion
);

router.post(
  '/curso/:idCurso/multiples',
  requireAuth,
  programacionController.crearMultiplesModulos
);

module.exports = router;