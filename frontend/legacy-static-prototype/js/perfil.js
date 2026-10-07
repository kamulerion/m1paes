'use strict';

/** RF-04 — Consulta y edición del perfil propio (CP-06). */
(async function gestionarPerfil() {
  const mensaje = document.getElementById('mensaje');
  const formulario = document.getElementById('perfil-form');

  const usuario = await exigirSesion(); // sin sesión → redirige al login
  if (!usuario) return;
  pintarPerfil(usuario);

  document.getElementById('salir').addEventListener('click', async (evento) => {
    evento.preventDefault();
    await cerrarSesion();
  });

  formulario.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    mostrarMensaje(mensaje, '');

    const nombre = document.getElementById('nombre').value.trim();
    const correo = document.getElementById('correo').value.trim();
    if (!nombre || !correo) {
      return mostrarMensaje(mensaje, 'El nombre y el correo son obligatorios.');
    }

    try {
      const datos = await api.put('/api/perfil', { nombre, correo });
      pintarPerfil(datos.usuario);
      mostrarMensaje(mensaje, 'Cambios guardados.', 'exito');
    } catch (error) {
      mostrarMensaje(mensaje, error.message);
    }
  });
})();
