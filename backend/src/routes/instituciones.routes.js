'use strict';

const { Router } = require('express');
const institucionController = require('../controllers/institucion.controller');
const { authenticate, requireRole } = require('../middleware/auth.middleware');

const router = Router();

// CRUD de instituciones bajo convenio B2B — exclusivo del Superadmin (RF-05).
router.use(authenticate, requireRole('SUPERADMIN'));
router.get('/', institucionController.listar);
router.post('/', institucionController.crear);
router.put('/:id', institucionController.editar);
router.delete('/:id', institucionController.eliminar);

module.exports = router;
