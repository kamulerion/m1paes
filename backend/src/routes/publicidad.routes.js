'use strict';

const { Router } = require('express');
const publicidadController = require('../controllers/publicidad.controller');
const { authenticate } = require('../middleware/auth.middleware');

const router = Router();

// RF-15/CP-21: los anuncios se segmentan por modalidad de la cuenta en
// sesión (FREE → catálogo; INSTITUCIONAL → []). Requiere sesión.
router.get('/', authenticate, publicidadController.listar);

module.exports = router;
