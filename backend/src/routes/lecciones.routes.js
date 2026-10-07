'use strict';

const { Router } = require('express');
const contenidoController = require('../controllers/contenido.controller');
const { authenticate, requireRole } = require('../middleware/auth.middleware');

const router = Router();

// Lecciones (CONTENIDO): estructuración y publicación por Superadmin (RF-08).
router.use(authenticate, requireRole('SUPERADMIN'));
router.get('/', contenidoController.listarLecciones);
router.post('/', contenidoController.crearLeccion);
router.put('/:id', contenidoController.editarLeccion);

module.exports = router;
