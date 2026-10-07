'use strict';

/**
 * RF-07 — Matrícula, edición y baja de estudiantes de la sede
 * (CP-09). Operado por ADMIN_INSTITUCION SIEMPRE sobre su propia
 * institución (req.idInstitucion lo garantiza el middleware cargarInstitucion):
 * un estudiante de otra sede responde 404 (aislamiento por sede).
 */

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

/** Estudiante de MI sede por id; 404 si no existe o pertenece a otra sede. */
async function exigirEstudianteDeMiSede(id, idInstitucion) {
  const estudiante = await usuarioRepository.porId(id);
  if (
    !estudiante ||
    estudiante.nombre_rol !== 'ESTUDIANTE' ||
    estudiante.id_institucion !== idInstitucion
  ) {
    throw new AppError(404, 'Estudiante no encontrado en tu sede');
  }
  return estudiante;
}

/** GET /api/institucion/estudiantes — matriculados de la sede (RF-07). */
async function listar(req, res, next) {
  try {
    const estudiantes = await usuarioRepository.listarEstudiantes(req.idInstitucion);
    res.json({ estudiantes: estudiantes.map(serializarUsuario) });
  } catch (err) {
    next(err);
  }
}

/** POST /api/institucion/estudiantes — matricula un estudiante (RF-07, CP-09). */
async function crear(req, res, next) {
  try {
    const body = req.body || {};
    const nombre = String(body.nombre ?? '').trim();
    const correo = normalizarCorreo(body.correo);
    const password = body.password;
    const matricula = body.matricula ? String(body.matricula).trim() : null;

    lanzarSiInvalido([
      validarNombre(nombre),
      validarCorreo(correo),
      validarPassword(password),
      ...(matricula ? [validarObligatorio(matricula, 'la matrícula', 50)] : []),
    ]);
    if (await usuarioRepository.porCorreo(correo)) {
      throw new AppError(409, 'El correo ya está registrado');
    }

    const idRol = await usuarioRepository.idPorNombreRol('ESTUDIANTE');
    const idUsuario = await usuarioRepository.crear({
      idRol,
      nombre,
      correo,
      passwordHash: await hashPassword(password),
      idInstitucion: req.idInstitucion, // vinculado a MI sede
      idUsuarioCreador: req.sesion.sub, // trazabilidad jerárquica (esquema v3)
      matricula,
      tipoSuscripcion: 'INSTITUCIONAL', // matriculado por la sede (vs. Free de RF-01)
    });

    const creado = await usuarioRepository.porId(idUsuario);
    res.status(201).json({
      mensaje: 'Estudiante matriculado',
      estudiante: serializarUsuario(creado),
    });
  } catch (err) {
    next(err);
  }
}

/** PUT /api/institucion/estudiantes/:id — edita datos del estudiante (RF-07). */
async function editar(req, res, next) {
  try {
    const id = idDeRuta(req.params.id);
    await exigirEstudianteDeMiSede(id, req.idInstitucion);

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
      const duplicado = await usuarioRepository.porCorreo(correo);
      if (duplicado && duplicado.id_usuario !== id) {
        throw new AppError(409, 'El correo ya está registrado');
      }
      cambios.correo = correo;
    }
    if (body.matricula !== undefined) {
      const matricula = String(body.matricula).trim();
      lanzarSiInvalido([validarObligatorio(matricula, 'la matrícula', 50)]);
      cambios.matricula = matricula;
    }

    const nuevoPassword = body.password;
    if (nuevoPassword !== undefined) {
      lanzarSiInvalido([validarPassword(nuevoPassword)]);
    }
    if (Object.keys(cambios).length === 0 && nuevoPassword === undefined) {
      throw new AppError(400, 'No hay cambios para guardar');
    }

    if (Object.keys(cambios).length > 0) await usuarioRepository.actualizar(id, cambios);
    if (nuevoPassword !== undefined) {
      await usuarioRepository.actualizarPassword(id, await hashPassword(nuevoPassword));
    }

    const actualizado = await usuarioRepository.porId(id);
    res.json({ mensaje: 'Estudiante actualizado', estudiante: serializarUsuario(actualizado) });
  } catch (err) {
    next(err);
  }
}

/** DELETE /api/institucion/estudiantes/:id — baja lógica (RF-07). */
async function eliminar(req, res, next) {
  try {
    const id = idDeRuta(req.params.id);
    await exigirEstudianteDeMiSede(id, req.idInstitucion);
    await usuarioRepository.actualizar(id, { activo: false });
    const actualizado = await usuarioRepository.porId(id);
    res.json({
      mensaje: 'Estudiante dado de baja (lógico)',
      estudiante: serializarUsuario(actualizado),
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { listar, crear, editar, eliminar };
