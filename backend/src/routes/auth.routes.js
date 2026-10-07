'use strict';

const { Router } = require('express');
const authController = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { crearLimitarLogin, noStore } = require('../middleware/security.middleware');

const router = Router();

// Pulido OWASP (Fase 5, ADR-003): respuestas de autenticación sin caché y
// límite de intentos fallidos de login (10 por IP + correo cada 15 min → 429).
router.use(noStore);
router.post('/registro', authController.registro);
router.post('/login', crearLimitarLogin(), authController.login);
router.post('/logout', authController.logout);
router.get('/sesion', authenticate, authController.sesion);
router.post('/recuperar', authController.recuperar);
router.post('/restablecer', authController.restablecer);

module.exports = router;
