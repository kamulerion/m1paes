'use strict';

const institucionRepository = require('../repositories/institucion.repository');
const usuarioRepository = require('../repositories/usuario.repository');
const { hashPassword } = require('../services/password.service');
const { AppError } = require('../utils/AppError');
const { serializarUsuario } = require('../utils/serializarUsuario');
const {
  normalizarCorreo,
  validarCorreo,
  validarPassword,
  validarNombre,
  validarObligatorio,
  lanzarSiInvalido,
  idDeRuta,
} = require('../utils/validate');

/** Valida que la institución exista y esté activa; devuelve su id. */
async function exigirInstitucion(idInstitucion) {
  if (!Number.isInteger(idInstitucion) || idInstitucion <= 0) {
    throw new AppError(400, 'Datos inválidos', { campos: ['id_institucion inválido'] });
  }
  const institucion = await institucionRepository.porId(idInstitucion);
  if (!institucion) {
    throw new AppError(400, 'Datos inválidos', { campos: ['la institución indicada no existe'] });
  }
  if (!institucion.activo) {
    throw new AppError(400, 'Datos inválidos', { campos: ['la institución indicada está dada de baja'] });
  }
  return institucion;
}

/** GET /api/admin/administradores — listado de administradores de sede (RF-06). */
async function listar(_req, res, next) {
  try {
    const administradores = await usuarioRepository.listarPorRol('ADMIN_INSTITUCION');
    res.json({ administradores: administradores.map(serializarUsuario) });
  } catch (err) {
    next(err);
  }
}

/** POST /api/admin/administradores — crea un Admin de Institución (RF-06, CP-08). */
async function crear(req, res, next) {
  try {
    const body = req.body || {};
    const nombre = String(body.nombre ?? '').trim();
    const correo = normalizarCorreo(body.correo);
    const password = body.password;
    const cargo = body.cargo ? String(body.cargo).trim() : 'Administrador de Sede';

    lanzarSiInvalido([
      validarNombre(nombre),
      validarCorreo(correo),
      validarPassword(password),
      validarObligatorio(cargo, 'el cargo', 50),
    ]);
    const institucion = await exigirInstitucion(body.id_institucion);
    if (await usuarioRepository.porCorreo(correo)) {
      throw new AppError(409, 'El correo ya está registrado');
    }

    const idRol = await usuarioRepository.idPorNombreRol('ADMIN_INSTITUCION');
    const idUsuario = await usuarioRepository.crear({
      idRol,
      nombre,
      correo,
      passwordHash: await hashPassword(password),
      idInstitucion: institucion.id_institucion,
      idUsuarioCreador: req.sesion.sub, // trazabilidad jerárquica (esquema v3)
      cargo,
      tipoSuscripcion: 'INSTITUCIONAL',
    });

    const creado = await usuarioRepository.porId(idUsuario);
    res.status(201).json({
      mensaje: 'Administrador de institución creado',
      administrador: serializarUsuario(creado),
    });
  } catch (err) {
    next(err);
  }
}

/** PUT /api/admin/administradores/:id — edita nombre, cargo, sede o estado (RF-06). */
async function editar(req, res, next) {
  try {
    const id = idDeRuta(req.params.id);
    const existente = await usuarioRepository.porId(id);
    if (!existente || existente.nombre_rol !== 'ADMIN_INSTITUCION') {
      throw new AppError(404, 'Administrador no encontrado');
    }

    const body = req.body || {};
    const cambios = {};
    if (body.nombre !== undefined) {
      const nombre = String(body.nombre).trim();
      lanzarSiInvalido([validarNombre(nombre)]);
      cambios.nombre = nombre;
    }
    if (body.cargo !== undefined) {
      const cargo = String(body.cargo).trim();
      lanzarSiInvalido([validarObligatorio(cargo, 'el cargo', 50)]);
      cambios.cargo = cargo;
    }
    if (body.id_institucion !== undefined) {
      const institucion = await exigirInstitucion(body.id_institucion);
      cambios.id_institucion = institucion.id_institucion;
    }
    if (body.activo !== undefined) {
      if (typeof body.activo !== 'boolean') {
        throw new AppError(400, 'Datos inválidos', { campos: ['activo debe ser booleano'] });
      }
      cambios.activo = body.activo;
    }
    if (Object.keys(cambios).length === 0) throw new AppError(400, 'No hay cambios para guardar');

    await usuarioRepository.actualizar(id, cambios);
    const actualizado = await usuarioRepository.porId(id);
    res.json({ mensaje: 'Administrador actualizado', administrador: serializarUsuario(actualizado) });
  } catch (err) {
    next(err);
  }
}

/** DELETE /api/admin/administradores/:id — baja lógica (RF-06). */
async function eliminar(req, res, next) {
  try {
    const id = idDeRuta(req.params.id);
    const existente = await usuarioRepository.porId(id);
    if (!existente || existente.nombre_rol !== 'ADMIN_INSTITUCION') {
      throw new AppError(404, 'Administrador no encontrado');
    }
    await usuarioRepository.actualizar(id, { activo: false });
    const actualizado = await usuarioRepository.porId(id);
    res.json({ mensaje: 'Administrador dado de baja (lógico)', administrador: serializarUsuario(actualizado) });
  } catch (err) {
    next(err);
  }
}

module.exports = { listar, crear, editar, eliminar };
