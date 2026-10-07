'use strict';

/** RF-02 — Inicio de sesión (CP-02, CP-03). */
(async function iniciarSesion() {
  const formulario = document.getElementById('login-form');
  const mensaje = document.getElementById('mensaje');

  // Aviso de cuenta creada (flujo CP-01) o contraseña restablecida (CP-05).
  const parametros = new URLSearchParams(window.location.search);
  const aviso = document.getElementById('aviso-creada');
  if (parametros.has('creada')) {
    aviso.hidden = false;
    aviso.textContent = 'Cuenta creada. Inicia sesión para continuar.';
  } else if (parametros.has('restablecida')) {
    aviso.hidden = false;
    aviso.textContent = 'Contraseña actualizada. Inicia sesión con tu nueva contraseña.';
  }

  formulario.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    mostrarMensaje(mensaje, '');

    const correo = document.getElementById('correo').value.trim();
    const password = document.getElementById('password').value;
    if (!correo || !password) {
      return mostrarMensaje(mensaje, 'Ingresa tu correo y tu contraseña.');
    }

    try {
      const datos = await api.post('/api/auth/login', { correo, password });
      // CP-02: al iniciar se entra al panel del rol. En la Fase 1 todos los
      // roles ven su perfil; los paneles específicos llegan en las fases 2-4.
      const destino = parametros.get('redirigir') || '/perfil.html';
      window.location.href = decodeURIComponent(destino) || '/perfil.html';
      void datos;
    } catch (error) {
      // CP-03: el servidor responde genérico; aquí solo se muestra tal cual.
      mostrarMensaje(mensaje, error.message);
    }
  });
})();
