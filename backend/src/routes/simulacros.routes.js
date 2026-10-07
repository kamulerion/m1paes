'use strict';

const { Router } = require('express');
const simulacroController = require('../controllers/simulacro.controller');
const { authenticate, requireRole } = require('../middleware/auth.middleware');

const router = Router();

// Simulacros oficiales (65 preguntas / 140 min): los parametriza el Superadmin (RF-10).
router.use(authenticate, requireRole('SUPERADMIN'));
router.get('/', simulacroController.listar);
router.post('/', simulacroController.crear);
router.put('/:id', simulacroController.editar);
router.get('/:id/preguntas', simulacroController.preguntas);
router.put('/:id/preguntas', simulacroController.componer);

module.exports = router;
