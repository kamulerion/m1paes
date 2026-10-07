'use strict';

/**
 * GET /api/admin/panel — guardián RBAC del panel de Superadmin (CP-22).
 * Stub mínimo en la Fase 1: valida authenticate + requireRole('SUPERADMIN');
 * la Fase 2 lo convierte en los CRUD de instituciones/usuarios (RF-05, RF-06).
 */
async function panel(req, res) {
  res.json({
    mensaje: 'Panel de Superadmin',
    fase: 'pendiente de la Fase 2 (RF-05, RF-06)',
    usuario: { id: req.sesion.sub, rol: req.sesion.rol },
  });
}

module.exports = { panel };
