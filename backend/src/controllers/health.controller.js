'use strict';

const config = require('../config');
const healthRepository = require('../repositories/health.repository');
const { AppError } = require('../utils/AppError');

/** GET /api/health — estado del servicio (sin base de datos). */
async function getHealth(_req, res) {
  res.json({
    status: 'ok',
    service: 'm1paes-api',
    version: require('../../package.json').version,
    environment: config.env,
    uptimeSec: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });
}

/** GET /api/health/db — estado de la conexión con PostgreSQL. */
async function getDbHealth(_req, res, next) {
  try {
    const { ok, latencyMs } = await healthRepository.ping();
    if (!ok) {
      throw new AppError(503, 'Base de datos no disponible');
    }
    res.json({
      status: 'ok',
      database: config.db.database,
      host: `${config.db.host}:${config.db.port}`,
      latencyMs,
    });
  } catch (err) {
    // Fallos de conexión de pg se traducen a 503 con mensaje controlado
    // (el detalle queda en el registro del servidor, no en la respuesta).
    if (err.status) return next(err);
    console.error('[health/db] fallo de conexión:', err.message);
    return next(new AppError(503, 'Base de datos no disponible'));
  }
}

module.exports = { getHealth, getDbHealth };
