'use strict';

const contenidoRepository = require('../repositories/contenido.repository');
const ejercicioRepository = require('../repositories/ejercicio.repository');
const { AppError } = require('../utils/AppError');
const {
  validarObligatorio,
  validarEntero,
  validarUrlOpcional,
  lanzarSiInvalido,
  idDeRuta,
} = require('../utils/validate');

// ---------- administración (RF-08, Superadmin) ----------

/** GET /api/admin/ejes — ejes con su conteo de lecciones. */
async function listarEjes(_req, res, next) {
  try {
    res.json({ ejes: await contenidoRepository.listarEjes() });
  } catch (err) {
    next(err);
  }
}

/** POST /api/admin/ejes — crea un eje temático. */
async function crearEje(req, res, next) {
  try {
    const body = req.body || {};
    const nombre = String(body.nombre ?? '').trim();
    const descripcion = body.descripcion ? String(body.descripcion).trim() : null;
    lanzarSiInvalido([
      validarObligatorio(nombre, 'el nombre', 100, 2),
      validarObligatorio(descripcion ?? '', 'la descripción', 2000),
    ]);
    if (await contenidoRepository.porNombreEje(nombre)) {
      throw new AppError(409, 'Ya existe un eje con ese nombre');
    }
    const eje = await contenidoRepository.crearEje({ nombre, descripcion });
    res.status(201).json({ mensaje: 'Eje creado', eje });
  } catch (err) {
    next(err);
  }
}

/** PUT /api/admin/ejes/:id — edita nombre o descripción del eje. */
async function editarEje(req, res, next) {
  try {
    const id = idDeRuta(req.params.id);
    if (!(await contenidoRepository.porEje(id))) throw new AppError(404, 'Eje no encontrado');
    const body = req.body || {};
    const cambios = {};
    if (body.nombre !== undefined) {
      const nombre = String(body.nombre).trim();
      lanzarSiInvalido([validarObligatorio(nombre, 'el nombre', 100, 2)]);
      const dup = await contenidoRepository.porNombreEje(nombre);
      if (dup && dup.id_eje !== id) throw new AppError(409, 'Ya existe un eje con ese nombre');
      cambios.nombre = nombre;
    }
    if (body.descripcion !== undefined) {
      const descripcion = String(body.descripcion).trim();
      lanzarSiInvalido([validarObligatorio(descripcion, 'la descripción', 2000)]);
      cambios.descripcion = descripcion;
    }
    if (Object.keys(cambios).length === 0) throw new AppError(400, 'No hay cambios para guardar');
    const eje = await contenidoRepository.actualizarEje(id, cambios);
    res.json({ mensaje: 'Eje actualizado', eje });
  } catch (err) {
    next(err);
  }
}

/** GET /api/admin/lecciones — lecciones (filtrables por ?id_eje=). */
async function listarLecciones(req, res, next) {
  try {
    const idEje = req.query.id_eje ? idDeRuta(req.query.id_eje) : null;
    if (idEje && !(await contenidoRepository.porEje(idEje))) {
      throw new AppError(404, 'Eje no encontrado');
    }
    res.json({ lecciones: await contenidoRepository.listarLecciones(idEje) });
  } catch (err) {
    next(err);
  }
}

/** POST /api/admin/lecciones — crea y publica una lección en un eje (CP-11). */
async function crearLeccion(req, res, next) {
  try {
    const body = req.body || {};
    const idEje = body.id_eje;
    const titulo = String(body.titulo ?? '').trim();
    const cuerpo = String(body.cuerpo_teoria ?? '').trim();
    const urlVideo = body.url_video ?? null;
    const orden = body.orden ?? 1;

    lanzarSiInvalido([
      validarObligatorio(titulo, 'el título', 150, 3),
      validarObligatorio(cuerpo, 'el cuerpo de la teoría', 100000, 10),
      validarUrlOpcional(urlVideo, 'la URL del video'),
      validarEntero(orden, 'el orden', 1, 1000),
    ]);
    if (!Number.isInteger(idEje)) {
      throw new AppError(400, 'Datos inválidos', { campos: ['id_eje inválido'] });
    }
    if (!(await contenidoRepository.porEje(idEje))) {
      throw new AppError(400, 'Datos inválidos', { campos: ['el eje indicado no existe'] });
    }

    const leccion = await contenidoRepository.crearLeccion({
      idEje,
      idAdminCreador: req.sesion.sub,
      titulo,
      cuerpoTeoria: cuerpo,
      urlVideo,
      orden,
    });
    res.status(201).json({ mensaje: 'Lección publicada', leccion });
  } catch (err) {
    next(err);
  }
}

/** PUT /api/admin/lecciones/:id — edita una lección (y su eje si cambia). */
async function editarLeccion(req, res, next) {
  try {
    const id = idDeRuta(req.params.id);
    if (!(await contenidoRepository.porLeccion(id))) {
      throw new AppError(404, 'Lección no encontrada');
    }
    const body = req.body || {};
    const cambios = {};
    if (body.titulo !== undefined) {
      const titulo = String(body.titulo).trim();
      lanzarSiInvalido([validarObligatorio(titulo, 'el título', 150, 3)]);
      cambios.titulo = titulo;
    }
    if (body.cuerpo_teoria !== undefined) {
      const cuerpo = String(body.cuerpo_teoria).trim();
      lanzarSiInvalido([validarObligatorio(cuerpo, 'el cuerpo de la teoría', 100000, 10)]);
      cambios.cuerpo_teoria = cuerpo;
    }
    if (body.url_video !== undefined) {
      lanzarSiInvalido([validarUrlOpcional(body.url_video, 'la URL del video')]);
      cambios.url_video = body.url_video || null;
    }
    if (body.orden !== undefined) {
      lanzarSiInvalido([validarEntero(body.orden, 'el orden', 1, 1000)]);
      cambios.orden = body.orden;
    }
    if (body.id_eje !== undefined) {
      if (!Number.isInteger(body.id_eje) || !(await contenidoRepository.porEje(body.id_eje))) {
        throw new AppError(400, 'Datos inválidos', { campos: ['el eje indicado no existe'] });
      }
      cambios.id_eje = body.id_eje;
    }
    if (Object.keys(cambios).length === 0) throw new AppError(400, 'No hay cambios para guardar');

    const leccion = await contenidoRepository.actualizarLeccion(id, cambios);
    res.json({ mensaje: 'Lección actualizada', leccion });
  } catch (err) {
    next(err);
  }
}

// ---------- visión estudiante (CP-11: "disponible para estudiantes") ----------

/**
 * GET /api/ejes — ejes con sus lecciones publicadas, para cualquier usuario
 * con sesión (base del RF-18, que la Fase 3 amplía con ejercicios).
 */
async function ejesPublicos(_req, res, next) {
  try {
    res.json({ ejes: await contenidoRepository.ejesConLecciones() });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/contenido/lecciones/:id — detalle de una lección para el
 * estudiante (RF-18): teoría completa + ejercicios de práctica, sin
 * soluciones ni indicación de cuál es la correcta.
 */
async function leccionDetalle(req, res, next) {
  try {
    const id = idDeRuta(req.params.id);
    const leccion = await contenidoRepository.porLeccion(id);
    if (!leccion) throw new AppError(404, 'Lección no encontrada');
    const ejercicios = await ejercicioRepository.listarPorContenidoEstudiante(id);
    res.json({ leccion, ejercicios });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listarEjes,
  crearEje,
  editarEje,
  listarLecciones,
  crearLeccion,
  editarLeccion,
  ejesPublicos,
  leccionDetalle,
};
