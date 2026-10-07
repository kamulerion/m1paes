'use strict';

const { Router } = require('express');
const controller = require('../controllers/database-admin.controller');
const { authenticate, requireRole } = require('../middleware/auth.middleware');

const router = Router();
router.use(authenticate, requireRole('SUPERADMIN'));
router.get('/tables', controller.tablas);
router.get('/tables/:nombre', controller.verTabla);
router.post('/query', controller.consultar);

module.exports = router;
