'use strict';

/* exported iniciarPanel */

/**
 * Núcleo compartido de los paneles con pestañas (admin.html e institucion.html).
 * - Guarda de rol: sin sesión → login; con otro rol → inicio (el backend
 *   también responde 403, doble barrera).
 * - Badge del usuario, cierre de sesión y pestañas accesibles
 *   (role=tab/tabpanel con aria-selected).
 * - Al cambiar de pestaña dispara 'seccion-activada' para que cada sección
 *   refresque sus datos.
 * Devuelve true cuando la sesión corresponde al rol pedido; las secciones
 * esperan `panelListo` (declarado en admin/admin.js o institucion/institucion.js).
 */
async function iniciarPanel(rolPermitido) {
  const usuario = await exigirRol(rolPermitido); // redirige si no corresponde
  if (!usuario) return false;

  const badge = document.getElementById('rol-admin');
  if (badge) badge.textContent = `${usuario.nombre} · ${usuario.rol} · ${usuario.suscripcion}`;

  document.getElementById('salir').addEventListener('click', async (evento) => {
    evento.preventDefault();
    await cerrarSesion();
  });

  // --- Pestañas ---
  const botones = Array.from(document.querySelectorAll('.seccion'));
  const paneles = Array.from(document.querySelectorAll('.panel'));
  botones.forEach((boton) => {
    boton.addEventListener('click', () => {
      const destino = boton.dataset.seccion;
      botones.forEach((b) => {
        const activa = b === boton;
        b.classList.toggle('activa', activa);
        b.setAttribute('aria-selected', String(activa));
      });
      paneles.forEach((panel) => {
        panel.classList.toggle('activa', panel.id === `seccion-${destino}`);
      });
      document.dispatchEvent(new CustomEvent('seccion-activada', { detail: destino }));
    });
  });

  return true;
}
