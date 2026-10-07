'use strict';

/**
 * RF-07 — Matrícula, edición y baja de estudiantes de la sede (CP-09).
 * Alta/edición con formulario; la contraseña es obligatoria solo al matricular
 * y opcional al editar. La baja es lógica (activo=false), tal como en el
 * resto de la gestión de usuarios.
 */
panelListo.then((listo) => {
  if (!listo) return;

  const mensaje = document.getElementById('est-mensaje');
  const formulario = document.getElementById('form-estudiante');
  const campoId = document.getElementById('est-id');
  const boton = document.getElementById('est-boton');
  const botonCancelar = document.getElementById('est-cancelar');
  const tbody = document.querySelector('#tabla-estudiantes tbody');
  const campoPassword = document.getElementById('est-password');

  /** Carga el listado de la sede y lo pinta. */
  async function cargar() {
    const datos = await api.get('/api/institucion/estudiantes');
    tbody.innerHTML = datos.estudiantes
      .map(
        (e) => `
        <tr>
          <td>${e.id}</td>
          <td>${esc(e.nombre)}</td>
          <td>${esc(e.correo)}</td>
          <td>${esc(e.matricula ?? '—')}</td>
          <td>${e.activo ? 'Activo' : 'Baja'}</td>
          <td class="acciones">
            <button type="button" data-accion="editar" data-id="${e.id}">Editar</button>
            ${
              e.activo
                ? `<button type="button" class="peligro" data-accion="baja" data-id="${e.id}">Dar de baja</button>`
                : ''
            }
          </td>
        </tr>`
      )
      .join('');
  }

  function limpiarFormulario() {
    formulario.reset();
    campoId.value = '';
    boton.textContent = 'Matricular estudiante';
    botonCancelar.classList.add('oculto');
    campoPassword.required = true;
    mostrarMensaje(mensaje, '');
  }

  formulario.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    mostrarMensaje(mensaje, '');

    const nombre = document.getElementById('est-nombre').value.trim();
    const correo = document.getElementById('est-correo').value.trim();
    const password = campoPassword.value;
    const matricula = document.getElementById('est-matricula').value.trim();
    if (!nombre || !correo) return mostrarMensaje(mensaje, 'Nombre y correo son obligatorios.');

    const esEdicion = Boolean(campoId.value);
    if (!esEdicion && !password) {
      return mostrarMensaje(mensaje, 'Define una contraseña inicial para matricular.');
    }

    try {
      const cuerpo = { nombre, correo };
      if (password) cuerpo.password = password; // opcional solo en edición
      if (matricula) cuerpo.matricula = matricula;

      if (esEdicion) {
        await api.put(`/api/institucion/estudiantes/${campoId.value}`, cuerpo);
      } else {
        await api.post('/api/institucion/estudiantes', cuerpo);
      }
      limpiarFormulario();
      mostrarMensaje(mensaje, esEdicion ? 'Estudiante actualizado.' : 'Estudiante matriculado.', 'exito');
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
        const datos = await api.get('/api/institucion/estudiantes');
        const estudiante = datos.estudiantes.find((e) => e.id === Number(id));
        if (!estudiante) return mostrarMensaje(mensaje, 'Estudiante no encontrado.');
        campoId.value = estudiante.id;
        document.getElementById('est-nombre').value = estudiante.nombre;
        document.getElementById('est-correo').value = estudiante.correo;
        document.getElementById('est-matricula').value = estudiante.matricula ?? '';
        campoPassword.value = '';
        campoPassword.required = false; // en edición la clave es opcional
        boton.textContent = 'Guardar cambios';
        botonCancelar.classList.remove('oculto');
        mostrarMensaje(mensaje, `Editando a «${estudiante.nombre}».`, 'exito');
        document.getElementById('est-nombre').focus();
        return;
      }

      if (accion === 'baja') {
        if (!window.confirm('¿Dar de baja a este estudiante? Se conserva el registro (baja lógica).')) return;
        await api.enviar('DELETE', `/api/institucion/estudiantes/${id}`);
        mostrarMensaje(mensaje, 'Estudiante dado de baja.', 'exito');
        await cargar();
      }
    } catch (error) {
      mostrarMensaje(mensaje, error.message);
    }
  });

  document.addEventListener('seccion-activada', (evento) => {
    if (evento.detail === 'estudiantes') cargar().catch(() => {});
  });

  cargar().catch((error) => mostrarMensaje(mensaje, error.message));
});
