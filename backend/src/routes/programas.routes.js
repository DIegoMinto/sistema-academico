const express = require('express');

const programasController = require('../controllers/programas.controller');
const requireAuth = require('../middlewares/auth.middleware');

const router = express.Router();

console.log('📚 ROUTER PROGRAMAS CARGADO');

router.get(
  '/',
  (req, res, next) => {
    console.log('➡️ ENTRÓ A /api/programas');
    next();
  },
  requireAuth,
  programasController.obtenerProgramas
);

module.exports = router;