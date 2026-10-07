'use strict';

const { Router } = require('express');
const contenidoController = require('../controllers/contenido.controller');
const { authenticate, requireRole } = require('../middleware/auth.middleware');

const router = Router();

// Ejes temáticos: los estructura el Superadmin (RF-08).
router.use(authenticate, requireRole('SUPERADMIN'));
router.get('/', contenidoController.listarEjes);
router.post('/', contenidoController.crearEje);
router.put('/:id', contenidoController.editarEje);

module.exports = router;
