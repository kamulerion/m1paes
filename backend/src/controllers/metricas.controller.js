'use strict';

/**
 * RF-17 — Métricas globales de concurrencia y actividad (CP-20).
 * Solo SUPERADMIN (el backend exige requireRole('SUPERADMIN') en la ruta).
 */

const reporteRepository = require('../repositories/reporte.repository');

/** GET /api/admin/metricas — indicadores agregados de la plataforma. */
async function metricas(_req, res, next) {
  try {
    const { concurrencia, actividad, serie } = await reporteRepository.metricasGlobales();
    res.json({ concurrencia, actividad, serie });
  } catch (err) {
    next(err);
  }
}

module.exports = { metricas };
