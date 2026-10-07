'use strict';

/* exported obtenerSesion, exigirSesion, exigirRol, cerrarSesion, pintarPerfil */

/**
 * Utilidades de sesión para las páginas (RF-02, ADR-003).
 * La cookie de sesión es httpOnly: desde el navegador solo se consulta
 * el estado real con GET /api/auth/sesion.
 */

/** Devuelve el usuario autenticado o null si no hay sesión. */
async function obtenerSesion() {
  try {
    const datos = await api.get('/api/auth/sesion');
    return datos.usuario;
  } catch (error) {
    if (error.status === 401) return null;
    throw error;
  }
}

/** Protege una página: sin sesión redirige al login conservando el destino. */
async function exigirSesion() {
  const usuario = await obtenerSesion();
  if (!usuario) {
    const destino = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.href = `/login.html?redirigir=${destino}`;
    return null;
  }
  return usuario;
}

/** Protege una página por rol: sin sesión → login; con otro rol → inicio. */
async function exigirRol(rol) {
  const usuario = await exigirSesion();
  if (!usuario) return null;
  if (usuario.rol !== rol) {
    window.location.href = '/';
    return null;
  }
  return usuario;
}

/** Cierra la sesión (POST logout) y vuelve al inicio. */
async function cerrarSesion() {
  await api.post('/api/auth/logout');
  window.location.href = '/';
}

/** Rellena el formulario del perfil con los datos del usuario. */
function pintarPerfil(usuario, raiz = document) {
  const poner = (id, valor) => {
    const el = raiz.getElementById(id);
    if (el) el.textContent = valor ?? '—';
  };
  poner('dato-nombre', usuario.nombre);
  poner('dato-correo', usuario.correo);
  poner('dato-rol', usuario.rol);
  poner('dato-suscripcion', usuario.suscripcion);
  poner(
    'dato-registro',
    usuario.fechaRegistro ? new Date(usuario.fechaRegistro).toLocaleDateString('es-CL') : '—'
  );

  const campoNombre = raiz.getElementById('nombre');
  const campoCorreo = raiz.getElementById('correo');
  if (campoNombre) campoNombre.value = usuario.nombre;
  if (campoCorreo) campoCorreo.value = usuario.correo;
}
