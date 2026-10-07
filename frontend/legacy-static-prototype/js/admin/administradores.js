'use strict';

/**
 * RF-06 — Administradores de Institución (CP-08).
 * El alta envía contraseña y sede; la edición cambia nombre, cargo o sede
 * (la contraseña solo se define en el alta). La baja es lógica.
 */
panelListo.then((listo) => {
  if (!listo) return;

  const mensaje = document.getElementById('adm-mensaje');
  const formulario = document.getElementById('form-administrador');
  const campoId = document.getElementById('adm-id');
  const campoCorreo = document.getElementById('adm-correo');
  const boton = document.getElementById('adm-boton');
  const botonCancelar = document.getElementById('adm-cancelar');
  const grupoPassword = document.getElementById('adm-grupo-password');
  const selectInstitucion = document.getElementById('adm-institucion');
  const tbody = document.querySelector('#tabla-administradores tbody');

  /** Select de sedes (para alta y para el filtro de la tabla). */
  async function cargarInstituciones() {
    const datos = await api.get('/api/admin/instituciones');
    selectInstitucion.innerHTML = datos.instituciones
      .filter((i) => i.activo)
      .map((i) => `<option value="${i.id_institucion}">${esc(i.nombre)}</option>`)
      .join('');
    return datos.instituciones;
  }

  let instituciones = [];

  async function cargar() {
    instituciones = await cargarInstituciones();
    const datos = await api.get('/api/admin/administradores');
    tbody.innerHTML = datos.administradores
      .map((a) => {
        const sede = instituciones.find((i) => i.id_institucion === a.idInstitucion);
        return `
        <tr>
          <td>${a.id}</td>
          <td>${esc(a.nombre)}</td>
          <td>${esc(a.correo)}</td>
          <td>${esc(a.cargo ?? '—')}</td>
          <td>${esc(a.institucion ?? sede?.nombre ?? '—')}</td>
          <td>${a.activo ? 'Activo' : 'Baja'}</td>
          <td class="acciones">
            <button type="button" data-accion="editar" data-id="${a.id}">Editar</button>
            ${
              a.activo
                ? `<button type="button" class="peligro" data-accion="baja" data-id="${a.id}">Dar de baja</button>`
                : `<button type="button" data-accion="reactivar" data-id="${a.id}">Reactivar</button>`
            }
          </td>
        </tr>`;
      })
      .join('');
  }

  function limpiarFormulario() {
    formulario.reset();
    campoId.value = '';
    campoCorreo.disabled = false; // el correo solo se define en el alta
    boton.textContent = 'Crear administrador';
    botonCancelar.classList.add('oculto');
    grupoPassword.classList.remove('oculto'); // la contraseña solo aplica al alta
    mostrarMensaje(mensaje, '');
  }

  formulario.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    mostrarMensaje(mensaje, '');

    const nombre = document.getElementById('adm-nombre').value.trim();
    const correo = document.getElementById('adm-correo').value.trim();
    const password = document.getElementById('adm-password').value;
    const idInstitucion = Number(selectInstitucion.value);
    const cargo = document.getElementById('adm-cargo').value.trim();

    if (!nombre || !correo || !idInstitucion) {
      return mostrarMensaje(mensaje, 'Nombre, correo e institución son obligatorios.');
    }

    try {
      const esEdicion = Boolean(campoId.value);
      if (esEdicion) {
        await api.put(`/api/admin/administradores/${campoId.value}`, {
          nombre,
          id_institucion: idInstitucion,
          ...(cargo ? { cargo } : {}),
        });
      } else {
        if (!password) return mostrarMensaje(mensaje, 'La contraseña es obligatoria en el alta.');
        await api.post('/api/admin/administradores', {
          nombre,
          correo,
          password,
          id_institucion: idInstitucion,
          cargo: cargo || undefined,
        });
      }
      limpiarFormulario();
      mostrarMensaje(
        mensaje,
        esEdicion ? 'Administrador actualizado.' : 'Administrador creado con rol ADMIN_INSTITUCION.',
        'exito'
      );
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
        const datos = await api.get('/api/admin/administradores');
        const admin = datos.administradores.find((a) => a.id === Number(id));
        if (!admin) return mostrarMensaje(mensaje, 'Administrador no encontrado.');
        campoId.value = admin.id;
        document.getElementById('adm-nombre').value = admin.nombre;
        campoCorreo.value = admin.correo;
        campoCorreo.disabled = true; // el correo no se modifica por edición
        document.getElementById('adm-cargo').value = admin.cargo ?? '';
        selectInstitucion.value = String(admin.idInstitucion);
        grupoPassword.classList.add('oculto'); // no se cambia contraseña aquí
        boton.textContent = 'Guardar cambios';
        botonCancelar.classList.remove('oculto');
        mostrarMensaje(mensaje, `Editando a «${admin.nombre}» (el correo no se modifica).`, 'exito');
        document.getElementById('adm-nombre').focus();
        return;
      }

      if (accion === 'baja') {
        if (!window.confirm('¿Dar de baja a este administrador de sede?')) return;
        await api.enviar('DELETE', `/api/admin/administradores/${id}`);
        mostrarMensaje(mensaje, 'Administrador dado de baja.', 'exito');
      }

      if (accion === 'reactivar') {
        await api.put(`/api/admin/administradores/${id}`, { activo: true });
        mostrarMensaje(mensaje, 'Administrador reactivado.', 'exito');
      }

      await cargar();
    } catch (error) {
      mostrarMensaje(mensaje, error.message);
    }
  });

  document.addEventListener('seccion-activada', (evento) => {
    if (evento.detail === 'administradores') cargar().catch(() => {});
  });

  cargar().catch((error) => mostrarMensaje(mensaje, error.message));
});
