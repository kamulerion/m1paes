'use strict';

const { AppError } = require('../utils/AppError');

/** 404: recurso o ruta desconocida (deriva al manejador central). */
function notFound(req, _res, next) {
  next(new AppError(404, `Ruta no encontrada: ${req.method} ${req.originalUrl}`));
}

/**
 * Manejador centralizado de errores (único punto de salida de errores).
 * Los 5xx se registran en consola y se exponen como mensaje genérico
 * (no se filtran detalles internos — RNF-03).
 */
// eslint-disable-next-line no-unused-vars -- Express exige 4 argumentos para middlewares de error.
function errorHandler(err, req, res, next) {
  const status = err.status || err.statusCode || 500;
  // Se expone el mensaje solo si el error fue controlado (AppError/explicit):
  // los errores no previstos nunca filtran detalles internos (RNF-03).
  const expose = err.expose ?? status < 500;
  const message = expose ? err.message : 'Error interno del servidor';

  if (status >= 500 && !expose) {
    console.error(`[error] ${req.method} ${req.originalUrl}`, err);
  }

  res.status(status).json({
    error: {
      status,
      message,
      ...(err.details ? { details: err.details } : {}),
    },
  });
}

module.exports = { notFound, errorHandler };
