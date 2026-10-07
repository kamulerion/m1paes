'use strict';

const { Router } = require('express');
const calendarioController = require('../controllers/calendario.controller');
const { authenticate, requireRole } = require('../middleware/auth.middleware');

const router = Router();

// Vista estudiante del calendario (RF-16/CP-10): cada estudiante ve los
// eventos publicados de SU sede; el Estudiante Free (sin sede) recibe [].
router.get('/', authenticate, requireRole('ESTUDIANTE'), calendarioController.ver);

module.exports = router;
