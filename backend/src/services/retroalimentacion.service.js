'use strict';

const { AppError } = require('../utils/AppError');

/**
 * Retroalimentación inmediata de la práctica (RF-11 — CP-15/CP-16).
 * Función pura (sin BD ni HTTP) para poder probarla a nivel unitario:
 *
 * - Acierto → mensaje de éxito (CP-15).
 * - Error → solución paso a paso (`explicacion`) + la alternativa correcta
 *   (CP-16); la solución nunca se revela antes de responder.
 *
 * @param {object} entrada
 * @param {Array<{id_alternativa:number, texto:string, es_correcta:boolean}>} entrada.alternativas
 * @param {number} entrada.idAlternativaElegida alternativa elegida por el estudiante
 * @param {string} entrada.explicacionSolucion explicación escrita por el autor
 */
function evaluarRespuesta({ alternativas, idAlternativaElegida, explicacionSolucion }) {
  if (!Array.isArray(alternativas) || alternativas.length === 0) {
    throw new AppError(500, 'No es posible evaluar la respuesta');
  }
  const elegida = alternativas.find((a) => a.id_alternativa === idAlternativaElegida);
  if (!elegida) {
    throw new AppError(400, 'Datos inválidos', {
      campos: ['la alternativa indicada no pertenece al ejercicio'],
    });
  }
  const correcta = alternativas.find((a) => a.es_correcta);
  if (!correcta) {
    // Integridad del banco: toda alternativa de la BD debe tener una correcta
    // (la valida el RF-09 al crearla).
    throw new AppError(500, 'No es posible evaluar la respuesta');
  }

  const esCorrecta = Boolean(elegida.es_correcta);
  return {
    esCorrecta,
    mensaje: esCorrecta ? '¡Correcto! Has resuelto bien el ejercicio.' : 'Respuesta incorrecta.',
    explicacion: explicacionSolucion,
    ...(esCorrecta
      ? {}
      : { alternativaCorrecta: { id: correcta.id_alternativa, texto: correcta.texto } }),
  };
}

module.exports = { evaluarRespuesta };
