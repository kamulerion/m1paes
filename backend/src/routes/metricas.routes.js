'use strict';

const { Router } = require('express');
const metricasController = require('../controllers/metricas.controller');
const { authenticate, requireRole } = require('../middleware/auth.middleware');

const router = Router();

// RF-17 — métricas globales de concurrencia y actividad (CP-20): solo
// Superadmin (panel de control global del sistema).
router.get('/', authenticate, requireRole('SUPERADMIN'), metricasController.metricas);

module.exports = router;
