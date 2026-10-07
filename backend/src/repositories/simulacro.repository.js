'use strict';

const { pool, query } = require('../db/pool');

/**
 * Repositorio de SIMULACRO y SIMULACRO_EJERCICIO (RF-10).
 * Los valores por defecto del esquema replican la PAES oficial:
 * 65 preguntas y 140 minutos.
 */

async function listar() {
  const { rows } = await query(
    `SELECT s.*,
            (SELECT COUNT(*)::int FROM SIMULACRO_EJERCICIO se WHERE se.id_simulacro = s.id_simulacro) AS preguntas,
            u.nombre AS admin_creador
     FROM SIMULACRO s
     JOIN USUARIO u ON u.id_usuario = s.id_admin_creador
     ORDER BY s.fecha_creacion DESC`
  );
  return rows;
}

async function porId(idSimulacro) {
  const { rows } = await query('SELECT * FROM SIMULACRO WHERE id_simulacro = $1', [idSimulacro]);
  return rows[0] ?? null;
}

async function crear({ idAdminCreador, nombre, cantidadPreguntas, tiempoLimiteMinutos }) {
  const { rows } = await query(
    `INSERT INTO SIMULACRO (id_admin_creador, nombre, cantidad_preguntas, tiempo_limite_minutos)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [idAdminCreador, nombre, cantidadPreguntas, tiempoLimiteMinutos]
  );
  return rows[0];
}

async function actualizar(idSimulacro, cambios) {
  const columnas = {
    nombre: 'nombre',
    cantidad_preguntas: 'cantidad_preguntas',
    tiempo_limite_minutos: 'tiempo_limite_minutos',
  };
  const asignaciones = [];
  const valores = [];
  for (const [campo, valor] of Object.entries(cambios)) {
    if (columnas[campo]) {
      valores.push(valor);
      asignaciones.push(`${columnas[campo]} = $${valores.length}`);
    }
  }
  if (asignaciones.length === 0) return null;
  valores.push(idSimulacro);
  const { rows } = await query(
    `UPDATE SIMULACRO SET ${asignaciones.join(', ')}
     WHERE id_simulacro = $${valores.length}
     RETURNING *`,
    valores
  );
  return rows[0] ?? null;
}

/** Preguntas ordenadas del simulacro (composición para la Fase 3). */
async function preguntas(idSimulacro) {
  const { rows } = await query(
    `SELECT se.numero_pregunta, se.id_ejercicio
     FROM SIMULACRO_EJERCICIO se
     WHERE se.id_simulacro = $1
     ORDER BY se.numero_pregunta`,
    [idSimulacro]
  );
  return rows;
}

/**
 * Reemplaza la composición completa del simulacro (número 1..n).
 * Valida de antemano que todos los ejercicios existan para responder 400
 * en lugar de un error 500 por la foránea.
 */
async function reemplazarPreguntas(idSimulacro, idEjercicios) {
  const { rows: existentes } = await query(
    'SELECT id_ejercicio FROM EJERCICIO WHERE id_ejercicio = ANY($1::int[])',
    [idEjercicios]
  );
  const conjunto = new Set(existentes.map((fila) => fila.id_ejercicio));
  const faltantes = idEjercicios.filter((id) => !conjunto.has(id));
  if (faltantes.length > 0) {
    const error = new Error(`Ejercicios inexistentes: ${faltantes.join(', ')}`);
    error.status = 400;
    error.expose = true;
    throw error;
  }

  const cliente = await pool.connect();
  try {
    await cliente.query('BEGIN');
    await cliente.query('DELETE FROM SIMULACRO_EJERCICIO WHERE id_simulacro = $1', [idSimulacro]);
    for (let i = 0; i < idEjercicios.length; i += 1) {
      await cliente.query(
        `INSERT INTO SIMULACRO_EJERCICIO (id_simulacro, id_ejercicio, numero_pregunta)
         VALUES ($1, $2, $3)`,
        [idSimulacro, idEjercicios[i], i + 1]
      );
    }
    await cliente.query('COMMIT');
    return idEjercicios.length;
  } catch (err) {
    await cliente.query('ROLLBACK');
    throw err;
  } finally {
    cliente.release();
  }
}

/** Listado para el estudiante (RF-12): nombre, formato y preguntas armadas. */
async function listarParaRendir() {
  const { rows } = await query(
    `SELECT s.id_simulacro, s.nombre, s.cantidad_preguntas, s.tiempo_limite_minutos,
            (SELECT COUNT(*)::int FROM SIMULACRO_EJERCICIO se WHERE se.id_simulacro = s.id_simulacro) AS preguntas
     FROM SIMULACRO s
     ORDER BY s.fecha_creacion DESC`
  );
  return rows;
}

/**
 * Preguntas del simulacro para rendir (RF-12): enunciado y alternativas
 * SIN `es_correcta` ni solución — esas solo se evalúan en `finalizar`.
 */
async function preguntasParaRendir(idSimulacro) {
  const { rows } = await query(
    `SELECT se.numero_pregunta, e.id_ejercicio, e.enunciado, e.dificultad
     FROM SIMULACRO_EJERCICIO se
     JOIN EJERCICIO e ON e.id_ejercicio = se.id_ejercicio
     WHERE se.id_simulacro = $1
     ORDER BY se.numero_pregunta`,
    [idSimulacro]
  );
  if (rows.length === 0) return [];
  const ids = rows.map((fila) => fila.id_ejercicio);
  const alternativas = await query(
    `SELECT id_ejercicio, id_alternativa, texto
     FROM ALTERNATIVA
     WHERE id_ejercicio = ANY($1::int[])
     ORDER BY id_alternativa`,
    [ids]
  );
  const porEjercicio = new Map();
  for (const alternativa of alternativas.rows) {
    if (!porEjercicio.has(alternativa.id_ejercicio)) porEjercicio.set(alternativa.id_ejercicio, []);
    porEjercicio.get(alternativa.id_ejercicio).push({
      id: alternativa.id_alternativa,
      texto: alternativa.texto,
    });
  }
  return rows.map((fila) => ({
    numero: fila.numero_pregunta,
    idEjercicio: fila.id_ejercicio,
    enunciado: fila.enunciado,
    dificultad: fila.dificultad,
    alternativas: porEjercicio.get(fila.id_ejercicio) ?? [],
  }));
}

module.exports = {
  listar,
  porId,
  crear,
  actualizar,
  preguntas,
  reemplazarPreguntas,
  listarParaRendir,
  preguntasParaRendir,
};
