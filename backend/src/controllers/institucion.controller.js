'use strict';

const institucionRepository = require('../repositories/institucion.repository');
const { AppError } = require('../utils/AppError');
const { validarObligatorio, lanzarSiInvalido, idDeRuta } = require('../utils/validate');

/** GET /api/admin/instituciones — listado con conteo de usuarios (RF-05, CP-07). */
async function listar(_req, res, next) {
  try {
    res.json({ instituciones: await institucionRepository.listar() });
  } catch (err) {
    next(err);
  }
}

/** POST /api/admin/instituciones — crea una institución bajo convenio B2B (RF-05). */
async function crear(req, res, next) {
  try {
    const body = req.body || {};
    const nombre = String(body.nombre ?? '').trim();
    const rut = String(body.rut_identificador ?? '').trim();
    const convenio = body.convenio_tipo ? String(body.convenio_tipo).trim() : 'B2B_PREMIUM';

    lanzarSiInvalido([
      validarObligatorio(nombre, 'el nombre', 120, 2),
      validarObligatorio(rut, 'el RUT identificador', 20),
      validarObligatorio(convenio, 'el tipo de convenio', 50),
    ]);
    if (await institucionRepository.porRut(rut)) {
      throw new AppError(409, 'Ya existe una institución con ese RUT');
    }

    const institucion = await institucionRepository.crear({
      nombre,
      rutIdentificador: rut,
      convenioTipo: convenio,
    });
    res.status(201).json({ mensaje: 'Institución creada', institucion });
  } catch (err) {
    next(err);
  }
}

/** PUT /api/admin/instituciones/:id — edita nombre, RUT, convenio o estado (RF-05). */
async function editar(req, res, next) {
  try {
    const id = idDeRuta(req.params.id);
    const body = req.body || {};
    const cambios = {};

    if (body.nombre !== undefined) {
      const nombre = String(body.nombre).trim();
      lanzarSiInvalido([validarObligatorio(nombre, 'el nombre', 120, 2)]);
      cambios.nombre = nombre;
    }
    if (body.rut_identificador !== undefined) {
      const rut = String(body.rut_identificador).trim();
      lanzarSiInvalido([validarObligatorio(rut, 'el RUT identificador', 20)]);
      const existente = await institucionRepository.porRut(rut);
      if (existente && existente.id_institucion !== id) {
        throw new AppError(409, 'Ya existe una institución con ese RUT');
      }
      cambios.rut_identificador = rut;
    }
    if (body.convenio_tipo !== undefined) {
      const convenio = String(body.convenio_tipo).trim();
      lanzarSiInvalido([validarObligatorio(convenio, 'el tipo de convenio', 50)]);
      cambios.convenio_tipo = convenio;
    }
    if (body.activo !== undefined) {
      if (typeof body.activo !== 'boolean') {
        throw new AppError(400, 'Datos inválidos', { campos: ['activo debe ser booleano'] });
      }
      cambios.activo = body.activo;
    }
    if (Object.keys(cambios).length === 0) throw new AppError(400, 'No hay cambios para guardar');

    const actualizada = await institucionRepository.actualizar(id, cambios);
    if (!actualizada) throw new AppError(404, 'Institución no encontrada');
    res.json({ mensaje: 'Institución actualizada', institucion: actualizada });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/admin/instituciones/:id — baja lógica (RF-05).
 * No hay borrado físico: los usuarios vinculados conservarían la referencia
 * histórica; se marca `activo = false` (columna del esquema v3).
 */
async function eliminar(req, res, next) {
  try {
    const id = idDeRuta(req.params.id);
    const existente = await institucionRepository.porId(id);
    if (!existente) throw new AppError(404, 'Institución no encontrada');
    const institucion = await institucionRepository.actualizar(id, { activo: false });
    res.json({ mensaje: 'Institución dada de baja (lógico)', institucion });
  } catch (err) {
    next(err);
  }
}

module.exports = { listar, crear, editar, eliminar };
