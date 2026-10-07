'use strict';

/**
 * Puntaje de los simulacros oficiales (RF-12 — CP-17).
 * Escala 100–1000 como indica el informe: 100 puntos base + 900
 * proporcionales a los aciertos. Garantiza el rango completo:
 * 0 aciertos → 100 · todos → 1000.
 *
 * @param {number} correctas aciertos del estudiante
 * @param {number} total preguntas compuestas del simulacro (> 0)
 * @returns {number} puntaje entero entre 100 y 1000
 */
function calcularPuntajeSimulacro(correctas, total) {
  if (!Number.isInteger(correctas) || !Number.isInteger(total)) {
    throw new Error('el puntaje se calcula con enteros');
  }
  if (total <= 0 || correctas < 0 || correctas > total) {
    throw new Error('valores de puntaje fuera de rango');
  }
  const puntaje = 100 + Math.round((correctas / total) * 900);
  return Math.min(1000, Math.max(100, puntaje));
}

module.exports = { calcularPuntajeSimulacro };
