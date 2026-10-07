'use strict';

const { Router } = require('express');
const contenidoController = require('../controllers/contenido.controller');
const { authenticate, requireRole } = require('../middleware/auth.middleware');

const router = Router();

// RF-18 — lectura de lecciones con sesión de estudiante.
router.use(authenticate, requireRole('ESTUDIANTE'));
router.get('/lecciones/:id', contenidoController.leccionDetalle);

module.exports = router;
