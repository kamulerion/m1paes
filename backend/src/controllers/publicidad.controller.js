'use strict';

const publicidadService = require('../services/publicidad.service');
const usuarioRepository = require('../repositories/usuario.repository');

/**
 * RF-15 — Anuncios publicitarios segmentados (CP-21).
 * La segmentación vive en el servidor (`publicidad.service`): el cliente solo
 * pinta lo que el servidor decide entregarle según la modalidad de la cuenta.
 */
async function listar(req, res, next) {
  try {
    const usuario = await usuarioRepository.porId(req.sesion.sub);
    // Usuario eliminado con token aún válido → sin publicidad (lista vacía).
    const anuncios = publicidadService.obtenerAnuncios(usuario?.tipo_suscripcion);
    res.json({ anuncios });
  } catch (err) {
    next(err);
  }
}

module.exports = { listar };
