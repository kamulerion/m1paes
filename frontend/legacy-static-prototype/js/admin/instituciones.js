'use strict';

/**
 * RF-05 — CRUD de instituciones bajo convenio B2B (CP-07).
 * Alta/edición con formulario; la baja es lógica (activo=false) tal como
 * quedó definido en la bitácora de la Fase 2.
 */
panelListo.then((listo) => {
  if (!listo) return;

  const mensaje = document.getElementById('inst-mensaje');
  const formulario = document.getElementById('form-institucion');
  const campoId = document.getElementById('inst-id');
  const boton = document.getElementById('inst-boton');
  const botonCancelar = document.getElementById('inst-cancelar');
  const tbody = document.querySelector('#tabla-instituciones tbody');

  /** Carga el listado y lo pinta. */
  async function cargar() {
    const datos = await api.get('/api/admin/instituciones');
    tbody.innerHTML = datos.instituciones
      .map(
        (i) => `
        <tr>
          <td>${i.id_institucion}</td>
          <td>${esc(i.nombre)}</td>
          <td>${esc(i.rut_identificador)}</td>
          <td>${esc(i.convenio_tipo)}</td>
          <td>${i.usuarios}</td>
          <td>${i.activo ? 'Activa' : 'Baja'}</td>
          <td class="acciones">
            <button type="button" data-accion="editar" data-id="${i.id_institucion}">Editar</button>
            ${
              i.activo
                ? `<button type="button" class="peligro" data-accion="baja" data-id="${i.id_institucion}">Dar de baja</button>`
                : `<button type="button" data-accion="reactivar" data-id="${i.id_institucion}">Reactivar</button>`
            }
          </td>
        </tr>`
      )
      .join('');
  }

  function limpiarFormulario() {
    formulario.reset();
    campoId.value = '';
    boton.textContent = 'Crear institución';
    botonCancelar.classList.add('oculto');
    mostrarMensaje(mensaje, '');
  }

  formulario.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    mostrarMensaje(mensaje, '');

    const nombre = document.getElementById('inst-nombre').value.trim();
    const rut = document.getElementById('inst-rut').value.trim();
    const convenio = document.getElementById('inst-convenio').value;
    if (!nombre || !rut) return mostrarMensaje(mensaje, 'Nombre y RUT son obligatorios.');

    try {
      const esEdicion = Boolean(campoId.value);
      const cuerpo = { nombre, rut_identificador: rut, convenio_tipo: convenio };
      if (esEdicion) {
        await api.put(`/api/admin/instituciones/${campoId.value}`, cuerpo);
      } else {
        await api.post('/api/admin/instituciones', cuerpo);
      }
      limpiarFormulario();
      mostrarMensaje(mensaje, esEdicion ? 'Institución actualizada.' : 'Institución creada.', 'exito');
      await cargar();
    } catch (error) {
      mostrarMensaje(mensaje, error.message);
    }
  });

  botonCancelar.addEventListener('click', limpiarFormulario);

  tbody.addEventListener('click', async (evento) => {
    const botonFila = evento.target.closest('button[data-accion]');
    if (!botonFila) return;
    const id = botonFila.dataset.id;
    const accion = botonFila.dataset.accion;

    try {
      if (accion === 'editar') {
        const datos = await api.get('/api/admin/instituciones');
        const institucion = datos.instituciones.find((i) => i.id_institucion === Number(id));
        if (!institucion) return mostrarMensaje(mensaje, 'Institución no encontrada.');
        campoId.value = institucion.id_institucion;
        document.getElementById('inst-nombre').value = institucion.nombre;
        document.getElementById('inst-rut').value = institucion.rut_identificador;
        document.getElementById('inst-convenio').value = institucion.convenio_tipo;
        boton.textContent = 'Guardar cambios';
        botonCancelar.classList.remove('oculto');
        mostrarMensaje(mensaje, `Editando «${institucion.nombre}».`, 'exito');
        document.getElementById('inst-nombre').focus();
        return;
      }

      if (accion === 'baja') {
        if (!window.confirm('¿Dar de baja esta institución? Se conserva el historial (baja lógica).')) return;
        await api.enviar('DELETE', `/api/admin/instituciones/${id}`);
        mostrarMensaje(mensaje, 'Institución dada de baja.', 'exito');
      }

      if (accion === 'reactivar') {
        await api.put(`/api/admin/instituciones/${id}`, { activo: true });
        mostrarMensaje(mensaje, 'Institución reactivada.', 'exito');
      }

      await cargar();
    } catch (error) {
      mostrarMensaje(mensaje, error.message);
    }
  });

  document.addEventListener('seccion-activada', (evento) => {
    if (evento.detail === 'instituciones') cargar().catch(() => {});
  });

  cargar().catch((error) => mostrarMensaje(mensaje, error.message));
});
