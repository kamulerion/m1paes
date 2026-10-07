'use strict';

const config = require('../config');
const usuarioRepository = require('../repositories/usuario.repository');
const tokenRepository = require('../repositories/token.repository');
const { hashPassword, verificarPassword } = require('../services/password.service');
const {
  firmarSesion,
  generarTokenRecuperacion,
  expiracionRecuperacion,
} = require('../services/token.service');
const mailer = require('../services/mailer.service');
const { AppError } = require('../utils/AppError');
const { serializarUsuario } = require('../utils/serializarUsuario');
const {
  normalizarCorreo,
  validarCorreo,
  validarPassword,
  validarNombre,
  lanzarSiInvalido,
} = require('../utils/validate');

/**
 * Cookie de sesión (ADR-003): httpOnly + sameSite=Lax + path=/.
 * `secure` solo en producción, donde el tráfico va sobre HTTPS (RNF-02).
 */
const OPCIONES_COOKIE = Object.freeze({
  httpOnly: true,
  sameSite: 'lax',
  path: '/',
  secure: config.env === 'production',
});

/**
 * POST /api/auth/registro — RF-01 (CP-01).
 * Autoregistro del Estudiante Free: nombre, correo y contraseña cifrada.
 * No inicia sesión (la CP-01 espera la redirección al login).
 */
async function registro(req, res, next) {
  try {
    const body = req.body || {};
    const nombre = String(body.nombre ?? '').trim();
    const correo = normalizarCorreo(body.correo);
    const password = body.password;
    lanzarSiInvalido([validarNombre(nombre), validarCorreo(correo), validarPassword(password)]);

    if (await usuarioRepository.porCorreo(correo)) {
      throw new AppError(409, 'El correo ya está registrado');
    }

    const idRol = await usuarioRepository.idPorNombreRol('ESTUDIANTE');
    const passwordHash = await hashPassword(password);
    const idUsuario = await usuarioRepository.crear({ idRol, nombre, correo, passwordHash });

    res.status(201).json({
      mensaje: 'Cuenta creada. Inicia sesión para continuar.',
      redireccion: '/login',
      usuario: { id: idUsuario, nombre, correo, rol: 'ESTUDIANTE' },
    });
  } catch (err) {
    next(err);
  }
}

/** POST /api/auth/login — RF-02 (CP-02, CP-03). */
async function login(req, res, next) {
  try {
    const body = req.body || {};
    const correo = normalizarCorreo(body.correo);
    const password = body.password;
    lanzarSiInvalido([validarCorreo(correo), validarPassword(password)]);

    const usuario = await usuarioRepository.porCorreo(correo);
    const coincide = await verificarPassword(usuario?.password_hash, password);

    // Mensaje único sin importar la causa (CP-03: no revela si el correo
    // existe o cuál fue el motivo del fallo).
    if (!usuario || !coincide) {
      throw new AppError(401, 'Credenciales inválidas');
    }
    if (!usuario.activo) {
      throw new AppError(403, 'La cuenta está desactivada');
    }

    res.cookie(config.security.cookieName, firmarSesion(usuario), OPCIONES_COOKIE);
    res.json({ mensaje: 'Sesión iniciada', usuario: serializarUsuario(usuario) });
  } catch (err) {
    next(err);
  }
}

/** POST /api/auth/logout — RF-02 (CP-04): limpia la cookie de sesión. */
async function logout(_req, res) {
  res.clearCookie(config.security.cookieName, OPCIONES_COOKIE);
  res.json({ mensaje: 'Sesión cerrada' });
}

/** GET /api/auth/sesion — RF-02: usuario de la sesión vigente (requiere authenticate). */
async function sesion(req, res, next) {
  try {
    const usuario = await usuarioRepository.porId(req.sesion.sub);
    if (!usuario || !usuario.activo) {
      throw new AppError(401, 'Sesión inválida o expirada');
    }
    res.json({ usuario: serializarUsuario(usuario) });
  } catch (err) {
    next(err);
  }
}

/** POST /api/auth/recuperar — RF-03 (CP-05, paso 1). */
async function recuperar(req, res, next) {
  try {
    const correo = normalizarCorreo((req.body || {}).correo);
    lanzarSiInvalido([validarCorreo(correo)]);

    const usuario = await usuarioRepository.porCorreo(correo);
    const respuesta = {
      // Respuesta única exista o no el correo: evita enumerar usuarios.
      mensaje: 'Si el correo está registrado, recibirás instrucciones para restablecer tu contraseña.',
    };

    if (usuario && usuario.activo) {
      const token = generarTokenRecuperacion();
      await tokenRepository.crearRecuperacion({
        idUsuario: usuario.id_usuario,
        token,
        expiraEn: expiracionRecuperacion(30),
      });
      await mailer.enviarRecuperacion({
        para: usuario.correo,
        token,
        enlace: `/restablecer?token=${encodeURIComponent(token)}`,
      });
      // Solo fuera de producción el token viaja en la respuesta para poder
      // automatizar la CP-05 sin servidor de correo (ADR-003).
      if (config.env !== 'production') respuesta.token = token;
    }

    res.json(respuesta);
  } catch (err) {
    next(err);
  }
}

/** POST /api/auth/restablecer — RF-03 (CP-05, paso 2): token + contraseña nueva. */
async function restablecer(req, res, next) {
  try {
    const body = req.body || {};
    const token = String(body.token ?? '').trim();
    const password = body.password;
    lanzarSiInvalido([token ? null : 'el token es obligatorio', validarPassword(password)]);

    const registro = await tokenRepository.buscarRecuperacionValida(token);
    if (!registro) {
      throw new AppError(400, 'El token es inválido o ha expirado');
    }

    await usuarioRepository.actualizarPassword(registro.id_usuario, await hashPassword(password));
    await tokenRepository.marcarUtilizado(registro.id_token);

    res.json({ mensaje: 'Contraseña actualizada. Inicia sesión con tu nueva contraseña.' });
  } catch (err) {
    next(err);
  }
}

module.exports = { registro, login, logout, sesion, recuperar, restablecer };
