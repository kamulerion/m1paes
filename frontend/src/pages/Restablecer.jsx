import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import AuthPage from './AuthPage.jsx'
import Field, { Input } from '../components/ui/Input.jsx'
import Button from '../components/ui/Button.jsx'
import Alert from '../components/ui/Alert.jsx'
import { api } from '../api.js'

export default function Restablecer() {
  const location = useLocation()
  const [token] = useState(() => new URLSearchParams(location.hash.slice(1)).get('token') || '')
  const [form, setForm] = useState({ password: '', password2: '' })
  const [mensaje, setMensaje] = useState(token ? null : { tipo: 'error', texto: 'El enlace no incluye un token válido. Solicita uno nuevo.' })
  const [cargando, setCargando] = useState(false)
  const navigate = useNavigate()
  useEffect(() => {
    if (token && location.hash) navigate('/restablecer', { replace: true })
  }, [location.hash, navigate, token])
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  async function onSubmit(e) {
    e.preventDefault()
    setMensaje(null)
    if (form.password.length < 8) return setMensaje({ tipo: 'error', texto: 'La contraseña debe tener al menos 8 caracteres.' })
    if (form.password !== form.password2) return setMensaje({ tipo: 'error', texto: 'Las contraseñas no coinciden.' })
    setCargando(true)
    try {
      await api.post('/api/auth/restablecer', { token, password: form.password })
      navigate('/login?restablecida=1')
    } catch (error) {
      setMensaje({ tipo: 'error', texto: error.message })
    } finally {
      setCargando(false)
    }
  }

  return (
    <AuthPage title="Elige una contraseña nueva" intro="El enlace es de un solo uso y caduca a los 30 minutos." onSubmit={onSubmit} links={<>
      <Link to="/recuperar">Solicitar un enlace nuevo</Link>
      <Link to="/login">Volver al inicio de sesión</Link>
    </>}>
      <Field label="Nueva contraseña" required hint="Mínimo 8 caracteres." htmlFor="password"><Input id="password" type="password" autoComplete="new-password" minLength="8" required value={form.password} onChange={set('password')} /></Field>
      <Field label="Repite la nueva contraseña" required htmlFor="password2"><Input id="password2" type="password" autoComplete="new-password" minLength="8" required value={form.password2} onChange={set('password2')} /></Field>
      {mensaje && <Alert variant={mensaje.tipo === 'exito' ? 'success' : 'error'}>{mensaje.texto}</Alert>}
      <Button full loading={cargando} disabled={!token}>Guardar contraseña</Button>
    </AuthPage>
  )
}
