'use strict';

const { Router } = require('express');
const ejercicioController = require('../controllers/ejercicio.controller');
const { authenticate, requireRole } = require('../middleware/auth.middleware');

const router = Router();

// Banco de ejercicios con solución: lo administra el Superadmin (RF-09).
router.use(authenticate, requireRole('SUPERADMIN'));
router.get('/', ejercicioController.listar);
router.get('/:id', ejercicioController.obtener);
router.post('/', ejercicioController.crear);
router.put('/:id', ejercicioController.editar);

module.exports = router;
