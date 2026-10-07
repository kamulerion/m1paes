'use strict';

/** RF-03 — Solicitud de recuperación de contraseña (CP-05, paso 1). */
(async function solicitarRecuperacion() {
  const formulario = document.getElementById('recuperar-form');
  const mensaje = document.getElementById('mensaje');

  formulario.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    mostrarMensaje(mensaje, '');

    const correo = document.getElementById('correo').value.trim();
    if (!correo) return mostrarMensaje(mensaje, 'Ingresa tu correo electrónico.');

    try {
      const datos = await api.post('/api/auth/recuperar', { correo });
      mostrarMensaje(
        mensaje,
        'Si el correo está registrado, recibirás instrucciones para restablecer tu contraseña.',
        'exito'
      );
      // Solo en desarrollo la API devuelve el token (ADR-003): permite
      // continuar sin servidor de correo. En producción esto queda oculto.
      if (datos.token) {
        document.getElementById('enlace-restablecer').href =
          `/restablecer.html?token=${encodeURIComponent(datos.token)}`;
        document.getElementById('enlace-dev').hidden = false;
      }
    } catch (error) {
      mostrarMensaje(mensaje, error.message);
    }
  });
})();
