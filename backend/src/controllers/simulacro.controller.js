'use strict';

const simulacroRepository = require('../repositories/simulacro.repository');
const { AppError } = require('../utils/AppError');
const {
  validarObligatorio,
  validarEntero,
  lanzarSiInvalido,
  idDeRuta,
} = require('../utils/validate');

// Parámetros oficiales de la PAES (defaults del esquema e informe v3, RF-10).
const CANTIDAD_DEFECTO = 65;
const TIEMPO_DEFECTO = 140;

/** Valida los parámetros de un simulacro si vienen en el cuerpo. */
function validarParametros(body) {
  const errores = [];
  if (body.nombre !== undefined) {
    errores.push(validarObligatorio(String(body.nombre).trim(), 'el nombre', 120, 3));
  }
  if (body.cantidad_preguntas !== undefined) {
    errores.push(validarEntero(body.cantidad_preguntas, 'la cantidad de preguntas', 1, 120));
  }
  if (body.tiempo_limite_minutos !== undefined) {
    errores.push(validarEntero(body.tiempo_limite_minutos, 'el tiempo límite', 1, 300));
  }
  lanzarSiInvalido(errores);
}

/** GET /api/admin/simulacros — listado con preguntas armadas. */
async function listar(_req, res, next) {
  try {
    res.json({ simulacros: await simulacroRepository.listar() });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/admin/simulacros — parametriza un simulacro (RF-10, CP-13).
 * Sin parámetros adicionales queda con el formato oficial: 65 preguntas / 140 min.
 */
async function crear(req, res, next) {
  try {
    const body = req.body || {};
    const nombre = String(body.nombre ?? '').trim();
    lanzarSiInvalido([
      validarObligatorio(nombre, 'el nombre', 120, 3),
    ]);
    validarParametros(body);

    const simulacro = await simulacroRepository.crear({
      idAdminCreador: req.sesion.sub,
      nombre,
      cantidadPreguntas: body.cantidad_preguntas ?? CANTIDAD_DEFECTO,
      tiempoLimiteMinutos: body.tiempo_limite_minutos ?? TIEMPO_DEFECTO,
    });
    res.status(201).json({ mensaje: 'Simulacro parametrizado', simulacro });
  } catch (err) {
    next(err);
  }
}

/** PUT /api/admin/simulacros/:id — ajusta nombre, cantidad o tiempo. */
async function editar(req, res, next) {
  try {
    const id = idDeRuta(req.params.id);
    if (!(await simulacroRepository.porId(id))) throw new AppError(404, 'Simulacro no encontrado');
    const body = req.body || {};
    validarParametros(body);
    const cambios = {};
    if (body.nombre !== undefined) cambios.nombre = String(body.nombre).trim();
    if (body.cantidad_preguntas !== undefined) cambios.cantidad_preguntas = body.cantidad_preguntas;
    if (body.tiempo_limite_minutos !== undefined) cambios.tiempo_limite_minutos = body.tiempo_limite_minutos;
    if (Object.keys(cambios).length === 0) throw new AppError(400, 'No hay cambios para guardar');

    const simulacro = await simulacroRepository.actualizar(id, cambios);
    res.json({ mensaje: 'Simulacro actualizado', simulacro });
  } catch (err) {
    next(err);
  }
}

/** GET /api/admin/simulacros/:id/preguntas — composición actual (nº 1..n). */
async function preguntas(req, res, next) {
  try {
    const id = idDeRuta(req.params.id);
    if (!(await simulacroRepository.porId(id))) throw new AppError(404, 'Simulacro no encontrado');
    res.json({ preguntas: await simulacroRepository.preguntas(id) });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/admin/simulacros/:id/preguntas — compone el simulacro con la lista
 * ordenada de ejercicios (número de pregunta = posición). No puede superar
 * la cantidad parametrizada; la lista vacía deja el simulacro sin preguntas.
 */
async function componer(req, res, next) {
  try {
    const id = idDeRuta(req.params.id);
    const simulacro = await simulacroRepository.porId(id);
    if (!simulacro) throw new AppError(404, 'Simulacro no encontrado');

    const lista = (req.body || {}).id_ejercicios;
    if (!Array.isArray(lista)) {
      throw new AppError(400, 'Datos inválidos', { campos: ['id_ejercicios debe ser una lista'] });
    }
    if (lista.some((valor) => !Number.isInteger(valor) || valor <= 0)) {
      throw new AppError(400, 'Datos inválidos', { campos: ['id_ejercicios debe contener enteros positivos'] });
    }
    if (new Set(lista).size !== lista.length) {
      throw new AppError(400, 'Datos inválidos', { campos: ['id_ejercicios no debe repetir ejercicios'] });
    }
    if (lista.length > simulacro.cantidad_preguntas) {
      throw new AppError(400, 'Datos inválidos', {
        campos: [`la composición supera las ${simulacro.cantidad_preguntas} preguntas parametrizadas`],
      });
    }

    const cantidad = await simulacroRepository.reemplazarPreguntas(id, lista);
    res.json({
      mensaje: `Simulacro compuesto con ${cantidad} pregunta(s)`,
      preguntas: await simulacroRepository.preguntas(id),
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { listar, crear, editar, preguntas, componer };
