'use strict';

const { Router } = require('express');
const administradoresController = require('../controllers/administradores.controller');
const { authenticate, requireRole } = require('../middleware/auth.middleware');

const router = Router();

// Administradores de Institución: crea y gestiona el Superadmin (RF-06).
router.use(authenticate, requireRole('SUPERADMIN'));
router.get('/', administradoresController.listar);
router.post('/', administradoresController.crear);
router.put('/:id', administradoresController.editar);
router.delete('/:id', administradoresController.eliminar);

module.exports = router;
