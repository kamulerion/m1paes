import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import AuthPage from './AuthPage.jsx'
import Field, { Input } from '../components/ui/Input.jsx'
import Button from '../components/ui/Button.jsx'
import Alert from '../components/ui/Alert.jsx'
import { api } from '../api.js'

export default function Login() {
  const [correo, setCorreo] = useState('')
  const [password, setPassword] = useState('')
  const [mensaje, setMensaje] = useState(null)
  const [cargando, setCargando] = useState(false)
  const navigate = useNavigate()
  const [params] = useSearchParams()

  const aviso = params.has('creada')
    ? 'Cuenta creada. Inicia sesión para continuar.'
    : params.has('restablecida')
      ? 'Contraseña actualizada. Inicia sesión con tu nueva contraseña.'
      : null

  async function onSubmit(e) {
    e.preventDefault()
    setMensaje(null)
    if (!correo.trim() || !password) return setMensaje({ tipo: 'error', texto: 'Ingresa tu correo y tu contraseña.' })
    setCargando(true)
    try {
      await api.post('/api/auth/login', { correo: correo.trim(), password })
      navigate(params.get('redirigir') ? decodeURIComponent(params.get('redirigir')) : '/perfil')
    } catch (error) {
      setMensaje({ tipo: 'error', texto: error.message })
    } finally {
      setCargando(false)
    }
  }

  return (
    <AuthPage title="Ingresar" onSubmit={onSubmit} links={<>
      <Link to="/registro">¿No tienes cuenta? Regístrate</Link>
      <Link to="/recuperar">Olvidé mi contraseña</Link>
    </>}>
      {aviso && <Alert variant="success">{aviso}</Alert>}
      <Field label="Correo electrónico" required htmlFor="correo"><Input id="correo" type="email" autoComplete="email" maxLength="150" required value={correo} onChange={(e) => setCorreo(e.target.value)} /></Field>
      <Field label="Contraseña" required htmlFor="password"><Input id="password" type="password" autoComplete="current-password" minLength="8" required value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
      {mensaje && <Alert variant={mensaje.tipo === 'exito' ? 'success' : 'error'}>{mensaje.texto}</Alert>}
      <Button full loading={cargando}>Ingresar</Button>
    </AuthPage>
  )
}
