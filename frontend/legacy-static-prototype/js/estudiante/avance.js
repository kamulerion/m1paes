'use strict';

/**
 * RF-13 — Panel de progreso (CP-18): cifras globales, porcentaje por eje
 * temático (barras) e historial reciente de actividades.
 */
(async function iniciarAvance() {
  const usuario = await exigirRol('ESTUDIANTE');
  if (!usuario) return;

  document.getElementById('salir').addEventListener('click', (ev) => {
    ev.preventDefault();
    cerrarSesion();
  });

  const mensaje = document.getElementById('mensaje-global');

  function pintar(datos) {
    document.getElementById('resumen').innerHTML = `
      <div class="cifra"><strong>${datos.resumen.practicas}</strong>prácticas</div>
      <div class="cifra"><strong>${datos.resumen.simulacros}</strong>simulacros rendidos</div>
      <div class="cifra"><strong>${datos.resumen.mejor_puntaje}</strong>mejor puntaje</div>
      <div class="cifra"><strong>${datos.resumen.promedio_puntaje}</strong>puntaje promedio</div>`;

    document.getElementById('global-valor').textContent = `${datos.global} %`;

    document.getElementById('por-eje').innerHTML = datos.ejes
      .map(
        (eje) => `
        <div class="fila-eje">
          <span>${esc(eje.nombre)}</span>
          <span>${eje.porcentaje} %</span>
        </div>
        <div class="barra"><span style="width:${eje.porcentaje}%"></span></div>`
      )
      .join('');

    const sinActividad = datos.resumen.practicas === 0 && datos.resumen.simulacros === 0;
    document.getElementById('sin-datos').classList.toggle('oculto', !sinActividad);

    const cuerpo = document.querySelector('#tabla-historial tbody');
    cuerpo.innerHTML = datos.historial
      .map((h) => {
        const esSimulacro = h.tipo_actividad === 'SIMULACRO_OFICIAL';
        const actividad = esSimulacro
          ? `Simulacro: ${h.simulacro ?? '—'}`
          : 'Práctica de lección';
        const puntaje = esSimulacro ? h.puntaje_obtenido : '—';
        return `<tr>
          <td>${fechaCorta(h.fecha_realizacion)}</td>
          <td>${esc(actividad)}</td>
          <td>${puntaje}</td>
          <td>${h.duracion_minutos} min</td>
        </tr>`;
      })
      .join('');
    document.getElementById('sin-historial').classList.toggle('oculto', datos.historial.length > 0);
  }

  try {
    pintar(await api.get('/api/progreso'));
  } catch (error) {
    mostrarMensaje(mensaje, `No fue posible cargar tu avance: ${error.message}`);
  }

  // Calendario de ensayos de tu sede (RF-16): solo los eventos publicados
  // para la institución a la que perteneces; el Estudiante Free ve vacío.
  try {
    const calendario = await api.get('/api/calendario');
    document.querySelector('#tabla-calendario-sede tbody').innerHTML = calendario.eventos
      .map(
        (ev) => `<tr>
          <td>${fechaCorta(ev.fecha_evento)} ${esc(ev.fecha_evento.slice(11))}</td>
          <td>${esc(ev.titulo)}</td>
          <td>${esc(ev.descripcion ?? '—')}</td>
        </tr>`
      )
      .join('');
    document.getElementById('sin-eventos').classList.toggle('oculto', calendario.eventos.length > 0);
  } catch (error) {
    mostrarMensaje(mensaje, `No fue posible cargar el calendario: ${error.message}`);
  }
})();
