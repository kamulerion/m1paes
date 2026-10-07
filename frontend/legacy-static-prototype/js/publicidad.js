'use strict';

/**
 * RF-15 — Publicidad formativa para cuentas Free (CP-21).
 * Solo las páginas del estudiante incluyen este script: el servidor decide la
 * segmentación (GET /api/publicidad devuelve [] a cuentas INSTITUCIONAL) y la
 * interfaz B2B (admin.html / institucion.html) ni siquiera lo carga. Sin
 * sesión, sin anuncios o si la llamada falla, el contenedor permanece oculto
 * y la experiencia de estudio sigue intacta.
 */
async function cargarPublicidad() {
  const contenedor = document.getElementById('publicidad');
  if (!contenedor) return;
  try {
    const usuario = await obtenerSesion();
    if (!usuario) return;

    const { anuncios } = await api.get('/api/publicidad');
    if (!Array.isArray(anuncios) || anuncios.length === 0) return;

    // Rotación simple por visita (catálogo local, sin red publicitaria).
    const anuncio = anuncios[Math.floor(Math.random() * anuncios.length)];
    contenedor.innerHTML = `
      <span class="etiqueta">Publicidad</span>
      <strong>${esc(anuncio.institucion)}</strong>
      <span class="anuncio-titulo">${esc(anuncio.titulo)}</span>
      <span class="anuncio-texto">${esc(anuncio.texto)}</span>`;
    contenedor.classList.remove('oculto');
  } catch {
    // El anuncio es opcional: nunca interrumpe la navegación.
  }
}

cargarPublicidad();
