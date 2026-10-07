'use strict';

/**
 * RF-18 — Exploración de ejes y lecciones (CP-14).
 * Muestra los 4 ejes oficiales con sus lecciones publicadas y abre el
 * detalle de cada lección (teoría completa + ejercicios de práctica).
 */
(async function iniciarContenido() {
  const usuario = await exigirRol('ESTUDIANTE');
  if (!usuario) return;

  document.getElementById('salir').addEventListener('click', (ev) => {
    ev.preventDefault();
    cerrarSesion();
  });

  const contenedor = document.getElementById('ejes');
  const vistaEjes = document.getElementById('vista-ejes');
  const vistaLeccion = document.getElementById('vista-leccion');
  const mensaje = document.getElementById('mensaje-global');
  let ejes = [];

  async function cargarEjes() {
    const datos = await api.get('/api/ejes');
    ejes = datos.ejes;
    contenedor.innerHTML = ejes
      .map(
        (eje) => `
        <article class="tarjeta-eje">
          <h2>${esc(eje.nombre)}</h2>
          <p>${esc(eje.descripcion)}</p>
          <ul>
            ${
              eje.lecciones.length > 0
                ? eje.lecciones
                    .map(
                      (l) =>
                        `<li><a href="#" data-leccion="${l.id}" data-eje="${esc(eje.nombre)}">${esc(l.titulo)}</a></li>`
                    )
                    .join('')
                : '<li class="aviso-dev">Sin lecciones publicadas.</li>'
            }
          </ul>
        </article>`
      )
      .join('');
  }

  async function abrirLeccion(id, nombreEje) {
    const { leccion, ejercicios } = await api.get(`/api/contenido/lecciones/${id}`);
    document.getElementById('lec-titulo').textContent = leccion.titulo;
    document.getElementById('lec-eje').textContent = nombreEje;
    document.getElementById('lec-cuerpo').textContent = leccion.cuerpo_teoria;

    const video = document.getElementById('lec-video');
    if (leccion.url_video) {
      document.getElementById('lec-video-enlace').href = leccion.url_video;
      video.classList.remove('oculto');
    } else {
      video.classList.add('oculto');
    }

    const lista = document.getElementById('lec-ejercicios');
    lista.innerHTML = ejercicios
      .map(
        (ej) => `
        <li class="lista-item">
          <span class="texto-item">${esc(ej.enunciado)} <span class="aviso-dev">${esc(ej.dificultad)}</span></span>
          <a class="boton-mini" href="/ejercicios.html?ejercicio=${ej.id_ejercicio}">Practicar</a>
        </li>`
      )
      .join('');
    document.getElementById('lec-sin-ejercicios').classList.toggle('oculto', ejercicios.length > 0);

    vistaEjes.classList.add('oculto');
    vistaLeccion.classList.remove('oculto');
    window.scrollTo(0, 0);
  }

  document.getElementById('ejes').addEventListener('click', (ev) => {
    const enlace = ev.target.closest('[data-leccion]');
    if (!enlace) return;
    ev.preventDefault();
    abrirLeccion(Number(enlace.dataset.leccion), enlace.dataset.eje).catch((error) =>
      mostrarMensaje(mensaje, error.message)
    );
  });

  document.getElementById('volver').addEventListener('click', () => {
    vistaLeccion.classList.add('oculto');
    vistaEjes.classList.remove('oculto');
  });

  try {
    await cargarEjes();
  } catch (error) {
    mostrarMensaje(mensaje, `No fue posible cargar los contenidos: ${error.message}`);
  }
})();
