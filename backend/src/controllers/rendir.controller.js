'use strict';

const avanceRepository = require('../repositories/avance.repository');
const ejercicioRepository = require('../repositories/ejercicio.repository');
const simulacroRepository = require('../repositories/simulacro.repository');
const { calcularPuntajeSimulacro } = require('../services/puntaje.service');
const { evaluarRespuesta } = require('../services/retroalimentacion.service');
const { AppError } = require('../utils/AppError');
const { idDeRuta, validarEntero, lanzarSiInvalido } = require('../utils/validate');

/**
 * RF-12 — Simulacros oficiales cronometrados (CP-17).
 *
 * Ciclo de vida del intento sobre HISTORIAL_AVANCE:
 *  1. `intentar`  → crea el intento con puntaje 0 y devuelve las preguntas
 *     SIN `es_correcta` ni solución (imposible adivinar leyendo la BD).
 *  2. `respuestas`→ registra cada alternativa marcada (el servidor decide
 *     si es correcta); solo confirma que quedó guardada: un simulacro
 *     oficial no entrega retroalimentación hasta terminar.
 *  3. `finalizar` → calcula el puntaje 100–1000 y la duración; desde ahí
 *     el intento queda cerrado (puntaje ≥ 100 lo distingue de uno abierto).
 */

/** GET /api/simulacros — listado de simulacros para rendir. */
async function listar(_req, res, next) {
  try {
    res.json({ simulacros: await simulacroRepository.listarParaRendir() });
  } catch (err) {
    next(err);
  }
}

/** Valida que el intento exista, pertenezca al estudiante y esté abierto. */
async function intentoAbierto(idIntento, idEstudiante) {
  const intento = await avanceRepository.porId(idIntento);
  if (!intento || intento.id_estudiante !== idEstudiante) {
    throw new AppError(404, 'Intento no encontrado');
  }
  if (Number(intento.puntaje_obtenido) > 0) {
    throw new AppError(409, 'El intento ya fue finalizado');
  }
  return intento;
}

/** POST /api/simulacros/:id/intentar — inicia un intento cronometrado. */
async function intentar(req, res, next) {
  try {
    const id = idDeRuta(req.params.id);
    const simulacro = await simulacroRepository.porId(id);
    if (!simulacro) throw new AppError(404, 'Simulacro no encontrado');

    const preguntas = await simulacroRepository.preguntasParaRendir(id);
    if (preguntas.length === 0) {
      throw new AppError(400, 'El simulacro no tiene preguntas compuestas');
    }

    const intento = await avanceRepository.crearHistorial({
      idEstudiante: req.sesion.sub,
      idSimulacro: id,
      tipoActividad: 'SIMULACRO_OFICIAL',
    });

    res.status(201).json({
      intento: { id: intento.id_historial, iniciado: intento.fecha_realizacion },
      simulacro: {
        nombre: simulacro.nombre,
        tiempoLimiteMinutos: simulacro.tiempo_limite_minutos,
        totalPreguntas: preguntas.length,
      },
      preguntas,
    });
  } catch (err) {
    next(err);
  }
}

/** PUT /api/simulacros/intentos/:id/respuestas — registra una respuesta. */
async function responder(req, res, next) {
  try {
    const idIntento = idDeRuta(req.params.id);
    const idEstudiante = req.sesion.sub;
    const intento = await intentoAbierto(idIntento, idEstudiante);

    const body = req.body || {};
    const idEjercicio = body.id_ejercicio;
    const idAlternativa = body.id_alternativa;
    if (!Number.isInteger(idEjercicio) || idEjercicio <= 0) {
      throw new AppError(400, 'Datos inválidos', { campos: ['id_ejercicio inválido'] });
    }
    if (!Number.isInteger(idAlternativa) || idAlternativa <= 0) {
      throw new AppError(400, 'Datos inválidos', { campos: ['id_alternativa inválido'] });
    }

    // El ejercicio debe estar compuesto en el simulacro del intento.
    const preguntas = await simulacroRepository.preguntasParaRendir(intento.id_simulacro);
    const pregunta = preguntas.find((p) => p.idEjercicio === idEjercicio);
    if (!pregunta) {
      throw new AppError(400, 'Datos inválidos', {
        campos: ['el ejercicio no pertenece a este simulacro'],
      });
    }
    if (!pregunta.alternativas.some((a) => a.id === idAlternativa)) {
      throw new AppError(400, 'Datos inválidos', {
        campos: ['la alternativa no pertenece al ejercicio'],
      });
    }

    // La corrección ocurre en el servidor con la solución de la BD.
    const completo = await ejercicioRepository.porId(idEjercicio);
    const evaluacion = evaluarRespuesta({
      alternativas: completo.alternativas,
      idAlternativaElegida: idAlternativa,
      explicacionSolucion: completo.explicacion_solucion,
    });

    await avanceRepository.registrarRespuesta({
      idHistorial: idIntento,
      idEstudiante,
      idEjercicio,
      idAlternativa,
      esCorrecta: evaluacion.esCorrecta,
    });

    res.json({ mensaje: 'Respuesta registrada' });
  } catch (err) {
    next(err);
  }
}

/** POST /api/simulacros/intentos/:id/finalizar — cierra y puntúa el intento. */
async function finalizar(req, res, next) {
  try {
    const idIntento = idDeRuta(req.params.id);
    const idEstudiante = req.sesion.sub;
    const intento = await intentoAbierto(idIntento, idEstudiante);

    const duracionMinutos = (req.body || {}).duracion_minutos;
    lanzarSiInvalido([
      validarEntero(duracionMinutos, 'la duración en minutos', 0, intento.tiempo_limite_minutos),
    ]);

    const { respondidas, correctas } = await avanceRepository.contarRespuestas(idIntento);
    const total = await simulacroRepository.preguntasParaRendir(intento.id_simulacro);
    const puntaje = calcularPuntajeSimulacro(correctas, total.length);

    await avanceRepository.finalizarHistorial(idIntento, { puntaje, duracionMinutos });
    const detalle = await avanceRepository.respuestasDelHistorial(idIntento);

    res.json({
      mensaje: 'Simulacro finalizado',
      resultado: {
        puntaje,
        correctas,
        total: total.length,
        respondidas,
        duracionMinutos,
      },
      // Revisión completa: qué se respondió y qué quedó en blanco.
      detalle: total.map((pregunta) => {
        const respuesta = detalle.find((d) => d.id_ejercicio === pregunta.idEjercicio);
        return {
          numero: pregunta.numero,
          idEjercicio: pregunta.idEjercicio,
          esCorrecta: respuesta ? respuesta.es_correcta : null,
        };
      }),
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { listar, intentar, responder, finalizar };
