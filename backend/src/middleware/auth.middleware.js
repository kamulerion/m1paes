'use strict';

const config = require('../config');
const { query } = require('../db/pool');
const { verificarSesion } = require('../services/token.service');
const { AppError } = require('../utils/AppError');

/**
 * Exige sesión vigente (ADR-003): lee la cookie httpOnly, verifica el JWT y
 * expone req.sesion = { sub, rol }. Sin token o con token inválido/expirado
 * responde 401 con mensaje genérico.
 */
function authenticate(req, _res, next) {
  const token = req.cookies?.[config.security.cookieName];
  if (!token) return next(new AppError(401, 'Sesión requerida'));
  try {
    req.sesion = verificarSesion(token);
    return next();
  } catch {
    return next(new AppError(401, 'Sesión inválida o expirada'));
  }
}

/**
 * Control de acceso por rol (RBAC): 403 cuando el rol de la sesión no está
 * permitido (CP-22). Debe usarse SIEMPRE después de authenticate.
 */
function requireRole(...rolesPermitidos) {
  return (req, _res, next) => {
    if (!req.sesion) return next(new AppError(401, 'Sesión requerida'));
    if (!rolesPermitidos.includes(req.sesion.rol)) {
      return next(new AppError(403, 'No tienes permiso para acceder a este recurso'));
    }
    return next();
  };
}

/**
 * Adjunta req.idInstitucion con la sede del usuario en sesión. Pensado para
 * ADMIN_INSTITUCION (Fase 4): el panel solo opera sobre SU institución, por lo
 * que una sesión sin sede asignada queda en 403. Usar después de
 * authenticate + requireRole('ADMIN_INSTITUCION').
 */
async function cargarInstitucion(req, _res, next) {
  try {
    const { rows } = await query(
      'SELECT id_institucion FROM USUARIO WHERE id_usuario = $1',
      [req.sesion.sub]
    );
    const idInstitucion = rows[0]?.id_institucion;
    if (!idInstitucion) {
      return next(new AppError(403, 'Tu usuario no tiene una institución asignada'));
    }
    req.idInstitucion = idInstitucion;
    return next();
  } catch (error) {
    return next(error);
  }
}

module.exports = { authenticate, requireRole, cargarInstitucion };
