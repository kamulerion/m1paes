'use strict';

const { Router } = require('express');
const adminController = require('../controllers/admin.controller');
const { authenticate, requireRole } = require('../middleware/auth.middleware');

const router = Router();

// RBAC (CP-22): sesión válida y rol SUPERADMIN; 401 sin sesión y 403 con otro rol.
router.get('/panel', authenticate, requireRole('SUPERADMIN'), adminController.panel);

module.exports = router;
