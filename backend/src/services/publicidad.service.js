'use strict';

/**
 * RF-15 — Publicidad formativa (modelo Ad-Supported Freemium del informe v3,
 * sección 5.2: «Publicitario Formativo»).
 *
 * Catálogo semilla local con anuncios de centros de formación técnica (CFT/IP).
 * El proyecto es 100 % local (ADR-001): no se integra ninguna red
 * publicitaria externa y los anuncios son puramente informativos (sin
 * enlaces externos que pudieran romperse en la demo).
 *
 * Regla de segmentación (CP-21): el catálogo se entrega SOLO a cuentas con
 * `tipo_suscripcion = 'FREE'`. Cualquier cuenta INSTITUCIONAL (estudiante
 * matriculado por su sede y Admin de Institución) recibe la lista vacía, de
 * modo que la interfaz B2B queda completamente libre de anuncios.
 */

const ANUNCIOS = Object.freeze([
  Object.freeze({
    id: 'cft-los-andes',
    institucion: 'CFT Los Andes',
    titulo: 'Admisión 2027: técnicos en enfermería y contabilidad',
    texto: 'Formación con prácticas en establecimientos de salud. Postula con tu pontaje PAES.',
  }),
  Object.freeze({
    id: 'ip-pacifico-sur',
    institucion: 'IP Pacífico Sur',
    titulo: 'Ingeniería en Informática con modalidad dual',
    texto: 'Alternancia entre aula y empresa desde el segundo año. Becas de matrícula disponibles.',
  }),
  Object.freeze({
    id: 'cft-puerto-norte',
    institucion: 'CFT Puerto Norte',
    titulo: 'Técnico en prevención de riesgos y logística',
    texto: 'Certificación de nivel superior con empleabilidad proyectada al 92 % de sus egresados.',
  }),
]);

/**
 * Catálogo que corresponde mostrar a una cuenta según su modalidad.
 * Solo la modalidad FREE recibe anuncios; todo lo demás (INSTITUCIONAL o
 * sin modalidad) queda sin publicidad (defensa en profundidad del CP-21).
 */
function obtenerAnuncios(tipoSuscripcion) {
  if (tipoSuscripcion !== 'FREE') return [];
  return ANUNCIOS;
}

module.exports = { ANUNCIOS, obtenerAnuncios };
