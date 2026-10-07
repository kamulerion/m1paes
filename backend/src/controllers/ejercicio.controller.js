'use strict';

const contenidoRepository = require('../repositories/contenido.repository');
const ejercicioRepository = require('../repositories/ejercicio.repository');
const { AppError } = require('../utils/AppError');
const {
  validarObligatorio,
  validarDificultad,
  validarAlternativas,
  lanzarSiInvalido,
  idDeRuta,
} = require('../utils/validate');

/** Valida los campos comunes de un ejercicio + sus alternativas (RF-09/CP-12). */
function validarEjercicio(body, { requerirContenido = true } = {}) {
  const errores = [];
  if (requerirContenido || body.id_contenido !== undefined) {
    if (!Number.isInteger(body.id_contenido)) errores.push('id_contenido inválido');
  }
  errores.push(
    validarObligatorio(String(body.enunciado ?? '').trim(), 'el enunciado', 20000, 5),
    validarObligatorio(
      String(body.explicacion_solucion ?? '').trim(),
      'la explicación de la solución',
      20000,
      5
    ),
    validarDificultad(body.dificultad)
  );
  if (body.alternativas !== undefined) errores.push(validarAlternativas(body.alternativas));
  lanzarSiInvalido(errores);
}

/** GET /api/admin/ejercicios — banco de ejercicios (filtrable por ?id_contenido=). */
async function listar(req, res, next) {
  try {
    const idContenido = req.query.id_contenido ? idDeRuta(req.query.id_contenido) : null;
    if (idContenido && !(await contenidoRepository.porLeccion(idContenido))) {
      throw new AppError(404, 'Lección no encontrada');
    }
    res.json({ ejercicios: await ejercicioRepository.listar(idContenido) });
  } catch (err) {
    next(err);
  }
}

/** GET /api/admin/ejercicios/:id — ejercicio con sus alternativas. */
async function obtener(req, res, next) {
  try {
    const ejercicio = await ejercicioRepository.porId(idDeRuta(req.params.id));
    if (!ejercicio) throw new AppError(404, 'Ejercicio no encontrado');
    res.json({ ejercicio });
  } catch (err) {
    next(err);
  }
}

/** POST /api/admin/ejercicios — crea ejercicio con 4–5 alternativas (RF-09, CP-12). */
async function crear(req, res, next) {
  try {
    const body = req.body || {};
    validarEjercicio(body);

    if (!(await contenidoRepository.porLeccion(body.id_contenido))) {
      throw new AppError(400, 'Datos inválidos', { campos: ['la lección indicada no existe'] });
    }

    const ejercicio = await ejercicioRepository.crear({
      idContenido: body.id_contenido,
      idAdminCreador: req.sesion.sub,
      enunciado: String(body.enunciado).trim(),
      explicacion: String(body.explicacion_solucion).trim(),
      dificultad: body.dificultad ?? 'MEDIA',
      alternativas: body.alternativas,
    });
    const completo = await ejercicioRepository.porId(ejercicio.id_ejercicio);
    res.status(201).json({ mensaje: 'Ejercicio creado', ejercicio: completo });
  } catch (err) {
    next(err);
  }
}

/** PUT /api/admin/ejercicios/:id — edita ejercicio y (opcional) sus alternativas. */
async function editar(req, res, next) {
  try {
    const id = idDeRuta(req.params.id);
    const existente = await ejercicioRepository.porId(id);
    if (!existente) throw new AppError(404, 'Ejercicio no encontrado');

    const body = req.body || {};
    validarEjercicio(body, { requerirContenido: false });
    if (Object.keys(body).length === 0) throw new AppError(400, 'No hay cambios para guardar');

    if (body.id_contenido !== undefined && !(await contenidoRepository.porLeccion(body.id_contenido))) {
      throw new AppError(400, 'Datos inválidos', { campos: ['la lección indicada no existe'] });
    }

    const cambios = {};
    if (body.id_contenido !== undefined) cambios.id_contenido = body.id_contenido;
    if (body.enunciado !== undefined) cambios.enunciado = String(body.enunciado).trim();
    if (body.explicacion_solucion !== undefined) {
      cambios.explicacion_solucion = String(body.explicacion_solucion).trim();
    }
    if (body.dificultad !== undefined) cambios.dificultad = body.dificultad;

    const ejercicio = await ejercicioRepository.actualizar(
      id,
      cambios,
      body.alternativas ?? null
    );
    const completo = await ejercicioRepository.porId(ejercicio.id_ejercicio);
    res.json({ mensaje: 'Ejercicio actualizado', ejercicio: completo });
  } catch (err) {
    next(err);
  }
}

module.exports = { listar, obtener, crear, editar };
