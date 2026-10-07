'use strict';

const usuarioRepository = require('../repositories/usuario.repository');
const { AppError } = require('../utils/AppError');
const { serializarUsuario } = require('../utils/serializarUsuario');
const {
  normalizarCorreo,
  validarCorreo,
  validarNombre,
  lanzarSiInvalido,
} = require('../utils/validate');

/** GET /api/perfil — RF-04 (CP-06): consulta el perfil del usuario autenticado. */
async function obtener(req, res, next) {
  try {
    const usuario = await usuarioRepository.porId(req.sesion.sub);
    if (!usuario) throw new AppError(401, 'Sesión inválida o expirada');
    res.json({ usuario: serializarUsuario(usuario) });
  } catch (err) {
    next(err);
  }
}

/** PUT /api/perfil — RF-04 (CP-06): edita nombre y/o correo del propio perfil. */
async function actualizar(req, res, next) {
  try {
    const body = req.body || {};
    const cambios = {};

    if (body.nombre !== undefined) {
      const nombre = String(body.nombre).trim();
      lanzarSiInvalido([validarNombre(nombre)]);
      cambios.nombre = nombre;
    }
    if (body.correo !== undefined) {
      const correo = normalizarCorreo(body.correo);
      lanzarSiInvalido([validarCorreo(correo)]);
      cambios.correo = correo;
    }
    if (Object.keys(cambios).length === 0) {
      throw new AppError(400, 'No hay cambios para guardar');
    }

    if (cambios.correo) {
      const existente = await usuarioRepository.porCorreo(cambios.correo);
      if (existente && existente.id_usuario !== req.sesion.sub) {
        throw new AppError(409, 'El correo ya está registrado');
      }
    }

    await usuarioRepository.actualizar(req.sesion.sub, cambios);
    const usuario = await usuarioRepository.porId(req.sesion.sub);
    res.json({ mensaje: 'Perfil actualizado', usuario: serializarUsuario(usuario) });
  } catch (err) {
    next(err);
  }
}

module.exports = { obtener, actualizar };
