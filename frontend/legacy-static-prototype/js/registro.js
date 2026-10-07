'use strict';

/** RF-01 — Autoregistro del Estudiante Free (CP-01). */
(async function registrar() {
  const formulario = document.getElementById('registro-form');
  const mensaje = document.getElementById('mensaje');

  formulario.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    mostrarMensaje(mensaje, '');

    const nombre = document.getElementById('nombre').value.trim();
    const correo = document.getElementById('correo').value.trim();
    const password = document.getElementById('password').value;
    const repetir = document.getElementById('password2').value;

    if (!nombre || !correo || !password) {
      return mostrarMensaje(mensaje, 'Completa todos los campos.');
    }
    if (password !== repetir) {
      return mostrarMensaje(mensaje, 'Las contraseñas no coinciden.');
    }
    if (password.length < 8) {
      return mostrarMensaje(mensaje, 'La contraseña debe tener al menos 8 caracteres.');
    }

    try {
      await api.post('/api/auth/registro', { nombre, correo, password });
      // CP-01: la cuenta creada redirige al login (no inicia sesión sola).
      window.location.href = '/login.html?creada=1';
    } catch (error) {
      mostrarMensaje(mensaje, error.message);
    }
  });
})();
