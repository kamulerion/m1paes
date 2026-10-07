'use strict';

const avanceRepository = require('../repositories/avance.repository');

/**
 * RF-13 — Panel de progreso del estudiante (CP-18).
 * El porcentaje por eje es el promedio del PROGRESO de sus contenidos
 * (los contenidos sin prácticas cuentan como 0 %).
 */
async function ver(req, res, next) {
  try {
    const idEstudiante = req.sesion.sub;
    const [porEjes, resumen, historial] = await Promise.all([
      avanceRepository.progresoPorEje(idEstudiante),
      avanceRepository.resumen(idEstudiante),
      avanceRepository.historial(idEstudiante),
    ]);
    const global =
      porEjes.length === 0
        ? 0
        : Math.round((porEjes.reduce((suma, eje) => suma + eje.porcentaje, 0) /
          porEjes.length) * 10) / 10;
    res.json({ ejes: porEjes, global, resumen, historial });
  } catch (err) {
    next(err);
  }
}

module.exports = { ver };
