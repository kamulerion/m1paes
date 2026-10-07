'use strict';

const crypto = require('crypto');

/**
 * Resuelve el secreto de firma de sesiones JWT (ADR-003).
 * - Producción: obligatorio (>= 64 caracteres, 32 bytes en hexadecimal).
 * - Desarrollo/test: si no está definido se genera uno efímero por proceso
 *   (las sesiones no sobreviven a reinicios; nunca se usa un valor fijo).
 */
function resolverJwtSecret(entorno) {
  const secreto = process.env.JWT_SECRET || '';
  if (secreto.length >= 64) return secreto;
  if (entorno === 'production') {
    throw new Error(
      'JWT_SECRET ausente o corto: es obligatorio en producción (ADR-003, >= 64 caracteres)'
    );
  }
  return crypto.randomBytes(48).toString('hex');
}

/**
 * Configuración central de la API M1PAES.
 * Los valores llegan por variables de entorno (.env en desarrollo local;
 * ver backend/.env.example). En producción se inyectan por el entorno del servidor.
 */
const entorno = process.env.NODE_ENV || 'development';

function validarConfiguracionProduccion() {
  if (entorno !== 'production') return;
  const faltantes = [];
  const esMarcador = (valor) => /example\.(com|cl)|tu-dominio-real|tu contraseña|<tu\b/i.test(valor || '');
  if (!process.env.DATABASE_URL && !process.env.DB_PASSWORD) faltantes.push('DATABASE_URL o DB_PASSWORD');
  if (process.env.DATABASE_URL && esMarcador(process.env.DATABASE_URL)) faltantes.push('DATABASE_URL real');
  if (!process.env.DATABASE_URL && esMarcador(process.env.DB_PASSWORD)) faltantes.push('DB_PASSWORD real');
  for (const nombre of ['RESEND_API_KEY', 'EMAIL_FROM']) {
    if (!process.env[nombre] || esMarcador(process.env[nombre])) faltantes.push(`${nombre} real`);
  }
  let baseUrl;
  try { baseUrl = new URL(process.env.APP_BASE_URL || ''); } catch { /* validado abajo */ }
  if (!baseUrl || baseUrl.protocol !== 'https:' || esMarcador(baseUrl.href) ||
      ['localhost', '127.0.0.1', '::1'].includes(baseUrl.hostname)) {
    faltantes.push('APP_BASE_URL (URL https:// pública real)');
  }
  if (faltantes.length) {
    throw new Error(`Configuración de producción incompleta: ${faltantes.join(', ')}`);
  }
}

validarConfiguracionProduccion();

const trustProxy = process.env.TRUST_PROXY || false;
const trustProxyValue = /^(true|1)$/i.test(String(trustProxy))
  ? 1
  : (/^false$/i.test(String(trustProxy)) ? false : trustProxy);

const config = Object.freeze({
  env: entorno,
  port: parseInt(process.env.PORT, 10) || 3000,
  host: process.env.HOST || '127.0.0.1',
  trustProxy: trustProxyValue,
  appBaseUrl: process.env.APP_BASE_URL || 'http://127.0.0.1:3000',
  mail: Object.freeze({
    apiKey: process.env.RESEND_API_KEY || '',
    from: process.env.EMAIL_FROM || '',
  }),
  // Origen permitido para CORS. Vacío = mismo origen (el frontend se sirve
  // desde la propia API), que es el escenario por defecto del MVP.
  corsOrigin: process.env.CORS_ORIGIN || '',
  db: Object.freeze({
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    database: process.env.DB_NAME || 'm1paes',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    max: parseInt(process.env.DB_POOL_MAX, 10) || 10,
    connectionString: process.env.DATABASE_URL || '',
  }),
  security: Object.freeze({
    // Firma de los JWT de sesión (ADR-003).
    jwtSecret: resolverJwtSecret(entorno),
    // Duración de la sesión (8 h por defecto, JWT_EXPIRES_HOURS).
    jwtExpiresHours: parseInt(process.env.JWT_EXPIRES_HOURS, 10) || 8,
    // Cookie httpOnly que transporta el JWT (nombre fijo).
    cookieName: 'm1paes_sesion',
  }),
});

module.exports = config;
