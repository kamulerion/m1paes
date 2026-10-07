'use strict';

/**
 * RF-09 — Banco de ejercicios con solución (CP-12).
 * El formulario garantiza la regla del informe en UI: entre 4 y 5
 * alternativas y exactamente una marcada como correcta (el backend la
 * valida igualmente).
 */
panelListo.then((listo) => {
  if (!listo) return;

  const mensaje = document.getElementById('ejr-mensaje');
  const formulario = document.getElementById('form-ejercicio');
  const campoId = document.getElementById('ejr-id');
  const boton = document.getElementById('ejr-boton');
  const botonCancelar = document.getElementById('ejr-cancelar');
  const contenedor = document.getElementById('ejr-alternativas');
  const botonAgregar = document.getElementById('ejr-agregar');
  const selectContenido = document.getElementById('ejr-contenido');
  const tbody = document.querySelector('#tabla-ejercicios tbody');

  let lecciones = [];
  let ejercicios = [];

  async function cargarLecciones() {
    const datos = await api.get('/api/admin/lecciones');
    lecciones = datos.lecciones;
    const seleccionado = selectContenido.value;
    selectContenido.innerHTML = lecciones
      .map((l) => `<option value="${l.id_contenido}">${esc(l.eje)} · ${esc(l.titulo)}</option>`)
      .join('');
    if (seleccionado) selectContenido.value = seleccionado;
  }

  async function cargar() {
    const datos = await api.get('/api/admin/ejercicios');
    ejercicios = datos.ejercicios;
    tbody.innerHTML = ejercicios
      .map(
        (e) => `
        <tr>
          <td>${e.id_ejercicio}</td>
          <td>${esc(e.contenido)}</td>
          <td class="texto-largo">${esc(e.enunciado)}</td>
          <td>${esc(e.dificultad)}</td>
          <td>${e.alternativas}</td>
          <td class="acciones">
            <button type="button" data-accion="editar" data-id="${e.id_ejercicio}">Editar</button>
          </td>
        </tr>`
      )
      .join('');
  }

  // --- Alternativas dinámicas (4 a 5) ---

  function filas() {
    return Array.from(contenedor.querySelectorAll('.alternativa'));
  }

  function pintarAlternativas(alternativas) {
    contenedor.innerHTML = alternativas
      .map(
        (a, i) => `
        <div class="alternativa">
          <input type="radio" name="correcta" id="alt-ok-${i}" ${a.es_correcta ? 'checked' : ''}
                 aria-label="Marcar alternativa ${i + 1} como correcta">
          <input type="text" maxlength="500" value="${esc(a.texto)}" placeholder="Alternativa ${i + 1}"
                 aria-label="Texto de la alternativa ${i + 1}">
          <button type="button" class="quitar" aria-label="Quitar alternativa ${i + 1}">✕</button>
        </div>`
      )
      .join('');
    botonAgregar.classList.toggle('oculto', filas().length >= 5);
    filas().forEach((fila, i) => {
      fila.querySelector('.quitar').classList.toggle('oculto', filas().length <= 4);
      // Reasignar ids/labels tras cada repintado.
      fila.querySelector('input[type="radio"]').id = `alt-ok-${i}`;
    });
  }

  function leerAlternativas() {
    return filas().map((fila) => ({
      texto: fila.querySelector('input[type="text"]').value.trim(),
      es_correcta: fila.querySelector('input[type="radio"]').checked,
    }));
  }

  function limpiarFormulario() {
    formulario.reset();
    campoId.value = '';
    document.getElementById('ejr-dificultad').value = 'MEDIA';
    boton.textContent = 'Crear ejercicio';
    botonCancelar.classList.add('oculto');
    pintarAlternativas([
      { texto: '', es_correcta: true },
      { texto: '', es_correcta: false },
      { texto: '', es_correcta: false },
      { texto: '', es_correcta: false },
    ]);
    mostrarMensaje(mensaje, '');
  }

  botonAgregar.addEventListener('click', () => {
    const actuales = leerAlternativas();
    if (actuales.length >= 5) return;
    actuales.push({ texto: '', es_correcta: false });
    pintarAlternativas(actuales);
  });

  contenedor.addEventListener('click', (evento) => {
    const quitar = evento.target.closest('.quitar');
    if (!quitar) return;
    const actuales = leerAlternativas();
    if (actuales.length <= 4) return;
    const indice = filas().indexOf(quitar.closest('.alternativa'));
    actuales.splice(indice, 1);
    // Si se eliminó la correcta, la primera pasa a serlo (la UI nunca
    // permite 0 correctas; el backend exige exactamente una).
    if (!actuales.some((a) => a.es_correcta)) actuales[0].es_correcta = true;
    pintarAlternativas(actuales);
  });

  formulario.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    mostrarMensaje(mensaje, '');

    const alternativas = leerAlternativas();
    const correctas = alternativas.filter((a) => a.es_correcta).length;
    if (alternativas.length < 4 || alternativas.length > 5) {
      return mostrarMensaje(mensaje, 'El ejercicio debe tener entre 4 y 5 alternativas.');
    }
    if (correctas !== 1) return mostrarMensaje(mensaje, 'Marca exactamente una alternativa como correcta.');
    if (alternativas.some((a) => !a.texto)) return mostrarMensaje(mensaje, 'Todas las alternativas deben tener texto.');

    const cuerpo = {
      id_contenido: Number(selectContenido.value),
      enunciado: document.getElementById('ejr-enunciado').value.trim(),
      explicacion_solucion: document.getElementById('ejr-explicacion').value.trim(),
      dificultad: document.getElementById('ejr-dificultad').value,
      alternativas,
    };
    if (!cuerpo.enunciado || !cuerpo.explicacion_solucion) {
      return mostrarMensaje(mensaje, 'Enunciado y explicación son obligatorios.');
    }

    try {
      const esEdicion = Boolean(campoId.value);
      if (esEdicion) {
        const edicion = { ...cuerpo };
        delete edicion.id_contenido; // la lección no se cambia por edición
        await api.put(`/api/admin/ejercicios/${campoId.value}`, edicion);
      } else {
        await api.post('/api/admin/ejercicios', cuerpo);
      }
      limpiarFormulario();
      mostrarMensaje(
        mensaje,
        esEdicion ? 'Ejercicio actualizado.' : 'Ejercicio creado con su solución.',
        'exito'
      );
      await cargar();
    } catch (error) {
      mostrarMensaje(mensaje, error.message);
    }
  });

  botonCancelar.addEventListener('click', limpiarFormulario);

  tbody.addEventListener('click', async (evento) => {
    const botonFila = evento.target.closest('button[data-accion="editar"]');
    if (!botonFila) return;
    try {
      const datos = await api.get(`/api/admin/ejercicios/${botonFila.dataset.id}`);
      const ejercicio = datos.ejercicio;
      campoId.value = ejercicio.id_ejercicio;
      selectContenido.value = String(ejercicio.id_contenido);
      document.getElementById('ejr-enunciado').value = ejercicio.enunciado;
      document.getElementById('ejr-explicacion').value = ejercicio.explicacion_solucion;
      document.getElementById('ejr-dificultad').value = ejercicio.dificultad;
      pintarAlternativas(ejercicio.alternativas);
      boton.textContent = 'Guardar cambios';
      botonCancelar.classList.remove('oculto');
      mostrarMensaje(mensaje, `Editando el ejercicio #${ejercicio.id_ejercicio}.`, 'exito');
      document.getElementById('ejr-enunciado').focus();
    } catch (error) {
      mostrarMensaje(mensaje, error.message);
    }
  });

  document.addEventListener('seccion-activada', (evento) => {
    if (evento.detail !== 'ejercicios') return;
    Promise.all([cargarLecciones(), cargar()]).catch(() => {});
  });

  limpiarFormulario();
  Promise.all([cargarLecciones(), cargar()]).catch((error) => mostrarMensaje(mensaje, error.message));
});
