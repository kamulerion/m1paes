'use strict';

const { Router } = require('express');
const contenidoController = require('../controllers/contenido.controller');
const { authenticate } = require('../middleware/auth.middleware');

const router = Router();

// Ejes con lecciones publicadas: cualquier usuario con sesión (CP-11; base
// del RF-18 que la Fase 3 amplía). Sin respeta el RBAC: estudiantes incluidos.
router.get('/', authenticate, contenidoController.ejesPublicos);

module.exports = router;
