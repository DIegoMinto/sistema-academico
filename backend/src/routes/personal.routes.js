const express = require('express');

const personalController = require('../controllers/personal.controller');
const requireAuth = require('../middlewares/auth.middleware');

const router = express.Router();

router.get(
  '/',
  requireAuth,
  personalController.obtenerPersonal
);

router.put(
  '/:id_persona/monitorea',
  requireAuth,
  personalController.actualizarMonitoreo
);

module.exports = router;