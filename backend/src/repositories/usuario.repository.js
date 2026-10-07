'use strict';

const { query } = require('../db/pool');

/**
 * Repositorio de USUARIO (patrón Repository, ADR-001).
 * Todas las consultas van parametrizadas (RNF-03).
 */

/** Id del rol a partir de su nombre en el catálogo (SUPERADMIN, ADMIN_INSTITUCION, ESTUDIANTE). */
async function idPorNombreRol(nombreRol) {
  const { rows } = await query('SELECT id_rol FROM ROL WHERE nombre_rol = $1', [nombreRol]);
  return rows[0]?.id_rol ?? null;
}

const SELECT_USUARIO = `
  SELECT u.*, r.nombre_rol
  FROM USUARIO u
  JOIN ROL r ON r.id_rol = u.id_rol
`;

/** Usuario (con rol) buscado por correo ya normalizado a minúsculas. */
async function porCorreo(correo) {
  const { rows } = await query(`${SELECT_USUARIO} WHERE u.correo = $1`, [correo]);
  return rows[0] ?? null;
}

/** Usuario (con rol) por su id. */
async function porId(idUsuario) {
  const { rows } = await query(`${SELECT_USUARIO} WHERE u.id_usuario = $1`, [idUsuario]);
  return rows[0] ?? null;
}

/** Usuarios de un rol, con el nombre de su institución si la tienen (listados RF-06). */
async function listarPorRol(nombreRol) {
  const { rows } = await query(
    `SELECT u.*, r.nombre_rol, i.nombre AS institucion
     FROM USUARIO u
     JOIN ROL r ON r.id_rol = u.id_rol
     LEFT JOIN INSTITUCION i ON i.id_institucion = u.id_institucion
     WHERE r.nombre_rol = $1
     ORDER BY u.nombre`,
    [nombreRol]
  );
  return rows;
}

/**
 * Estudiantes adscritos a una sede (RF-07): incluye el nombre del rol
 * (para `serializarUsuario`) y el de la institución.
 */
async function listarEstudiantes(idInstitucion) {
  const { rows } = await query(
    `SELECT u.*, r.nombre_rol, i.nombre AS institucion
     FROM USUARIO u
     JOIN ROL r ON r.id_rol = u.id_rol
     LEFT JOIN INSTITUCION i ON i.id_institucion = u.id_institucion
     WHERE u.id_institucion = $1 AND r.nombre_rol = 'ESTUDIANTE'
     ORDER BY u.activo DESC, u.nombre`,
    [idInstitucion]
  );
  return rows;
}

/**
 * Inserta un usuario. Los campos institucionales (id_institucion, creador,
 * matrícula, cargo) quedan NULL para el Estudiante Free de RF-01 y se usan
 * en las fases 2 y 4 (RF-06, RF-07).
 */
async function crear({
  idRol,
  nombre,
  correo,
  passwordHash,
  idInstitucion = null,
  idUsuarioCreador = null,
  matricula = null,
  cargo = null,
  tipoSuscripcion = 'FREE',
}) {
  const { rows } = await query(
    `INSERT INTO USUARIO
       (id_rol, id_institucion, id_usuario_creador, nombre, correo,
        password_hash, matricula, cargo, tipo_suscripcion)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING id_usuario`,
    [idRol, idInstitucion, idUsuarioCreador, nombre, correo, passwordHash, matricula, cargo, tipoSuscripcion]
  );
  return rows[0].id_usuario;
}

/**
 * Actualiza campos de usuario. Lista blanca de columnas; el controlador es
 * quien decide qué acepta cada endpoint (el perfil propio solo envía
 * nombre/correo; la administración puede enviar cargo, institución o activo).
 */
async function actualizar(idUsuario, cambios) {
  const columnas = {
    nombre: 'nombre',
    correo: 'correo',
    cargo: 'cargo',
    matricula: 'matricula',
    id_institucion: 'id_institucion',
    activo: 'activo',
  };
  const asignaciones = [];
  const valores = [];
  for (const [campo, valor] of Object.entries(cambios)) {
    if (columnas[campo]) {
      valores.push(valor);
      asignaciones.push(`${columnas[campo]} = $${valores.length}`);
    }
  }
  if (asignaciones.length === 0) return null;
  valores.push(idUsuario);
  const { rows } = await query(
    `UPDATE USUARIO SET ${asignaciones.join(', ')}
     WHERE id_usuario = $${valores.length}
     RETURNING *`,
    valores
  );
  return rows[0] ?? null;
}

/** Reemplaza el password_hash (cambio vía recuperación de contraseña). */
async function actualizarPassword(idUsuario, passwordHash) {
  await query('UPDATE USUARIO SET password_hash = $1 WHERE id_usuario = $2', [
    passwordHash,
    idUsuario,
  ]);
}

module.exports = {
  idPorNombreRol,
  porCorreo,
  porId,
  listarPorRol,
  listarEstudiantes,
  crear,
  actualizar,
  actualizarPassword,
};
