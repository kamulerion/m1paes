'use strict';

const { errorHandler } = require('../src/middleware/error-handler');
const { AppError } = require('../src/utils/AppError');

function fakeRes() {
  const res = {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
  return res;
}

const req = { method: 'GET', originalUrl: '/api/prueba' };
const next = () => {};

describe('errorHandler (manejador central de errores)', () => {
  let consoleSpy;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  test('expone el mensaje de un AppError de servicio (503)', () => {
    const res = fakeRes();
    errorHandler(new AppError(503, 'Base de datos no disponible'), req, res, next);
    expect(res.statusCode).toBe(503);
    expect(res.body.error.message).toBe('Base de datos no disponible');
  });

  test('devuelve 404 con el mensaje del recurso inexistente', () => {
    const res = fakeRes();
    errorHandler(new AppError(404, 'Ruta no encontrada: GET /x'), req, res, next);
    expect(res.statusCode).toBe(404);
    expect(res.body.error.message).toBe('Ruta no encontrada: GET /x');
  });

  test('oculta el detalle de errores 500 no controlados (no filtra internos)', () => {
    const res = fakeRes();
    const err = new Error('fallo interno con detalle sensible de la base');
    errorHandler(err, req, res, next);
    expect(res.statusCode).toBe(500);
    expect(res.body.error.message).toBe('Error interno del servidor');
    expect(res.body.error.message).not.toMatch(/sensible/);
    expect(consoleSpy).toHaveBeenCalled();
  });
});
