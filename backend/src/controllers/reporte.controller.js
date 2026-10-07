'use strict';

/**
 * RF-14 — Reporte consolidado de rendimiento de la sede (CP-19):
 * promedio de puntajes de los simulacros y áreas débiles (ejes con el
 * progreso promedio más bajo, ordenados del más débil al más fuerte).
 * Solo ADMIN_INSTITUCION y SIEMPRE sobre su propia institución.
 */

const institucionRepository = require('../repositories/institucion.repository');
const reporteRepository = require('../repositories/reporte.repository');

/** GET /api/institucion/reporte — reportería consolidada de la sede. */
async function reporte(req, res, next) {
  try {
    const [institucion, resumen, ejes] = await Promise.all([
      institucionRepository.porId(req.idInstitucion),
      reporteRepository.resumenInstitucion(req.idInstitucion),
      reporteRepository.ejesInstitucion(req.idInstitucion),
    ]);

    res.json({
      sede: { id: req.idInstitucion, nombre: institucion?.nombre ?? 'Sede' },
      resumen,
      // CP-19: áreas débiles = eje con menor progreso promedio primero.
      areas_debiles: ejes,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { reporte };
