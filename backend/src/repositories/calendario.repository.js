'use strict';

const { query } = require('../db/pool');

/**
 * Repositorio del calendario de ensayos de la sede (RF-16).
 * Tabla CALENDARIO_ENSAYO (extensión documentada del esquema v3: el informe
 * no modela esta persistencia — ver bitácora Fase 4).
 */

/** Eventos de una institución, los más próximos primero. */
async function listarPorInstitucion(idInstitucion) {
  const { rows } = await query(
    `SELECT id_evento, id_institucion, titulo, descripcion,
            to_char(fecha_evento, 'YYYY-MM-DD"T"HH24:MI') AS fecha_evento,
            fecha_creacion
     FROM CALENDARIO_ENSAYO
     WHERE id_institucion = $1
     ORDER BY fecha_evento`,
    [idInstitucion]
  );
  return rows;
}

/** Evento con su sede (para validar pertenencia: 404 si es de otra sede). */
async function porId(idEvento) {
  const { rows } = await query(
    `SELECT id_evento, id_institucion, id_usuario_creador, titulo, descripcion,
            to_char(fecha_evento, 'YYYY-MM-DD"T"HH24:MI') AS fecha_evento,
            fecha_creacion
     FROM CALENDARIO_ENSAYO WHERE id_evento = $1`,
    [idEvento]
  );
  return rows[0] ?? null;
}

async function crear({ idInstitucion, idUsuarioCreador, titulo, descripcion, fechaEvento }) {
  const { rows } = await query(
    `INSERT INTO CALENDARIO_ENSAYO (id_institucion, id_usuario_creador, titulo, descripcion, fecha_evento)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id_evento, id_institucion, titulo, descripcion,
               to_char(fecha_evento, 'YYYY-MM-DD"T"HH24:MI') AS fecha_evento,
               fecha_creacion`,
    [idInstitucion, idUsuarioCreador, titulo, descripcion, fechaEvento]
  );
  return rows[0];
}

async function actualizar(idEvento, cambios) {
  const columnas = { titulo: 'titulo', descripcion: 'descripcion', fecha_evento: 'fecha_evento' };
  const asignaciones = [];
  const valores = [];
  for (const [campo, valor] of Object.entries(cambios)) {
    if (columnas[campo]) {
      valores.push(valor);
      asignaciones.push(`${columnas[campo]} = $${valores.length}`);
    }
  }
  if (asignaciones.length === 0) return null;
  valores.push(idEvento);
  const { rows } = await query(
    `UPDATE CALENDARIO_ENSAYO SET ${asignaciones.join(', ')}
     WHERE id_evento = $${valores.length}
     RETURNING id_evento, id_institucion, titulo, descripcion,
               to_char(fecha_evento, 'YYYY-MM-DD"T"HH24:MI') AS fecha_evento,
               fecha_creacion`,
    valores
  );
  return rows[0] ?? null;
}

async function eliminar(idEvento) {
  const { rows } = await query(
    'DELETE FROM CALENDARIO_ENSAYO WHERE id_evento = $1 RETURNING id_evento',
    [idEvento]
  );
  return rows[0] ?? null;
}

module.exports = { listarPorInstitucion, porId, crear, actualizar, eliminar };
