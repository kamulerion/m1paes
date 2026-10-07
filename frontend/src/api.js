export async function apiEnviar(metodo, ruta, datos) {
  const opciones = {
    method: metodo,
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
  }
  if (datos !== undefined) opciones.body = JSON.stringify(datos)
  const res = await fetch(ruta, opciones)
  let cuerpo = null
  try { cuerpo = await res.json() } catch { /* sin cuerpo JSON */ }
  if (!res.ok) {
    const error = new Error(cuerpo?.error?.message || `Error ${res.status}`)
    error.status = res.status
    error.detalles = cuerpo?.error?.details
    throw error
  }
  return cuerpo
}

export const api = {
  get: (r) => apiEnviar('GET', r),
  post: (r, d) => apiEnviar('POST', r, d),
  put: (r, d) => apiEnviar('PUT', r, d),
  delete: (r) => apiEnviar('DELETE', r),
}

export async function obtenerSesion() {
  try {
    const datos = await api.get('/api/auth/sesion')
    return datos.usuario
  } catch (error) {
    if (error.status === 401) return null
    throw error
  }
}
