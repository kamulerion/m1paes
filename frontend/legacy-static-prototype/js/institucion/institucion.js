'use strict';

/* exported panelListo */

/**
 * Panel del Admin de Institución (Fase 4: RF-07, RF-14, RF-16).
 * Guarda de rol ADMIN_INSTITUCION + pestañas compartidas vía js/panel.js;
 * el backend también responde 403 fuera de este rol y siempre opera sobre
 * la sede propia. Las secciones esperan `panelListo` antes de tocar la API.
 */
const panelListo = iniciarPanel('ADMIN_INSTITUCION');
