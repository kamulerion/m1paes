'use strict';

const { query } = require('../db/pool');

/**
 * Repositorio de EJE_TEMATICO y CONTENIDO (RF-08).
 * En el esquema v3 toda lección nace con fecha_publicacion (NOT NULL con
 * DEFAULT): "publicar" = crear la lección; el listado público solo muestra
 * las que pertenecen a un eje vigente.
 */

// --- Ejes temáticos ---

async function listarEjes() {
  const { rows } = await query(
    `SELECT e.*,
            (SELECT COUNT(*)::int FROM CONTENIDO c WHERE c.id_eje = e.id_eje) AS lecciones
     FROM EJE_TEMATICO e
     ORDER BY e.id_eje`
  );
  return rows;
}

async function porEje(idEje) {
  const { rows } = await query('SELECT * FROM EJE_TEMATICO WHERE id_eje = $1', [idEje]);
  return rows[0] ?? null;
}

async function porNombreEje(nombre) {
  const { rows } = await query('SELECT * FROM EJE_TEMATICO WHERE nombre = $1', [nombre]);
  return rows[0] ?? null;
}

async function crearEje({ nombre, descripcion }) {
  const { rows } = await query(
    'INSERT INTO EJE_TEMATICO (nombre, descripcion) VALUES ($1, $2) RETURNING *',
    [nombre, descripcion]
  );
  return rows[0];
}

async function actualizarEje(idEje, cambios) {
  const columnas = { nombre: 'nombre', descripcion: 'descripcion' };
  const asignaciones = [];
  const valores = [];
  for (const [campo, valor] of Object.entries(cambios)) {
    if (columnas[campo]) {
      valores.push(valor);
      asignaciones.push(`${columnas[campo]} = $${valores.length}`);
    }
  }
  if (asignaciones.length === 0) return null;
  valores.push(idEje);
  const { rows } = await query(
    `UPDATE EJE_TEMATICO SET ${asignaciones.join(', ')}
     WHERE id_eje = $${valores.length}
     RETURNING *`,
    valores
  );
  return rows[0] ?? null;
}

// --- Lecciones (CONTENIDO) ---

async function listarLecciones(idEje = null) {
  const filtros = idEje ? 'WHERE c.id_eje = $1' : '';
  const { rows } = await query(
    `SELECT c.*, e.nombre AS eje, u.nombre AS admin_creador
     FROM CONTENIDO c
     JOIN EJE_TEMATICO e ON e.id_eje = c.id_eje
     JOIN USUARIO u ON u.id_usuario = c.id_admin_creador
     ${filtros}
     ORDER BY c.id_eje, c.orden`,
    idEje ? [idEje] : []
  );
  return rows;
}

async function porLeccion(idContenido) {
  const { rows } = await query('SELECT * FROM CONTENIDO WHERE id_contenido = $1', [idContenido]);
  return rows[0] ?? null;
}

async function crearLeccion({ idEje, idAdminCreador, titulo, cuerpoTeoria, urlVideo, orden }) {
  const { rows } = await query(
    `INSERT INTO CONTENIDO (id_eje, id_admin_creador, titulo, cuerpo_teoria, url_video, orden)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [idEje, idAdminCreador, titulo, cuerpoTeoria, urlVideo, orden]
  );
  return rows[0];
}

async function actualizarLeccion(idContenido, cambios) {
  const columnas = {
    id_eje: 'id_eje',
    titulo: 'titulo',
    cuerpo_teoria: 'cuerpo_teoria',
    url_video: 'url_video',
    orden: 'orden',
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
  valores.push(idContenido);
  const { rows } = await query(
    `UPDATE CONTENIDO SET ${asignaciones.join(', ')}
     WHERE id_contenido = $${valores.length}
     RETURNING *`,
    valores
  );
  return rows[0] ?? null;
}

// --- Vista para estudiantes (RF-18 se amplía en la Fase 3) ---

/** Ejes con sus lecciones publicadas (orden del informe). */
async function ejesConLecciones() {
  const { rows } = await query(
    `SELECT e.id_eje, e.nombre, e.descripcion,
            COALESCE(
              json_agg(
                json_build_object(
                  'id', c.id_contenido, 'titulo', c.titulo,
                  'orden', c.orden, 'fechaPublicacion', c.fecha_publicacion
                ) ORDER BY c.orden
              ) FILTER (WHERE c.id_contenido IS NOT NULL),
              '[]'
            )::json AS lecciones
     FROM EJE_TEMATICO e
     LEFT JOIN CONTENIDO c ON c.id_eje = e.id_eje
     GROUP BY e.id_eje
     ORDER BY e.id_eje`
  );
  return rows;
}

module.exports = {
  listarEjes,
  porEje,
  porNombreEje,
  crearEje,
  actualizarEje,
  listarLecciones,
  porLeccion,
  crearLeccion,
  actualizarLeccion,
  ejesConLecciones,
};
