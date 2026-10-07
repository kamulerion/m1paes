'use strict';

const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const config = require('../config');

/**
 * Tokens (ADR-003):
 * - Sesión: JWT firmado (HS256) con JWT_SECRET, transportado en cookie httpOnly.
 * - Recuperación: 32 bytes aleatorios en hex, un solo uso y caducidad de 30 min
 *   (persistidos en la tabla TOKEN_RECUPERACION del esquema v3).
 */

/** Firma el JWT de sesión para un usuario autenticado. */
function firmarSesion(usuario) {
  return jwt.sign(
    { sub: usuario.id_usuario, rol: usuario.nombre_rol },
    config.security.jwtSecret,
    { expiresIn: `${config.security.jwtExpiresHours}h` }
  );
}

/** Verifica y decodifica; lanza si la firma es inválida o el token expiró. */
function verificarSesion(token) {
  return jwt.verify(token, config.security.jwtSecret);
}

/** Token de recuperación de contraseña (hex, 64 caracteres). */
function generarTokenRecuperacion() {
  return crypto.randomBytes(32).toString('hex');
}

/** Fecha de caducidad de un token de recuperación (por defecto, 30 min). */
function expiracionRecuperacion(minutos = 30) {
  return new Date(Date.now() + minutos * 60 * 1000);
}

module.exports = {
  firmarSesion,
  verificarSesion,
  generarTokenRecuperacion,
  expiracionRecuperacion,
};
