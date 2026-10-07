'use strict';

/** Prueba de humo del MVP: consulta la salud de la API y la muestra. */
(async function mostrarEstadoApi() {
  const el = document.getElementById('api-status');
  try {
    const respuesta = await fetch('/api/health');
    const datos = await respuesta.json();
    el.textContent =
      `API: ${datos.status} · versión ${datos.version} · entorno ${datos.environment}\n` +
      `tiempo activo: ${datos.uptimeSec}s\n` +
      `actualizado: ${datos.timestamp}`;
  } catch (error) {
    el.textContent = `No fue posible contactar a la API: ${error.message}`;
  }
})();

/** Estado de sesión en el inicio (RF-02): saludo o enlace de ingreso. */
(async function mostrarSesion() {
  const el = document.getElementById('sesion-estado');
  const enlace = document.getElementById('enlace-sesion');
  if (!el || !enlace) return;
  try {
    const usuario = await obtenerSesion();
    const enlaceAdmin = document.getElementById('enlace-admin');
    const enlaceSede = document.getElementById('enlace-sede');
    if (usuario) {
      el.textContent = `Sesión iniciada como ${usuario.nombre} (${usuario.rol}).`;
      enlace.textContent = 'Mi perfil';
      enlace.href = '/perfil.html';
      // El panel de administración solo se muestra al Superadmin (RF-05..RF-10, RF-17).
      if (enlaceAdmin) enlaceAdmin.hidden = usuario.rol !== 'SUPERADMIN';
      // El panel de sede solo se muestra al Admin de Institución (Fase 4).
      if (enlaceSede) enlaceSede.hidden = usuario.rol !== 'ADMIN_INSTITUCION';
    } else {
      el.textContent = 'No has iniciado sesión. Crea una cuenta gratis para guardar tu avance.';
      enlace.textContent = 'Ingresar';
      enlace.href = '/login.html';
    }
  } catch (error) {
    el.textContent = `No fue posible verificar la sesión: ${error.message}`;
  }
})();
