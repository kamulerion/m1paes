'use strict';

/**
 * RF-14 — Reporte consolidado de rendimiento de la sede (CP-19):
 * cifras de la sede (alumnos, prácticas, simulacros y puntajes) y el
 * cuadro de áreas débiles: ejes ordenados del menor al mayor progreso,
 * con diagnóstico bajo 50 %.
 */
panelListo.then((listo) => {
  if (!listo) return;

  const mensaje = document.getElementById('rep-mensaje');

  async function cargar() {
    const datos = await api.get('/api/institucion/reporte');
    const r = datos.resumen;

    document.getElementById('rep-sede').textContent =
      `Sede: ${datos.sede.nombre} · ${r.estudiantes} estudiantes matriculados (${r.activos} activos)`;

    document.getElementById('rep-resumen').innerHTML = `
      <div class="cifra"><strong>${r.promedio_puntaje}</strong>puntaje promedio</div>
      <div class="cifra"><strong>${r.mejor_puntaje}</strong>mejor puntaje</div>
      <div class="cifra"><strong>${r.simulacros}</strong>simulacros rendidos</div>
      <div class="cifra"><strong>${r.practicas}</strong>prácticas</div>
      <div class="cifra"><strong>${r.activos}</strong>estudiantes activos</div>`;

    document.querySelector('#tabla-reporte tbody').innerHTML = datos.areas_debiles
      .map((eje, i) => {
        const debil = eje.progreso_promedio < 50;
        return `<tr>
          <td>${i + 1}</td>
          <td>${esc(eje.nombre)}</td>
          <td>${eje.progreso_promedio} %</td>
          <td>${eje.respuestas}</td>
          <td>${eje.aciertos}</td>
          <td>${debil ? 'Área débil' : 'Satisfactorio'}</td>
        </tr>`;
      })
      .join('');
  }

  function refrescar() {
    cargar().catch((error) => mostrarMensaje(mensaje, error.message));
  }

  document.addEventListener('seccion-activada', (evento) => {
    if (evento.detail === 'reporte') refrescar();
  });

  refrescar();
});
