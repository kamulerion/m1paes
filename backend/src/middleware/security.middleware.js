'use strict';

const { AppError } = require('../utils/AppError');

/**
 * Pulido OWASP de la Fase 5 (promesas abiertas en la ADR-003):
 *
 * - `crearLimitarLogin` — limita el fuerza bruta contra POST /api/auth/login
 *   con ventana deslizante en memoria: 10 intentos FALLIDOS por IP + correo
 *   en 15 minutos → responde 429 con cabecera Retry-After. Un inicio de
 *   sesión exitoso limpia el contador, de modo que el usuario legítimo nunca
 *   queda bloqueado. La clave combina IP + correo: protege una cuenta
 *   concreta desde un origen sin castigar a otros usuarios que comparten IP.
 * - `noStore` — cabeceras anti-cache para las respuestas sensibles de
 *   /api/auth/* (datos de sesión, cookies y tokens de recuperación).
 *
 * El estado del limitador vive en memoria por proceso: correcto para el MVP
 * de proceso único (una fábrica por aplicación). Si en producción se usan
 * varios procesos o un reverse proxy, el ADR-004 de deploy evaluará un store
 * externo (p. ej. Redis) — alcance conocido y documentado.
 */

const VENTANA_MS = 15 * 60 * 1000;
const MAXIMO_FALLOS = 10;

/** Crea un limitador de intentos de login (una instancia por aplicación). */
function crearLimitarLogin({ ventanaMs = VENTANA_MS, maximo = MAXIMO_FALLOS } = {}) {
  const intentos = new Map(); // "ip|correo" → { fallidos, expira }

  function entradaDe(req) {
    const correo = String(req.body?.correo ?? '').toLowerCase().trim();
    const clave = `${req.ip}|${correo}`;
    const ahora = Date.now();
    let registro = intentos.get(clave);
    if (!registro || registro.expira <= ahora) {
      registro = { fallidos: 0, expira: ahora + ventanaMs };
      intentos.set(clave, registro);
      // Limpieza oportunista de las ventanas caducadas.
      for (const [k, v] of intentos) {
        if (v.expira <= ahora) intentos.delete(k);
      }
    }
    return { clave, registro };
  }

  return function limitarIntentosLogin(req, res, next) {
    const { clave, registro } = entradaDe(req);

    if (registro.fallidos >= maximo) {
      const reintentoSegundos = Math.max(1, Math.ceil((registro.expira - Date.now()) / 1000));
      res.set('Retry-After', String(reintentoSegundos));
      return next(new AppError(429, 'Demasiados intentos de inicio de sesión. Intenta más tarde.'));
    }

    // Solo los 401 (credenciales inválidas) alimentan el contador; una
    // sesión válida (200) reinicia la clave.
    res.on('finish', () => {
      if (res.statusCode === 401) {
        registro.fallidos += 1;
      } else if (res.statusCode === 200) {
        intentos.delete(clave);
      }
    });
    next();
  };
}

/** Marca la respuesta como no cacheable (cabeceras anti-cache de la ADR-003). */
function noStore(_req, res, next) {
  res.set('Cache-Control', 'no-store, private');
  res.set('Pragma', 'no-cache');
  next();
}

module.exports = { crearLimitarLogin, noStore, VENTANA_MS, MAXIMO_FALLOS };
