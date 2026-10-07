'use strict';

/* exported esc, fechaCorta */

/**
 * Helpers de presentación compartidos por todas las páginas
 * (panel admin y módulo estudiante — Fase 3).
 */

/** Escapa HTML del servidor/datos antes de inyectarlo con innerHTML. */
function esc(valor) {
  return String(valor ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[c]);
}

/** Fecha corta en es-CL (o '—'). */
function fechaCorta(valor) {
  if (!valor) return '—';
  return new Date(valor).toLocaleDateString('es-CL');
}
