'use strict';

const { Router } = require('express');
const authController = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth.middleware');
const {
  crearLimitarLogin,
  crearLimitarRecuperacion,
  noStore,
} = require('../middleware/security.middleware');

const router = Router();

// Pulido OWASP (Fase 5, ADR-003): respuestas de autenticación sin caché y
// límites básicos para login y recuperación; alcance de una instancia.
router.use(noStore);
router.post('/registro', authController.registro);
router.post('/login', crearLimitarLogin(), authController.login);
router.post('/logout', authController.logout);
router.get('/sesion', authenticate, authController.sesion);
router.post('/recuperar', crearLimitarRecuperacion(), authController.recuperar);
router.post('/restablecer', authController.restablecer);

module.exports = router;
