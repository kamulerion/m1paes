'use strict';

/**
 * RF-17 — Métricas globales de concurrencia y actividad (CP-20).
 * Concurrencia: usuarios por rol/suscripción y sedes. Actividad:
 * prácticas, simulacros finalizados, puntaje promedio, respuestas y la
 * serie diaria de los últimos 7 días.
 */
panelListo.then((listo) => {
  if (!listo) return;

  const mensaje = document.getElementById('met-mensaje');

  async function cargar() {
    const datos = await api.get('/api/admin/metricas');
    const c = datos.concurrencia;
    const a = datos.actividad;

    document.getElementById('met-concurrencia').innerHTML = `
      <div class="cifra"><strong>${c.usuarios}</strong>usuarios totales</div>
      <div class="cifra"><strong>${c.usuarios_activos}</strong>usuarios activos</div>
      <div class="cifra"><strong>${c.instituciones}</strong>sedes</div>
      <div class="cifra"><strong>${c.institucionesActivas}</strong>sedes activas</div>`;

    document.querySelector('#tabla-metricas-roles tbody').innerHTML = c.porRol
      .map(
        (f) => `<tr>
          <td>${esc(f.rol)}</td>
          <td>${f.total}</td>
          <td>${f.activos}</td>
        </tr>`
      )
      .join('');

    document.getElementById('met-actividad').innerHTML = `
      <div class="cifra"><strong>${a.practicas}</strong>prácticas registradas</div>
      <div class="cifra"><strong>${a.simulacros}</strong>simulacros finalizados</div>
      <div class="cifra"><strong>${a.puntaje_promedio}</strong>puntaje promedio</div>
      <div class="cifra"><strong>${a.respuestas}</strong>respuestas</div>
      <div class="cifra"><strong>${a.practicas_hoy}</strong>actividad hoy</div>`;

    document.querySelector('#tabla-metricas-serie tbody').innerHTML = datos.serie
      .map(
        (d) => `<tr>
          <td>${fechaCorta(`${d.fecha}T00:00:00`)}</td>
          <td>${d.practicas}</td>
          <td>${d.simulacros}</td>
        </tr>`
      )
      .join('');
  }

  function refrescar() {
    cargar().catch((error) => mostrarMensaje(mensaje, error.message));
  }

  document.addEventListener('seccion-activada', (evento) => {
    if (evento.detail === 'metricas') refrescar();
  });

  refrescar();
});
