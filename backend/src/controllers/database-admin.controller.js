'use strict';

const { pool } = require('../db/pool');
const { AppError } = require('../utils/AppError');

const MAX_QUERY_LENGTH = 5000;
const MAX_ROWS = 200;

async function tablas(_req, res, next) {
  try {
    const { rows } = await pool.query(
      `SELECT table_name AS nombre, table_type AS tipo
       FROM information_schema.tables
       WHERE table_schema = 'public' AND table_type IN ('BASE TABLE', 'VIEW')
       ORDER BY table_name`
    );
    res.set('Cache-Control', 'no-store, private').json({ tablas: rows });
  } catch (error) { next(error); }
}

async function verTabla(req, res, next) {
  const nombre = req.params.nombre;
  const offset = Number(req.query.offset ?? 0);
  if (!Number.isSafeInteger(offset) || offset < 0 || offset > 1_000_000) {
    return next(new AppError(400, 'La página solicitada no es válida'));
  }

  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN READ ONLY');
    await client.query("SET LOCAL statement_timeout = '5s'");
    const { rows: existe } = await client.query(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = $1
       AND table_type IN ('BASE TABLE', 'VIEW')`, [nombre]
    );
    if (!existe.length) throw new AppError(404, 'No se encontró esa tabla');

    const { rows: columnas } = await client.query(
      `SELECT column_name AS nombre, data_type AS tipo
       FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = $1
       ORDER BY ordinal_position`, [nombre]
    );

    // El identificador procede de information_schema y se escapa como identificador.
    const tablaSql = `"public"."${nombre.replaceAll('"', '""')}"`;
    const datos = await client.query(`SELECT * FROM ${tablaSql} LIMIT $1 OFFSET $2`, [MAX_ROWS + 1, offset]);
    await client.query('COMMIT');
    res.set('Cache-Control', 'no-store, private').json({
      columnas,
      filas: datos.rows.slice(0, MAX_ROWS),
      hayMas: datos.rows.length > MAX_ROWS,
      offset,
      limite: MAX_ROWS,
    });
  } catch (error) {
    if (client) await client.query('ROLLBACK').catch(() => {});
    next(error);
  } finally {
    client?.release();
  }
}

async function consultar(req, res, next) {
  const sqlOriginal = typeof req.body?.sql === 'string' ? req.body.sql.trim() : '';
  const sql = sqlOriginal.replace(/;\s*$/, '').trim();
  if (!sql || sql.length > MAX_QUERY_LENGTH) {
    return next(new AppError(400, `Escribe una consulta de hasta ${MAX_QUERY_LENGTH} caracteres`));
  }
  if (/[;]|--|\/\*/.test(sql) || !/^(SELECT|WITH)\b/i.test(sql)) {
    return next(new AppError(400, 'Solo se permiten consultas SELECT de lectura, sin comentarios ni varias instrucciones'));
  }

  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN READ ONLY');
    await client.query("SET LOCAL statement_timeout = '5s'");
    const result = await client.query(`SELECT * FROM (${sql}) AS admin_readonly_query LIMIT ${MAX_ROWS + 1}`);
    await client.query('COMMIT');
    res.set('Cache-Control', 'no-store, private').json({
      columnas: result.fields.map((field) => field.name),
      filas: result.rows.slice(0, MAX_ROWS),
      hayMas: result.rows.length > MAX_ROWS,
    });
  } catch (error) {
    if (client) await client.query('ROLLBACK').catch(() => {});
    if (error instanceof AppError) return next(error);
    if (error.code === '57014') return next(new AppError(400, 'La consulta superó el límite de 5 segundos'));
    if (error.code?.startsWith('42') || error.code?.startsWith('22')) {
      return next(new AppError(400, 'PostgreSQL rechazó la consulta; revisa su sintaxis y los nombres de tablas y columnas'));
    }
    next(error);
  } finally {
    client?.release();
  }
}

module.exports = { tablas, verTabla, consultar };
