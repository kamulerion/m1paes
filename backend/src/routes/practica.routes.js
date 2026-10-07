'use strict';

const { Router } = require('express');
const practicaController = require('../controllers/practica.controller');
const { authenticate, requireRole } = require('../middleware/auth.middleware');

const router = Router();

// RF-11 — práctica de ejercicios: exclusiva del rol Estudiante.
router.use(authenticate, requireRole('ESTUDIANTE'));
router.get('/ejercicios/:id', practicaController.obtenerEjercicio);
router.post('/ejercicios/:id/respuesta', practicaController.responder);

module.exports = router;
