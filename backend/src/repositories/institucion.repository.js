'use strict';

const { query } = require('../db/pool');

/**
 * Repositorio de INSTITUCION (RF-05, CRUD del Superadmin).
 * El esquema no tiene borrado físico recomendable (los usuarios referencian
 * la institución): la "baja" es lógica vía `activo` (columna existente).
 */

/** Listado con el conteo de usuarios vinculados a cada institución. */
async function listar() {
  const { rows } = await query(
    `SELECT i.*, COUNT(u.id_usuario)::int AS usuarios
     FROM INSTITUCION i
     LEFT JOIN USUARIO u ON u.id_institucion = i.id_institucion
     GROUP BY i.id_institucion
     ORDER BY i.nombre`
  );
  return rows;
}

async function porId(idInstitucion) {
  const { rows } = await query('SELECT * FROM INSTITUCION WHERE id_institucion = $1', [
    idInstitucion,
  ]);
  return rows[0] ?? null;
}

async function porRut(rutIdentificador) {
  const { rows } = await query('SELECT * FROM INSTITUCION WHERE rut_identificador = $1', [
    rutIdentificador,
  ]);
  return rows[0] ?? null;
}

async function crear({ nombre, rutIdentificador, convenioTipo }) {
  const { rows } = await query(
    `INSERT INTO INSTITUCION (nombre, rut_identificador, convenio_tipo)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [nombre, rutIdentificador, convenioTipo]
  );
  return rows[0];
}

/** Edita por id con lista blanca de columnas (nombre, rut, convenio, activo). */
async function actualizar(idInstitucion, cambios) {
  const columnas = {
    nombre: 'nombre',
    rut_identificador: 'rut_identificador',
    convenio_tipo: 'convenio_tipo',
    activo: 'activo',
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
  valores.push(idInstitucion);
  const { rows } = await query(
    `UPDATE INSTITUCION SET ${asignaciones.join(', ')}
     WHERE id_institucion = $${valores.length}
     RETURNING *`,
    valores
  );
  return rows[0] ?? null;
}

module.exports = { listar, porId, porRut, crear, actualizar };
