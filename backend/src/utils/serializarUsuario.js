'use strict';

/**
 * Forma pública de un usuario para las respuestas de la API.
 * Nunca expone password_hash ni otros datos internos.
 */
function serializarUsuario(usuario) {
  return {
    id: usuario.id_usuario,
    nombre: usuario.nombre,
    correo: usuario.correo,
    rol: usuario.nombre_rol,
    suscripcion: usuario.tipo_suscripcion,
    activo: usuario.activo,
    fechaRegistro: usuario.fecha_registro,
    ...(usuario.id_institucion ? { idInstitucion: usuario.id_institucion } : {}),
    ...(usuario.institucion ? { institucion: usuario.institucion } : {}),
    ...(usuario.matricula ? { matricula: usuario.matricula } : {}),
    ...(usuario.cargo ? { cargo: usuario.cargo } : {}),
  };
}

module.exports = { serializarUsuario };
