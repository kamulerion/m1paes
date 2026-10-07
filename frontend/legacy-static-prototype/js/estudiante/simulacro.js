'use strict';

/**
 * RF-12 — Simulacros cronometrados (CP-17).
 * Ciclo: lista → intentar (preguntas sin solución) → responder mientras
 * corre el cronómetro → finalizar (puntaje 100–1000 + tiempo) → revisión.
 */
(async function iniciarSimulacro() {
  const usuario = await exigirRol('ESTUDIANTE');
  if (!usuario) return;

  document.getElementById('salir').addEventListener('click', (ev) => {
    ev.preventDefault();
    cerrarSesion();
  });

  const mensaje = document.getElementById('mensaje-global');
  const vistaLista = document.getElementById('vista-lista');
  const vistaRinden = document.getElementById('vista-rinden');
  const vistaResultado = document.getElementById('vista-resultado');
  const avisoGuardado = document.getElementById('pregunta-guardada');

  let estado = null; // { idIntento, preguntas, actual, tiempoLimite, inicio, respuestas, cola }

  function mostrarVista(vista) {
    for (const v of [vistaLista, vistaRinden, vistaResultado]) v.classList.add('oculto');
    vista.classList.remove('oculto');
    window.scrollTo(0, 0);
  }

  async function cargarLista() {
    const { simulacros } = await api.get('/api/simulacros');
    document.querySelector('#tabla-simulacros tbody').innerHTML = simulacros
      .map(
        (s) => `
        <tr>
          <td>${esc(s.nombre)}</td>
          <td>${s.cantidad_preguntas}</td>
          <td>${s.preguntas}</td>
          <td>${s.tiempo_limite_minutos} min</td>
          <td class="acciones">
            ${
              s.preguntas > 0
                ? `<button type="button" data-rendir="${s.id_simulacro}">Rendir</button>`
                : '<span class="aviso-dev">Sin preguntas compuestas</span>'
            }
          </td>
        </tr>`
      )
      .join('');
    mostrarVista(vistaLista);
  }

  function reloj() {
    if (!estado) return;
    const transcurridos = Math.floor((Date.now() - estado.inicio) / 1000);
    const restantes = estado.tiempoLimite * 60 - transcurridos;
    const elTiempo = document.getElementById('sim-tiempo');
    if (restantes <= 0) {
      document.getElementById('cronometro').classList.add('peligro');
      finalizar('Se acabó el tiempo asignado.');
      return;
    }
    const min = String(Math.floor(restantes / 60)).padStart(2, '0');
    const seg = String(restantes % 60).padStart(2, '0');
    elTiempo.textContent = `${min}:${seg}`;
    if (restantes <= 300) document.getElementById('cronometro').classList.add('peligro');
  }

  function pintarPregunta() {
    const pregunta = estado.preguntas[estado.actual];
    document.getElementById('pregunta-numero').textContent =
      `Pregunta ${pregunta.numero} de ${estado.preguntas.length}`;
    document.getElementById('pregunta-enunciado').textContent = pregunta.enunciado;
    document.getElementById('pregunta-alternativas').innerHTML = pregunta.alternativas
      .map(
        (alt) => `
        <label class="alternativa">
          <input type="radio" name="alternativa" value="${alt.id}"
            ${estado.respuestas.get(pregunta.idEjercicio) === alt.id ? 'checked' : ''}>
          <span>${esc(alt.texto)}</span>
        </label>`
      )
      .join('');
    document.getElementById('btn-anterior').disabled = estado.actual === 0;
    document.getElementById('btn-siguiente').disabled =
      estado.actual === estado.preguntas.length - 1;
    mostrarMensaje(avisoGuardado, '');
  }

  async function rendir(idSimulacro) {
    const datos = await api.post(`/api/simulacros/${idSimulacro}/intentar`);
    estado = {
      idIntento: datos.intento.id,
      preguntas: datos.preguntas,
      actual: 0,
      tiempoLimite: datos.simulacro.tiempoLimiteMinutos,
      inicio: Date.now(),
      respuestas: new Map(),
      cola: Promise.resolve(),
    };
    document.getElementById('sim-nombre').textContent = datos.simulacro.nombre;
    document.getElementById('cronometro').classList.remove('peligro');
    document.getElementById('sim-tiempo').textContent = `${estado.tiempoLimite}:00`;
    pintarPregunta();
    mostrarVista(vistaRinden);
    reloj();
    if (estado.temporizador) clearInterval(estado.temporizador);
    estado.temporizador = setInterval(reloj, 1000);
  }

  async function finalizar(aviso) {
    if (!estado) return;
    clearInterval(estado.temporizador);
    const transcurridos = Math.floor((Date.now() - estado.inicio) / 60000);
    const duracion = Math.min(estado.tiempoLimite, Math.max(0, transcurridos));
    try {
      await estado.cola.catch(() => {}); // que no se pierda ninguna respuesta
      const datos = await api.post(`/api/simulacros/intentos/${estado.idIntento}/finalizar`, {
        duracion_minutos: duracion,
      });
      pintarResultado(datos.resultado, datos.detalle);
      mostrarMensaje(mensaje, aviso || '', aviso ? 'exito' : '');
      estado = null;
    } catch (error) {
      mostrarMensaje(mensaje, `No fue posible finalizar: ${error.message}`);
      mostrarVista(vistaLista);
      estado = null;
    }
  }

  function pintarResultado(resultado, detalle) {
    document.getElementById('res-puntaje').textContent = resultado.puntaje;
    document.getElementById('res-cifras').innerHTML = `
      <div class="cifra"><strong>${resultado.correctas}/${resultado.total}</strong>aciertos</div>
      <div class="cifra"><strong>${resultado.respondidas}</strong>respondidas</div>
      <div class="cifra"><strong>${resultado.duracionMinutos}</strong>minutos</div>`;
    document.getElementById('res-detalle').innerHTML = detalle
      .map((d) => {
        const clase = d.esCorrecta === null ? 'blanco' : d.esCorrecta ? 'ok' : 'mal';
        const marca = d.esCorrecta === null ? '—' : d.esCorrecta ? '✓' : '✗';
        return `<li class="${clase}"><span class="marca">${marca}</span> Pregunta ${d.numero}</li>`;
      })
      .join('');
    mostrarVista(vistaResultado);
  }

  document.getElementById('tabla-simulacros').addEventListener('click', (ev) => {
    const boton = ev.target.closest('[data-rendir]');
    if (!boton) return;
    mostrarMensaje(mensaje, '');
    rendir(Number(boton.dataset.rendir)).catch((error) =>
      mostrarMensaje(mensaje, error.message)
    );
  });

  document.getElementById('pregunta-alternativas').addEventListener('change', (ev) => {
    if (!estado || ev.target.name !== 'alternativa') return;
    const pregunta = estado.preguntas[estado.actual];
    const idAlternativa = Number(ev.target.value);
    estado.respuestas.set(pregunta.idEjercicio, idAlternativa);
    mostrarMensaje(avisoGuardado, 'Respuesta guardada ✓', 'exito');
    // La confirmación se encadena para no perder respuestas al finalizar.
    estado.cola = estado.cola.then(() =>
      api
        .put(`/api/simulacros/intentos/${estado.idIntento}/respuestas`, {
          id_ejercicio: pregunta.idEjercicio,
          id_alternativa: idAlternativa,
        })
        .catch((error) => mostrarMensaje(avisoGuardado, error.message))
    );
  });

  document.getElementById('btn-anterior').addEventListener('click', () => {
    if (estado.actual > 0) {
      estado.actual -= 1;
      pintarPregunta();
    }
  });

  document.getElementById('btn-siguiente').addEventListener('click', () => {
    if (estado.actual < estado.preguntas.length - 1) {
      estado.actual += 1;
      pintarPregunta();
    }
  });

  document.getElementById('btn-finalizar').addEventListener('click', () => finalizar());
  document.getElementById('res-volver').addEventListener('click', () =>
    cargarLista().catch((error) => mostrarMensaje(mensaje, error.message))
  );

  try {
    await cargarLista();
  } catch (error) {
    mostrarMensaje(mensaje, `No fue posible cargar los simulacros: ${error.message}`);
  }
})();
