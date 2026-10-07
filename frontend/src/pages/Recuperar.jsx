import { useState } from 'react'
import { Link } from 'react-router-dom'
import AuthPage from './AuthPage.jsx'
import Field, { Input } from '../components/ui/Input.jsx'
import Button from '../components/ui/Button.jsx'
import Alert from '../components/ui/Alert.jsx'
import { api } from '../api.js'

export default function Recuperar() {
  const [correo, setCorreo] = useState('')
  const [mensaje, setMensaje] = useState(null)
  const [token, setToken] = useState(null)
  const [cargando, setCargando] = useState(false)

  async function onSubmit(e) {
    e.preventDefault()
    setMensaje(null)
    if (!correo.trim()) return setMensaje({ tipo: 'error', texto: 'Ingresa tu correo electrónico.' })
    setCargando(true)
    try {
      const datos = await api.post('/api/auth/recuperar', { correo: correo.trim() })
      setMensaje({ tipo: 'exito', texto: 'Si el correo está registrado, recibirás instrucciones para restablecer tu contraseña.' })
      if (datos.token) setToken(datos.token)
    } catch (error) {
      setMensaje({ tipo: 'error', texto: error.message })
    } finally {
      setCargando(false)
    }
  }

  return (
    <AuthPage title="Recuperar contraseña" intro="Ingresa el correo de tu cuenta y te enviaremos un enlace para elegir una contraseña nueva." onSubmit={onSubmit} links={<>
      <Link to="/login">Volver al inicio de sesión</Link>
      <Link to="/registro">Crear una cuenta</Link>
    </>}>
      <Field label="Correo electrónico" required htmlFor="correo"><Input id="correo" type="email" autoComplete="email" maxLength="150" required value={correo} onChange={(e) => setCorreo(e.target.value)} /></Field>
      {mensaje && <Alert variant={mensaje.tipo === 'exito' ? 'success' : 'error'}>{mensaje.texto}</Alert>}
      {token && <p style={{ fontSize: 'var(--fs-sm)' }}>Entorno de desarrollo: <Link to={`/restablecer?token=${encodeURIComponent(token)}`}>Abrir formulario de contraseña nueva</Link></p>}
      <Button full loading={cargando}>Enviar enlace</Button>
    </AuthPage>
  )
}
