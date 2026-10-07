'use strict';

/**
 * RF-16 — Calendario de ensayos de la sede (CP-10).
 * - `listar/crear/editar/eliminar`: ADMIN_INSTITUCION sobre SU sede
 *   (req.idInstitucion); un evento de otra sede responde 404.
 * - `ver`: ESTUDIANTE ve los eventos publicados de SU sede; el Estudiante
 *   Free (sin sede) recibe la lista vacía. Es lo que hace tangible el
 *   CP-10: el evento queda publicado únicamente para su sede.
 *
 * La fecha se maneja como "reloj de pared" (datetime-local del navegador,
 * sin zona horaria): el repositorio la formatea con to_char al guardar y al
 * listar, de modo que ida y vuelta no arrastra conversiones de huso.
 */

const calendarioRepository = require('../repositories/calendario.repository');
const usuarioRepository = require('../repositories/usuario.repository');
const { AppError } = require('../utils/AppError');
const {
  validarObligatorio,
  validarFechaHora,
  lanzarSiInvalido,
  idDeRuta,
} = require('../utils/validate');

/** Evento de MI sede por id; 404 si no existe o pertenece a otra sede. */
async function exigirEventoDeMiSede(id, idInstitucion) {
  const evento = await calendarioRepository.porId(id);
  if (!evento || evento.id_institucion !== idInstitucion) {
    throw new AppError(404, 'Evento no encontrado en tu sede');
  }
  return evento;
}

function validarCuerpo(body) {
  const titulo = String(body.titulo ?? '').trim();
  const descripcion = body.descripcion !== undefined && body.descripcion !== null
    ? String(body.descripcion).trim()
    : null;
  lanzarSiInvalido([
    validarObligatorio(titulo, 'el título', 150),
    ...(descripcion ? [validarObligatorio(descripcion, 'la descripción', 2000)] : []),
    validarFechaHora(body.fecha_evento, 'la fecha y hora del ensayo'),
  ]);
  return { titulo, descripcion };
}

/** GET /api/institucion/calendario — eventos de mi sede (RF-16). */
async function listar(req, res, next) {
  try {
    const eventos = await calendarioRepository.listarPorInstitucion(req.idInstitucion);
    res.json({ eventos });
  } catch (err) {
    next(err);
  }
}

/** POST /api/institucion/calendario — asigna un evento (RF-16, CP-10). */
async function crear(req, res, next) {
  try {
    const body = req.body || {};
    const { titulo, descripcion } = validarCuerpo(body);
    const fecha = String(body.fecha_evento).trim();

    const evento = await calendarioRepository.crear({
      idInstitucion: req.idInstitucion,
      idUsuarioCreador: req.sesion.sub,
      titulo,
      descripcion,
      fechaEvento: fecha,
    });
    res.status(201).json({ mensaje: 'Evento asignado al calendario', evento });
  } catch (err) {
    next(err);
  }
}

/** PUT /api/institucion/calendario/:id — edita un evento de mi sede (RF-16). */
async function editar(req, res, next) {
  try {
    const id = idDeRuta(req.params.id);
    await exigirEventoDeMiSede(id, req.idInstitucion);

    const body = req.body || {};
    const cambios = {};
    if (body.titulo !== undefined) {
      const titulo = String(body.titulo).trim();
      lanzarSiInvalido([validarObligatorio(titulo, 'el título', 150)]);
      cambios.titulo = titulo;
    }
    if (body.descripcion !== undefined) {
      const descripcion = String(body.descripcion ?? '').trim();
      if (descripcion) {
        lanzarSiInvalido([validarObligatorio(descripcion, 'la descripción', 2000)]);
      }
      cambios.descripcion = descripcion || null;
    }
    if (body.fecha_evento !== undefined) {
      lanzarSiInvalido([validarFechaHora(body.fecha_evento, 'la fecha y hora del ensayo')]);
      cambios.fecha_evento = String(body.fecha_evento).trim();
    }
    if (Object.keys(cambios).length === 0) throw new AppError(400, 'No hay cambios para guardar');

    await calendarioRepository.actualizar(id, cambios);
    const actualizado = await calendarioRepository.porId(id);
    res.json({ mensaje: 'Evento actualizado', evento: actualizado });
  } catch (err) {
    next(err);
  }
}

/** DELETE /api/institucion/calendario/:id — elimina un evento de mi sede (RF-16). */
async function eliminar(req, res, next) {
  try {
    const id = idDeRuta(req.params.id);
    await exigirEventoDeMiSede(id, req.idInstitucion);
    await calendarioRepository.eliminar(id);
    res.json({ mensaje: 'Evento eliminado del calendario' });
  } catch (err) {
    next(err);
  }
}

/** GET /api/calendario — el estudiante ve los eventos publicados de SU sede. */
async function ver(req, res, next) {
  try {
    const usuario = await usuarioRepository.porId(req.sesion.sub);
    if (!usuario?.id_institucion) return res.json({ eventos: [] });
    const eventos = await calendarioRepository.listarPorInstitucion(usuario.id_institucion);
    return res.json({ eventos });
  } catch (err) {
    return next(err);
  }
}

module.exports = { listar, crear, editar, eliminar, ver };
