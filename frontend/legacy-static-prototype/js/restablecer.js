'use strict';

/** RF-03 — Cambio de contraseña con token temporal (CP-05, paso 2). */
(async function restablecerContrasena() {
  const formulario = document.getElementById('restablecer-form');
  const mensaje = document.getElementById('mensaje');
  const token = new URLSearchParams(window.location.search).get('token') || '';

  document.getElementById('token').value = token;

  if (!token) {
    mostrarMensaje(mensaje, 'El enlace no incluye un token válido. Solicita uno nuevo.');
    formulario.querySelector('button').disabled = true;
  }

  formulario.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    mostrarMensaje(mensaje, '');

    const password = document.getElementById('password').value;
    const repetir = document.getElementById('password2').value;

    if (password.length < 8) {
      return mostrarMensaje(mensaje, 'La contraseña debe tener al menos 8 caracteres.');
    }
    if (password !== repetir) {
      return mostrarMensaje(mensaje, 'Las contraseñas no coinciden.');
    }

    try {
      await api.post('/api/auth/restablecer', { token, password });
      window.location.href = '/login.html?restablecida=1';
    } catch (error) {
      mostrarMensaje(mensaje, error.message);
    }
  });
})();
