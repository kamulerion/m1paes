'use strict';

const { AppError } = require('../utils/AppError');

/**
 * Pulido OWASP de la Fase 5 (promesas abiertas en la ADR-003):
 *
 * - `crearLimitarLogin` — limita POST /api/auth/login a 10 fallos por
 *   combinación IP + correo y 100 fallos por IP en 15 minutos.
 * - `crearLimitarRecuperacion` — limita solicitudes de correo de recuperación
 *   a 5 por IP cada 15 minutos y 3 por correo cada hora.
 * - `noStore` — cabeceras anti-cache para las respuestas sensibles de
 *   /api/auth/* (datos de sesión, cookies y tokens de recuperación).
 *
 * Los límites viven en memoria por proceso; reinicios los reinician. Esto es
 * solo una defensa básica para un piloto de una instancia. Para una audiencia
 * pública se requiere un almacén compartido y límites por cuenta/IP.
 */

const VENTANA_MS = 15 * 60 * 1000;
const MAXIMO_FALLOS = 10;
const MAXIMO_FALLOS_IP = 100;
const MAXIMO_RECUPERACION_IP = 5;
const MAXIMO_RECUPERACION_CORREO = 3;
const VENTANA_RECUPERACION_CORREO_MS = 60 * 60 * 1000;
const MAX_REGISTROS = 10000;

function registroPara(registros, clave, ahora, ventanaMs) {
  let registro = registros.get(clave);
  if (registro && registro.expira > ahora) return registro;

  if (registro) registros.delete(clave);
  if (registros.size >= MAX_REGISTROS) {
    for (const [k, v] of registros) {
      if (v.expira <= ahora) registros.delete(k);
    }
    while (registros.size >= MAX_REGISTROS) {
      registros.delete(registros.keys().next().value);
    }
  }

  registro = { fallidos: 0, enCurso: 0, expira: ahora + ventanaMs };
  registros.set(clave, registro);
  return registro;
}

function ipCliente(req) {
  return String(req.ip || req.socket?.remoteAddress || 'desconocida');
}

function rechazarPorFrecuencia(res, next, registro, ahora) {
  const reintentoSegundos = Math.max(1, Math.ceil((registro.expira - ahora) / 1000));
  res.set('Retry-After', String(reintentoSegundos));
  return next(new AppError(429, 'Demasiadas solicitudes. Intenta más tarde.'));
}

/** Crea un limitador de intentos de login (una instancia por aplicación). */
function crearLimitarLogin({
  ventanaMs = VENTANA_MS,
  maximo = MAXIMO_FALLOS,
  maximoIp = MAXIMO_FALLOS_IP,
} = {}) {
  const intentos = new Map();

  return function limitarIntentosLogin(req, res, next) {
    const ahora = Date.now();
    const ip = ipCliente(req);
    const correo = String(req.body?.correo ?? '').toLowerCase().trim().slice(0, 150);
    const claveIp = `login:ip:${ip}`;
    const claveCuenta = `login:cuenta:${ip}:${correo}`;
    const porIp = registroPara(intentos, claveIp, ahora, ventanaMs);
    const porCuenta = registroPara(intentos, claveCuenta, ahora, ventanaMs);

    if (porIp.fallidos + porIp.enCurso >= maximoIp ||
        porCuenta.fallidos + porCuenta.enCurso >= maximo) {
      const registroBloqueado = porIp.fallidos + porIp.enCurso >= maximoIp
        ? porIp
        : porCuenta;
      const reintentoSegundos = Math.max(1, Math.ceil((registroBloqueado.expira - ahora) / 1000));
      res.set('Retry-After', String(reintentoSegundos));
      return next(new AppError(429, 'Demasiados intentos de inicio de sesión. Intenta más tarde.'));
    }

    porIp.enCurso += 1;
    porCuenta.enCurso += 1;
    res.on('finish', () => {
      porIp.enCurso = Math.max(0, porIp.enCurso - 1);
      porCuenta.enCurso = Math.max(0, porCuenta.enCurso - 1);
      if (res.statusCode === 401) {
        porIp.fallidos += 1;
        porCuenta.fallidos += 1;
      } else if (res.statusCode === 200) {
        porCuenta.fallidos = 0;
      }
    });
    next();
  };
}

/** Protección básica contra abuso de correos de recuperación en un piloto. */
function crearLimitarRecuperacion() {
  const solicitudes = new Map();
  return function limitarRecuperacion(req, res, next) {
    const ahora = Date.now();
    const ip = ipCliente(req);
    const correo = String(req.body?.correo ?? '').toLowerCase().trim().slice(0, 150);
    const porIp = registroPara(solicitudes, `recuperar:ip:${ip}`, ahora, VENTANA_MS);
    const porCorreo = registroPara(
      solicitudes,
      `recuperar:correo:${correo}`,
      ahora,
      VENTANA_RECUPERACION_CORREO_MS
    );

    const bloqueado = porIp.fallidos >= MAXIMO_RECUPERACION_IP
      ? porIp
      : (porCorreo.fallidos >= MAXIMO_RECUPERACION_CORREO ? porCorreo : null);
    if (bloqueado) return rechazarPorFrecuencia(res, next, bloqueado, ahora);

    porIp.fallidos += 1;
    porCorreo.fallidos += 1;
    next();
  };
}

/** Marca la respuesta como no cacheable (cabeceras anti-cache de la ADR-003). */
function noStore(_req, res, next) {
  res.set('Cache-Control', 'no-store, private');
  res.set('Pragma', 'no-cache');
  next();
}

module.exports = {
  crearLimitarLogin,
  crearLimitarRecuperacion,
  noStore,
  VENTANA_MS,
  MAXIMO_FALLOS,
  MAXIMO_FALLOS_IP,
  MAXIMO_RECUPERACION_IP,
  MAXIMO_RECUPERACION_CORREO,
};
