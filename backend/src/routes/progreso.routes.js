'use strict';

const { Router } = require('express');
const progresoController = require('../controllers/progreso.controller');
const { authenticate, requireRole } = require('../middleware/auth.middleware');

const router = Router();

// RF-13 — panel de progreso: exclusivo del rol Estudiante.
router.use(authenticate, requireRole('ESTUDIANTE'));
router.get('/', progresoController.ver);

module.exports = router;
