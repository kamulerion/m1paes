'use strict';

const { hash, verify, Algorithm } = require('@node-rs/argon2');

/**
 * Hash de contraseñas con Argon2id (ADR-003, RNF-02).
 * Parámetros explícitos alineados al OWASP Password Storage Cheat Sheet:
 * m = 19456 KiB, t = 2, p = 1; sal aleatoria por contraseña.
 * El hash codificado (parámetros + sal + digest) cabe en USUARIO.password_hash.
 */
const PARAMETROS = Object.freeze({
  algorithm: Algorithm.Argon2id,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
});

/** Genera el hash almacenable para una contraseña en claro. */
async function hashPassword(textoPlano) {
  return hash(textoPlano, PARAMETROS);
}

// Hash ficticio para igualar el costo del login cuando el correo no existe
// (evita descubrir usuarios por la latencia de respuesta — RNF-03/CP-03).
let hashFicticio = null;

/**
 * Compara una contraseña contra el hash almacenado.
 * Devuelve false ante cualquier fallo (correo inexistente, hash corrupto,
 * contraseña incorrecta) sin revelar cuál fue la causa.
 */
async function verificarPassword(hashAlmacenado, textoPlano) {
  try {
    if (!hashAlmacenado) {
      if (!hashFicticio) hashFicticio = await hash('m1paes-dummy', PARAMETROS);
      await verify(hashFicticio, textoPlano);
      return false;
    }
    return await verify(hashAlmacenado, textoPlano);
  } catch {
    return false;
  }
}

module.exports = { hashPassword, verificarPassword };
