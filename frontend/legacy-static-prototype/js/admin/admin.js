'use strict';

/* exported panelListo */

/**
 * Panel del Superadmin (RF-05..RF-10, RF-17).
 * La guarda de rol, el badge y las pestañas viven en js/panel.js (compartido
 * con el panel institucional desde la Fase 4). Las secciones esperan
 * `panelListo` antes de tocar la API.
 */
const panelListo = iniciarPanel('SUPERADMIN');
