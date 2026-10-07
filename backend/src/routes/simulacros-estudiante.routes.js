'use strict';

const { Router } = require('express');
const rendirController = require('../controllers/rendir.controller');
const { authenticate, requireRole } = require('../middleware/auth.middleware');

const router = Router();

// RF-12 — rendir simulacros oficiales: exclusivo del rol Estudiante
// (el Superadmin los administra vía /api/admin/simulacros).
router.use(authenticate, requireRole('ESTUDIANTE'));
router.get('/', rendirController.listar);
router.post('/:id/intentar', rendirController.intentar);
router.put('/intentos/:id/respuestas', rendirController.responder);
router.post('/intentos/:id/finalizar', rendirController.finalizar);

module.exports = router;
