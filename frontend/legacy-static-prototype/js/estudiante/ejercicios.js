'use strict';

/**
 * RF-11 — Práctica con retroalimentación inmediata (CP-15/CP-16).
 * El servidor nunca envía la alternativa correcta ni la solución antes de
 * responder: recién el POST devuelve el éxito o la solución paso a paso.
 */
(async function iniciarEjercicios() {
  const usuario = await exigirRol('ESTUDIANTE');
  if (!usuario) return;

  document.getElementById('salir').addEventListener('click', (ev) => {
    ev.preventDefault();
    cerrarSesion();
  });

  const mensaje = document.getElementById('mensaje-global');
  const vistaSeleccion = document.getElementById('vista-seleccion');
  const vistaEjercicio = document.getElementById('vista-ejercicio');
  const selectLeccion = document.getElementById('sel-leccion');
  const lista = document.getElementById('lista-ejercicios');
  const retro = document.getElementById('ej-retro');
  let ejerciciosActuales = [];
  let idEjercicioActual = null;

  function pintarEjercicios() {
    if (ejerciciosActuales.length === 0) {
      lista.innerHTML = '<p>La lección elegida aún no tiene ejercicios publicados.</p>';
      return;
    }
    lista.innerHTML = ejerciciosActuales
      .map(
        (ej) => `
        <ul class="lista-simple">
          <li class="lista-item">
            <span class="texto-item">${esc(ej.enunciado)} <span class="aviso-dev">${esc(ej.dificultad)}</span></span>
            <button type="button" class="boton-mini" data-ejercicio="${ej.id_ejercicio}">Resolver</button>
          </li>
        </ul>`
      )
      .join('');
  }

  async function cargarLecciones() {
    const { ejes } = await api.get('/api/ejes');
    const lecciones = ejes.flatMap((eje) =>
      eje.lecciones.map((l) => ({ ...l, eje: eje.nombre }))
    );
    selectLeccion.innerHTML = lecciones
      .map((l) => `<option value="${l.id}">${esc(l.eje)} — ${esc(l.titulo)}</option>`)
      .join('');
    if (lecciones.length === 0) {
      lista.innerHTML = '<p>Todavía no hay lecciones publicadas.</p>';
      return;
    }
    await cargarEjercicios();
  }

  async function cargarEjercicios() {
    const idLeccion = Number(selectLeccion.value);
    if (!idLeccion) return;
    const datos = await api.get(`/api/contenido/lecciones/${idLeccion}`);
    ejerciciosActuales = datos.ejercicios;
    pintarEjercicios();
  }

  async function abrirEjercicio(id) {
    const { ejercicio } = await api.get(`/api/practica/ejercicios/${id}`);
    idEjercicioActual = ejercicio.id_ejercicio;
    document.getElementById('ej-enunciado').textContent = ejercicio.enunciado;
    document.getElementById('ej-dificultad').textContent = `Dificultad: ${ejercicio.dificultad}`;
    document.getElementById('ej-alternativas').innerHTML = ejercicio.alternativas
      .map(
        (alt) => `
        <label class="alternativa">
          <input type="radio" name="alternativa" value="${alt.id_alternativa}">
          <span>${esc(alt.texto)}</span>
        </label>`
      )
      .join('');
    mostrarMensaje(retro, '');
    document.getElementById('ej-progreso').classList.add('oculto');
    document.getElementById('ej-responder').disabled = false;
    vistaSeleccion.classList.add('oculto');
    vistaEjercicio.classList.remove('oculto');
    window.scrollTo(0, 0);
  }

  document.getElementById('form-seleccion').addEventListener('submit', (ev) => ev.preventDefault());
  selectLeccion.addEventListener('change', () =>
    cargarEjercicios().catch((error) => mostrarMensaje(mensaje, error.message))
  );

  lista.addEventListener('click', (ev) => {
    const boton = ev.target.closest('[data-ejercicio]');
    if (!boton) return;
    abrirEjercicio(Number(boton.dataset.ejercicio)).catch((error) =>
      mostrarMensaje(mensaje, error.message)
    );
  });

  document.getElementById('volver').addEventListener('click', () => {
    vistaEjercicio.classList.add('oculto');
    vistaSeleccion.classList.remove('oculto');
  });

  document.getElementById('form-ejercicio').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const elegida = document.querySelector('input[name="alternativa"]:checked');
    if (!elegida) {
      mostrarMensaje(retro, 'Selecciona una alternativa antes de responder.');
      return;
    }
    try {
      const res = await api.post(`/api/practica/ejercicios/${idEjercicioActual}/respuesta`, {
        id_alternativa: Number(elegida.value),
      });
      // CP-15: éxito · CP-16: solución paso a paso junto a la correcta.
      const texto = res.esCorrecta
        ? `${res.mensaje} ${res.explicacion}`
        : `${res.mensaje} Solución paso a paso: ${res.explicacion}` +
          (res.alternativaCorrecta ? ` — Respuesta correcta: ${res.alternativaCorrecta.texto}.` : '');
      mostrarMensaje(retro, texto, res.esCorrecta ? 'exito' : 'error');
      document.getElementById('ej-responder').disabled = true;

      document.getElementById('ej-progreso-valor').textContent = `${res.progreso.porcentaje} %`;
      document.getElementById('ej-progreso-barra').style.width = `${res.progreso.porcentaje}%`;
      document.getElementById('ej-progreso').classList.remove('oculto');
    } catch (error) {
      mostrarMensaje(retro, error.message);
    }
  });

  try {
    await cargarLecciones();
    // Enlace directo desde la lección (?ejercicio=ID).
    const idDirecto = Number(new URLSearchParams(window.location.search).get('ejercicio'));
    if (idDirecto) await abrirEjercicio(idDirecto);
  } catch (error) {
    mostrarMensaje(mensaje, `No fue posible cargar los ejercicios: ${error.message}`);
  }
})();
