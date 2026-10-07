'use strict';

/**
 * RF-08 — Estructuración y publicación de ejes y lecciones (CP-11).
 * Crear una lección equivale a publicarla (fecha_publicacion con DEFAULT):
 * queda visible para los estudiantes en GET /api/ejes.
 */
panelListo.then((listo) => {
  if (!listo) return;

  // --- Ejes temáticos ---
  const msgEje = document.getElementById('eje-mensaje');
  const formEje = document.getElementById('form-eje');
  const ejeId = document.getElementById('eje-id');
  const botonEje = document.getElementById('eje-boton');
  const cancelarEje = document.getElementById('eje-cancelar');
  const tbodyEjes = document.querySelector('#tabla-ejes tbody');
  const selectEje = document.getElementById('lec-eje');

  let ejes = [];

  async function cargarEjes() {
    const datos = await api.get('/api/admin/ejes');
    ejes = datos.ejes;
    tbodyEjes.innerHTML = ejes
      .map(
        (e) => `
        <tr>
          <td>${e.id_eje}</td>
          <td>${esc(e.nombre)}</td>
          <td class="texto-largo">${esc(e.descripcion)}</td>
          <td>${e.lecciones}</td>
          <td class="acciones">
            <button type="button" data-accion="editar" data-id="${e.id_eje}">Editar</button>
          </td>
        </tr>`
      )
      .join('');

    // El select de lecciones toma el eje seleccionado (si sigue existiendo).
    const seleccionado = selectEje.value;
    selectEje.innerHTML = ejes
      .map((e) => `<option value="${e.id_eje}">${esc(e.nombre)}</option>`)
      .join('');
    if (seleccionado) selectEje.value = seleccionado;
  }

  function limpiarEje() {
    formEje.reset();
    ejeId.value = '';
    botonEje.textContent = 'Crear eje';
    cancelarEje.classList.add('oculto');
    mostrarMensaje(msgEje, '');
  }

  formEje.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    mostrarMensaje(msgEje, '');
    const nombre = document.getElementById('eje-nombre').value.trim();
    const descripcion = document.getElementById('eje-descripcion').value.trim();
    if (!nombre || !descripcion) return mostrarMensaje(msgEje, 'Nombre y descripción son obligatorios.');

    try {
      const esEdicion = Boolean(ejeId.value);
      if (esEdicion) {
        await api.put(`/api/admin/ejes/${ejeId.value}`, { nombre, descripcion });
      } else {
        await api.post('/api/admin/ejes', { nombre, descripcion });
      }
      limpiarEje();
      mostrarMensaje(msgEje, esEdicion ? 'Eje actualizado.' : 'Eje creado.', 'exito');
      await cargarEjes();
    } catch (error) {
      mostrarMensaje(msgEje, error.message);
    }
  });

  cancelarEje.addEventListener('click', limpiarEje);

  tbodyEjes.addEventListener('click', (evento) => {
    const botonFila = evento.target.closest('button[data-accion="editar"]');
    if (!botonFila) return;
    const eje = ejes.find((e) => e.id_eje === Number(botonFila.dataset.id));
    if (!eje) return;
    ejeId.value = eje.id_eje;
    document.getElementById('eje-nombre').value = eje.nombre;
    document.getElementById('eje-descripcion').value = eje.descripcion;
    botonEje.textContent = 'Guardar cambios';
    cancelarEje.classList.remove('oculto');
    mostrarMensaje(msgEje, `Editando «${eje.nombre}».`, 'exito');
    document.getElementById('eje-nombre').focus();
  });

  // --- Lecciones ---
  const msgLeccion = document.getElementById('lec-mensaje');
  const formLeccion = document.getElementById('form-leccion');
  const lecId = document.getElementById('lec-id');
  const botonLeccion = document.getElementById('lec-boton');
  const cancelarLeccion = document.getElementById('lec-cancelar');
  const tbodyLecciones = document.querySelector('#tabla-lecciones tbody');

  let lecciones = [];

  async function cargarLecciones() {
    const datos = await api.get('/api/admin/lecciones');
    lecciones = datos.lecciones;
    tbodyLecciones.innerHTML = lecciones
      .map(
        (l) => `
        <tr>
          <td>${l.id_contenido}</td>
          <td>${esc(l.eje)}</td>
          <td class="texto-largo">${esc(l.titulo)}</td>
          <td>${l.orden}</td>
          <td>${fechaCorta(l.fecha_publicacion)}</td>
          <td class="acciones">
            <button type="button" data-accion="editar" data-id="${l.id_contenido}">Editar</button>
          </td>
        </tr>`
      )
      .join('');
  }

  function limpiarLeccion() {
    formLeccion.reset();
    lecId.value = '';
    document.getElementById('lec-orden').value = '1';
    botonLeccion.textContent = 'Publicar lección';
    cancelarLeccion.classList.add('oculto');
    mostrarMensaje(msgLeccion, '');
  }

  formLeccion.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    mostrarMensaje(msgLeccion, '');
    const cuerpo = {
      id_eje: Number(selectEje.value),
      titulo: document.getElementById('lec-titulo').value.trim(),
      cuerpo_teoria: document.getElementById('lec-cuerpo').value.trim(),
      url_video: document.getElementById('lec-video').value.trim() || null,
      orden: Number(document.getElementById('lec-orden').value),
    };
    if (!cuerpo.titulo || !cuerpo.cuerpo_teoria) {
      return mostrarMensaje(msgLeccion, 'Título y cuerpo de la teoría son obligatorios.');
    }

    try {
      const esEdicion = Boolean(lecId.value);
      if (esEdicion) {
        await api.put(`/api/admin/lecciones/${lecId.value}`, cuerpo);
      } else {
        await api.post('/api/admin/lecciones', cuerpo);
      }
      limpiarLeccion();
      mostrarMensaje(
        msgLeccion,
        esEdicion ? 'Lección actualizada.' : 'Lección publicada: ya está disponible para los estudiantes.',
        'exito'
      );
      await cargarLecciones();
    } catch (error) {
      mostrarMensaje(msgLeccion, error.message);
    }
  });

  cancelarLeccion.addEventListener('click', limpiarLeccion);

  tbodyLecciones.addEventListener('click', (evento) => {
    const botonFila = evento.target.closest('button[data-accion="editar"]');
    if (!botonFila) return;
    const leccion = lecciones.find((l) => l.id_contenido === Number(botonFila.dataset.id));
    if (!leccion) return;
    lecId.value = leccion.id_contenido;
    selectEje.value = String(leccion.id_eje);
    document.getElementById('lec-titulo').value = leccion.titulo;
    document.getElementById('lec-cuerpo').value = leccion.cuerpo_teoria;
    document.getElementById('lec-video').value = leccion.url_video ?? '';
    document.getElementById('lec-orden').value = String(leccion.orden);
    botonLeccion.textContent = 'Guardar cambios';
    cancelarLeccion.classList.remove('oculto');
    mostrarMensaje(msgLeccion, `Editando «${leccion.titulo}».`, 'exito');
    document.getElementById('lec-titulo').focus();
  });

  document.addEventListener('seccion-activada', (evento) => {
    if (evento.detail !== 'contenido') return;
    Promise.all([cargarEjes(), cargarLecciones()]).catch(() => {});
  });

  Promise.all([cargarEjes(), cargarLecciones()])
    .catch((error) => mostrarMensaje(msgEje, error.message));
});
