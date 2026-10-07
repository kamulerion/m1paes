'use strict';

const { query } = require('../db/pool');

/**
 * Repositorio de TOKEN_RECUPERACION (RF-03).
 * El esquema v3 ya modela tokens temporales de un solo uso con caducidad.
 */

/** Crea un token de recuperación dejando invalidados los anteriores del usuario. */
async function crearRecuperacion({ idUsuario, token, expiraEn }) {
  await query(
    'UPDATE TOKEN_RECUPERACION SET utilizado = TRUE WHERE id_usuario = $1 AND utilizado = FALSE',
    [idUsuario]
  );
  const { rows } = await query(
    `INSERT INTO TOKEN_RECUPERACION (id_usuario, token, expira_en)
     VALUES ($1, $2, $3)
     RETURNING id_token`,
    [idUsuario, token, expiraEn]
  );
  return rows[0].id_token;
}

/** Busca un token vigente (no usado y no caducado). */
async function buscarRecuperacionValida(token) {
  const { rows } = await query(
    `SELECT id_token, id_usuario, expira_en
     FROM TOKEN_RECUPERACION
     WHERE token = $1 AND utilizado = FALSE AND expira_en > now()`,
    [token]
  );
  return rows[0] ?? null;
}

/** Marca el token como usado (un solo uso). */
async function marcarUtilizado(idToken) {
  await query('UPDATE TOKEN_RECUPERACION SET utilizado = TRUE WHERE id_token = $1', [idToken]);
}

module.exports = { crearRecuperacion, buscarRecuperacionValida, marcarUtilizado };
