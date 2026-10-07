'use strict';

const { Router } = require('express');
const perfilController = require('../controllers/perfil.controller');
const { authenticate } = require('../middleware/auth.middleware');

const router = Router();

// Todo el recurso exige sesión vigente (RF-04: siempre el propio usuario).
router.use(authenticate);
router.get('/', perfilController.obtener);
router.put('/', perfilController.actualizar);

module.exports = router;
