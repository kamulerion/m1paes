'use strict';

const avanceRepository = require('../repositories/avance.repository');
const ejercicioRepository = require('../repositories/ejercicio.repository');
const { evaluarRespuesta } = require('../services/retroalimentacion.service');
const { AppError } = require('../utils/AppError');
const { idDeRuta } = require('../utils/validate');

/**
 * RF-11 — Práctica de ejercicios con retroalimentación inmediata.
 * El ejercicio se entrega sin `es_correcta` ni solución; la respuesta se
 * evalúa en el servidor (servicio puro, CP-15/CP-16 a nivel unitario) y
 * recién ahí se revela la retroalimentación.
 */

/** GET /api/practica/ejercicios/:id — ejercicio para resolver (sin solución). */
async function obtenerEjercicio(req, res, next) {
  try {
    const id = idDeRuta(req.params.id);
    const ejercicio = await ejercicioRepository.porIdEstudiante(id);
    if (!ejercicio) throw new AppError(404, 'Ejercicio no encontrado');
    res.json({ ejercicio });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/practica/ejercicios/:id/respuesta — evalúa la respuesta,
 * registra el intento y recalcula el progreso del contenido (RF-11/RF-13).
 */
async function responder(req, res, next) {
  try {
    const id = idDeRuta(req.params.id);
    const idAlternativa = (req.body || {}).id_alternativa;
    if (!Number.isInteger(idAlternativa) || idAlternativa <= 0) {
      throw new AppError(400, 'Datos inválidos', { campos: ['id_alternativa inválido'] });
    }

    // La BD entrega la solución; el servicio es quien decide qué se revela.
    const completo = await ejercicioRepository.porId(id);
    if (!completo) throw new AppError(404, 'Ejercicio no encontrado');

    const evaluacion = evaluarRespuesta({
      alternativas: completo.alternativas,
      idAlternativaElegida: idAlternativa,
      explicacionSolucion: completo.explicacion_solucion,
    });

    const idEstudiante = req.sesion.sub;
    const historial = await avanceRepository.crearHistorial({
      idEstudiante,
      idSimulacro: null,
      tipoActividad: 'PRACTICA_LECCION',
    });
    await avanceRepository.registrarRespuesta({
      idHistorial: historial.id_historial,
      idEstudiante,
      idEjercicio: id,
      idAlternativa,
      esCorrecta: evaluacion.esCorrecta,
    });
    const progreso = await avanceRepository.recalcularContenido(idEstudiante, completo.id_contenido);

    res.json({
      ...evaluacion,
      progreso: { porcentaje: progreso.porcentaje, completado: progreso.completado },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { obtenerEjercicio, responder };
