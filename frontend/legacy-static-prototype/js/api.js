'use strict';

/* exported api, mostrarMensaje */

/**
 * Cliente HTTP mínimo de la API (vanilla, mismo origen — ADR-001).
 * Devuelve el JSON de éxito y lanza un Error con el mensaje del servidor
 * ante cualquier 4xx/5xx (la API siempre responde { error: { message } }).
 */
const api = {
  async enviar(metodo, ruta, datos) {
    const opciones = {
      method: metodo,
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin', // las cookies de sesión viajan con la petición
    };
    if (datos !== undefined) opciones.body = JSON.stringify(datos);

    const res = await fetch(ruta, opciones);
    let cuerpo = null;
    try {
      cuerpo = await res.json();
    } catch {
      // Respuesta sin cuerpo JSON (p. ej. 204).
    }
    if (!res.ok) {
      const error = new Error(cuerpo?.error?.message || `Error ${res.status}`);
      error.status = res.status;
      error.detalles = cuerpo?.error?.details;
      throw error;
    }
    return cuerpo;
  },
  get(ruta) {
    return this.enviar('GET', ruta);
  },
  post(ruta, datos) {
    return this.enviar('POST', ruta, datos);
  },
  put(ruta, datos) {
    return this.enviar('PUT', ruta, datos);
  },
};

/**
 * Muestra un mensaje en un elemento con aria-live (lectores de pantalla).
 * tipo: 'error' | 'exito'; cadena vacía para ocultarlo.
 */
function mostrarMensaje(elemento, texto, tipo = 'error') {
  elemento.textContent = texto || '';
  elemento.className = texto ? `mensaje ${tipo}` : 'mensaje';
}
