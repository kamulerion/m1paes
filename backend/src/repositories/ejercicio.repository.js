'use strict';

const { pool, query } = require('../db/pool');

/**
 * Repositorio de EJERCICIO y ALTERNATIVA (RF-09).
 * La creación/edición con alternativas es transaccional: o se guardan todas
 * las alternativas o no se guarda nada.
 */

async function listar(idContenido = null) {
  const filtros = idContenido ? 'WHERE e.id_contenido = $1' : '';
  const { rows } = await query(
    `SELECT e.*, c.titulo AS contenido,
            (SELECT COUNT(*)::int FROM ALTERNATIVA a WHERE a.id_ejercicio = e.id_ejercicio) AS alternativas
     FROM EJERCICIO e
     JOIN CONTENIDO c ON c.id_contenido = e.id_contenido
     ${filtros}
     ORDER BY e.fecha_creacion DESC`,
    idContenido ? [idContenido] : []
  );
  return rows;
}

/** Ejercicio con sus alternativas (incluye `es_correcta`: uso administrativo). */
async function porId(idEjercicio) {
  const { rows } = await query(
    'SELECT * FROM EJERCICIO WHERE id_ejercicio = $1',
    [idEjercicio]
  );
  if (!rows[0]) return null;
  const alternativas = await query(
    'SELECT id_alternativa, texto, es_correcta FROM ALTERNATIVA WHERE id_ejercicio = $1 ORDER BY id_alternativa',
    [idEjercicio]
  );
  return { ...rows[0], alternativas: alternativas.rows };
}

/**
 * Vista estudiante (RF-11): alternativas sin `es_correcta` y SIN la
 * explicación de la solución, que solo se revela al responder.
 */
async function porIdEstudiante(idEjercicio) {
  const { rows } = await query(
    `SELECT id_ejercicio, id_contenido, enunciado, dificultad
     FROM EJERCICIO WHERE id_ejercicio = $1`,
    [idEjercicio]
  );
  if (!rows[0]) return null;
  const alternativas = await query(
    'SELECT id_alternativa, texto FROM ALTERNATIVA WHERE id_ejercicio = $1 ORDER BY id_alternativa',
    [idEjercicio]
  );
  return { ...rows[0], alternativas: alternativas.rows };
}

/** Ejercicios de una lección para el listado de práctica (sin soluciones). */
async function listarPorContenidoEstudiante(idContenido) {
  const { rows } = await query(
    `SELECT id_ejercicio, enunciado, dificultad
     FROM EJERCICIO
     WHERE id_contenido = $1
     ORDER BY id_ejercicio`,
    [idContenido]
  );
  return rows;
}

/** Inserta el ejercicio y sus alternativas en una transacción. */
async function crear({ idContenido, idAdminCreador, enunciado, explicacion, dificultad, alternativas }) {
  const cliente = await pool.connect();
  try {
    await cliente.query('BEGIN');
    const ejercicio = await cliente.query(
      `INSERT INTO EJERCICIO (id_contenido, id_admin_creador, enunciado, explicacion_solucion, dificultad)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [idContenido, idAdminCreador, enunciado, explicacion, dificultad]
    );
    for (const alternativa of alternativas) {
      await cliente.query(
        'INSERT INTO ALTERNATIVA (id_ejercicio, texto, es_correcta) VALUES ($1, $2, $3)',
        [ejercicio.rows[0].id_ejercicio, alternativa.texto.trim(), Boolean(alternativa.es_correcta)]
      );
    }
    await cliente.query('COMMIT');
    return ejercicio.rows[0];
  } catch (err) {
    await cliente.query('ROLLBACK');
    throw err;
  } finally {
    cliente.release();
  }
}

/** Edita el ejercicio; si llegan alternativas, las reemplaza completas (transacción). */
async function actualizar(idEjercicio, cambios, alternativas = null) {
  const cliente = await pool.connect();
  try {
    await cliente.query('BEGIN');
    const columnas = {
      enunciado: 'enunciado',
      explicacion_solucion: 'explicacion_solucion',
      dificultad: 'dificultad',
      id_contenido: 'id_contenido',
    };
    const asignaciones = [];
    const valores = [];
    for (const [campo, valor] of Object.entries(cambios)) {
      if (columnas[campo]) {
        valores.push(valor);
        asignaciones.push(`${columnas[campo]} = $${valores.length}`);
      }
    }
    let ejercicio = null;
    if (asignaciones.length > 0) {
      valores.push(idEjercicio);
      const resultado = await cliente.query(
        `UPDATE EJERCICIO SET ${asignaciones.join(', ')}
         WHERE id_ejercicio = $${valores.length}
         RETURNING *`,
        valores
      );
      ejercicio = resultado.rows[0] ?? null;
    } else {
      const resultado = await cliente.query('SELECT * FROM EJERCICIO WHERE id_ejercicio = $1', [
        idEjercicio,
      ]);
      ejercicio = resultado.rows[0] ?? null;
    }

    if (ejercicio && alternativas) {
      await cliente.query('DELETE FROM ALTERNATIVA WHERE id_ejercicio = $1', [idEjercicio]);
      for (const alternativa of alternativas) {
        await cliente.query(
          'INSERT INTO ALTERNATIVA (id_ejercicio, texto, es_correcta) VALUES ($1, $2, $3)',
          [idEjercicio, alternativa.texto.trim(), Boolean(alternativa.es_correcta)]
        );
      }
    }

    await cliente.query('COMMIT');
    return ejercicio;
  } catch (err) {
    await cliente.query('ROLLBACK');
    throw err;
  } finally {
    cliente.release();
  }
}

module.exports = { listar, porId, porIdEstudiante, listarPorContenidoEstudiante, crear, actualizar };
