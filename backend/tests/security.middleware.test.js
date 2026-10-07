'use strict';

const crypto = require('crypto');
const {
  crearLimitarLogin,
  crearLimitarRecuperacion,
} = require('../src/middleware/security.middleware');
const { hashTokenRecuperacion } = require('../src/services/token.service');

function solicitar(middleware, { ip = '203.0.113.10', correo = 'alumna@example.cl' } = {}) {
  let finalizar;
  let error;
  const res = {
    statusCode: 401,
    set: jest.fn(),
    on: (_evento, callback) => { finalizar = callback; },
  };
  middleware({ ip, body: { correo } }, res, (err) => { error = err; });
  if (!error && finalizar) finalizar();
  return { error, res };
}

describe('controles para autenticación y recuperación', () => {
  test('almacena una huella, no el token de recuperación original', () => {
    const token = crypto.randomBytes(32).toString('hex');
    const huella = hashTokenRecuperacion(token);

    expect(huella).toHaveLength(64);
    expect(huella).not.toBe(token);
    expect(huella).toBe(crypto.createHash('sha256').update(token).digest('hex'));
  });

  test('el tope por IP frena intentos distribuidos entre muchos correos', () => {
    const limitar = crearLimitarLogin({ maximoIp: 2 });

    expect(solicitar(limitar, { correo: 'uno@example.cl' }).error).toBeUndefined();
    expect(solicitar(limitar, { correo: 'dos@example.cl' }).error).toBeUndefined();
    const tercero = solicitar(limitar, { correo: 'tres@example.cl' });

    expect(tercero.error.status).toBe(429);
    expect(tercero.res.set).toHaveBeenCalledWith('Retry-After', expect.any(String));
  });

  test('limita las solicitudes de recuperación por cuenta aunque cambie la IP', () => {
    const limitar = crearLimitarRecuperacion();

    for (let i = 1; i <= 3; i += 1) {
      expect(solicitar(limitar, { ip: `203.0.113.${i}` }).error).toBeUndefined();
    }
    const cuarta = solicitar(limitar, { ip: '203.0.113.4' });

    expect(cuarta.error.status).toBe(429);
  });
});
