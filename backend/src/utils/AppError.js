'use strict';

/** Error de negocio/controlado con estado HTTP asociado. */
class AppError extends Error {
  /**
   * @param {number} status  Código HTTP (4xx cliente, 5xx servidor).
   * @param {string} message Mensaje apto para exponer al cliente.
   * @param {object} [details] Detalle adicional opcional (no sensible).
   */
  constructor(status, message, details, expose = true) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.details = details;
    // Los AppError son mensajes escritos por el equipo: son seguros para
    // exponer (incluidos los 5xx de servicio, p. ej. "BD no disponible").
    this.expose = expose;
    Error.captureStackTrace?.(this, AppError);
  }
}

module.exports = { AppError };
