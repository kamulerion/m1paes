'use strict';

const { Router } = require('express');
const estudiantesController = require('../controllers/estudiantes.controller');
const reporteController = require('../controllers/reporte.controller');
const calendarioController = require('../controllers/calendario.controller');
const { authenticate, requireRole, cargarInstitucion } = require('../middleware/auth.middleware');

const router = Router();

// Panel del Admin de Institución (Fase 4): rol ADMIN_INSTITUCION y SIEMPRE
// sobre su propia sede (req.idInstitucion); cualquier otra sesión recibe 403.
router.use(authenticate, requireRole('ADMIN_INSTITUCION'), cargarInstitucion);

// RF-07 — matrícula, edición y baja de estudiantes de la sede (CP-09)
router.get('/estudiantes', estudiantesController.listar);
router.post('/estudiantes', estudiantesController.crear);
router.put('/estudiantes/:id', estudiantesController.editar);
router.delete('/estudiantes/:id', estudiantesController.eliminar);

// RF-14 — reporte consolidado de rendimiento de la sede (CP-19)
router.get('/reporte', reporteController.reporte);

// RF-16 — calendario de ensayos de la sede (CP-10)
router.get('/calendario', calendarioController.listar);
router.post('/calendario', calendarioController.crear);
router.put('/calendario/:id', calendarioController.editar);
router.delete('/calendario/:id', calendarioController.eliminar);

module.exports = router;
