'use strict';

/**
 * RF-16 — Calendario de ensayos de la sede (CP-10): alta, edición y
 * eliminación de eventos. La fecha viaja como "reloj de pared"
 * (datetime-local → 'YYYY-MM-DDTHH:MM'), el mismo formato que devuelve la
 * API, por lo que no hay conversión de huso horario.
 */
panelListo.then((listo) => {
  if (!listo) return;

  const mensaje = document.getElementById('ev-mensaje');
  const formulario = document.getElementById('form-evento');
  const campoId = document.getElementById('ev-id');
  const boton = document.getElementById('ev-boton');
  const botonCancelar = document.getElementById('ev-cancelar');
  const tbody = document.querySelector('#tabla-calendario tbody');

  async function cargar() {
    const datos = await api.get('/api/institucion/calendario');
    tbody.innerHTML = datos.eventos
      .map(
        (ev) => `
        <tr>
          <td>${ev.id_evento}</td>
          <td>${esc(ev.titulo)}</td>
          <td>${fechaCorta(ev.fecha_evento)} ${esc(ev.fecha_evento.slice(11))}</td>
          <td>${esc(ev.descripcion ?? '—')}</td>
          <td class="acciones">
            <button type="button" data-accion="editar" data-id="${ev.id_evento}">Editar</button>
            <button type="button" class="peligro" data-accion="eliminar" data-id="${ev.id_evento}">Eliminar</button>
          </td>
        </tr>`
      )
      .join('');
  }

  function limpiarFormulario() {
    formulario.reset();
    campoId.value = '';
    boton.textContent = 'Asignar evento';
    botonCancelar.classList.add('oculto');
    mostrarMensaje(mensaje, '');
  }

  formulario.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    mostrarMensaje(mensaje, '');

    const titulo = document.getElementById('ev-titulo').value.trim();
    const fecha = document.getElementById('ev-fecha').value;
    const descripcion = document.getElementById('ev-descripcion').value.trim();
    if (!titulo || !fecha) return mostrarMensaje(mensaje, 'Título y fecha/hora son obligatorios.');

    try {
      const cuerpo = { titulo, fecha_evento: fecha };
      if (descripcion) cuerpo.descripcion = descripcion;

      const esEdicion = Boolean(campoId.value);
      if (esEdicion) {
        await api.put(`/api/institucion/calendario/${campoId.value}`, cuerpo);
      } else {
        await api.post('/api/institucion/calendario', cuerpo);
      }
      limpiarFormulario();
      mostrarMensaje(mensaje, esEdicion ? 'Evento actualizado.' : 'Evento asignado al calendario.', 'exito');
      await cargar();
    } catch (error) {
      mostrarMensaje(mensaje, error.message);
    }
    return undefined;
  });

  botonCancelar.addEventListener('click', limpiarFormulario);

  tbody.addEventListener('click', async (evento) => {
    const botonFila = evento.target.closest('button[data-accion]');
    if (!botonFila) return;
    const id = botonFila.dataset.id;
    const accion = botonFila.dataset.accion;

    try {
      if (accion === 'editar') {
        const datos = await api.get('/api/institucion/calendario');
        const evento = datos.eventos.find((e) => e.id_evento === Number(id));
        if (!evento) return mostrarMensaje(mensaje, 'Evento no encontrado.');
        campoId.value = evento.id_evento;
        document.getElementById('ev-titulo').value = evento.titulo;
        document.getElementById('ev-fecha').value = evento.fecha_evento;
        document.getElementById('ev-descripcion').value = evento.descripcion ?? '';
        boton.textContent = 'Guardar cambios';
        botonCancelar.classList.remove('oculto');
        mostrarMensaje(mensaje, `Editando «${evento.titulo}».`, 'exito');
        document.getElementById('ev-titulo').focus();
        return;
      }

      if (accion === 'eliminar') {
        if (!window.confirm('¿Eliminar este evento del calendario de la sede?')) return;
        await api.enviar('DELETE', `/api/institucion/calendario/${id}`);
        mostrarMensaje(mensaje, 'Evento eliminado.', 'exito');
        await cargar();
      }
    } catch (error) {
      mostrarMensaje(mensaje, error.message);
    }
  });

  document.addEventListener('seccion-activada', (evento) => {
    if (evento.detail === 'calendario') cargar().catch(() => {});
  });

  cargar().catch((error) => mostrarMensaje(mensaje, error.message));
});
