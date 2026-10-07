'use strict';

const { evaluarRespuesta } = require('../src/services/retroalimentacion.service');
const { calcularPuntajeSimulacro } = require('../src/services/puntaje.service');
const { AppError } = require('../src/utils/AppError');

/**
 * Pruebas unitarias de las reglas de negocio de la Fase 3 (nivel U de la
 * matriz CP-15, CP-16 y CP-17). Corren con `npm test` (sin BD).
 */

const alternativas = [
  { id_alternativa: 11, texto: '6', es_correcta: false },
  { id_alternativa: 12, texto: '9', es_correcta: true },
  { id_alternativa: 13, texto: '12', es_correcta: false },
  { id_alternativa: 14, texto: '18', es_correcta: false },
];

describe('RF-11 — retroalimentación inmediata (nivel U)', () => {
  test('CP-15: responder correctamente produce la retroalimentación de éxito', () => {
    const resultado = evaluarRespuesta({
      alternativas,
      idAlternativaElegida: 12,
      explicacionSolucion: '3 grupos de 3 unidades dan 9.',
    });
    expect(resultado.esCorrecta).toBe(true);
    expect(resultado.mensaje).toMatch(/correcto/i);
    expect(resultado.explicacion).toBe('3 grupos de 3 unidades dan 9.');
    // El acierto no necesita revelar la alternativa correcta adicional.
    expect(resultado.alternativaCorrecta).toBeUndefined();
  });

  test('CP-16: responder incorrectamente entrega la solución paso a paso', () => {
    const resultado = evaluarRespuesta({
      alternativas,
      idAlternativaElegida: 11,
      explicacionSolucion: '3 grupos de 3 unidades dan 9.',
    });
    expect(resultado.esCorrecta).toBe(false);
    expect(resultado.mensaje).toMatch(/incorrecta/i);
    expect(resultado.explicacion).toBe('3 grupos de 3 unidades dan 9.');
    expect(resultado.alternativaCorrecta).toEqual({ id: 12, texto: '9' });
  });

  test('una alternativa que no pertenece al ejercicio responde 400', () => {
    expect(() =>
      evaluarRespuesta({ alternativas, idAlternativaElegida: 999, explicacionSolucion: 'x' })
    ).toThrow(AppError);
    try {
      evaluarRespuesta({ alternativas, idAlternativaElegida: 999, explicacionSolucion: 'x' });
    } catch (error) {
      expect(error.status).toBe(400);
    }
  });
});

describe('RF-12 — puntaje del simulacro 100–1000 (nivel U)', () => {
  test('sin aciertos queda en el mínimo (100)', () => {
    expect(calcularPuntajeSimulacro(0, 65)).toBe(100);
  });

  test('con todos los aciertos queda en el máximo (1000)', () => {
    expect(calcularPuntajeSimulacro(65, 65)).toBe(1000);
  });

  test('la mitad de aciertos produce 550', () => {
    expect(calcularPuntajeSimulacro(5, 10)).toBe(550);
  });

  test('un cuarto de aciertos produce 325', () => {
    expect(calcularPuntajeSimulacro(1, 4)).toBe(325);
  });

  test('valores inválidos lanzan error (no puntajes imposibles)', () => {
    expect(() => calcularPuntajeSimulacro(0, 0)).toThrow();
    expect(() => calcularPuntajeSimulacro(7, 5)).toThrow();
    expect(() => calcularPuntajeSimulacro(1.5, 5)).toThrow();
  });
});
