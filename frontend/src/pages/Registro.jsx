import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthPage from './AuthPage.jsx'
import Field, { Input } from '../components/ui/Input.jsx'
import Button from '../components/ui/Button.jsx'
import Alert from '../components/ui/Alert.jsx'
import { api } from '../api.js'

export default function Registro() {
  const [form, setForm] = useState({ nombre: '', correo: '', password: '', password2: '' })
  const [mensaje, setMensaje] = useState(null)
  const [cargando, setCargando] = useState(false)
  const navigate = useNavigate()
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  async function onSubmit(e) {
    e.preventDefault()
    setMensaje(null)
    const { nombre, correo, password, password2 } = form
    if (!nombre.trim() || !correo.trim() || !password) return setMensaje({ tipo: 'error', texto: 'Completa todos los campos.' })
    if (password !== password2) return setMensaje({ tipo: 'error', texto: 'Las contraseñas no coinciden.' })
    if (password.length < 8) return setMensaje({ tipo: 'error', texto: 'La contraseña debe tener al menos 8 caracteres.' })
    setCargando(true)
    try {
      await api.post('/api/auth/registro', { nombre: nombre.trim(), correo: correo.trim(), password })
      navigate('/login?creada=1')
    } catch (error) {
      setMensaje({ tipo: 'error', texto: error.message })
    } finally {
      setCargando(false)
    }
  }

  return (
    <AuthPage title="Crea tu cuenta gratis" intro="Registro de Estudiante Free: estudia contenidos, ejercicios y simulacros PAES M1." onSubmit={onSubmit} links={<>
      <Link to="/login">¿Ya tienes cuenta? Inicia sesión</Link>
      <Link to="/recuperar">Olvidé mi contraseña</Link>
    </>}>
      <Field label="Nombre completo" required htmlFor="nombre"><Input id="nombre" type="text" autoComplete="name" maxLength="100" required value={form.nombre} onChange={set('nombre')} /></Field>
      <Field label="Correo electrónico" required htmlFor="correo"><Input id="correo" type="email" autoComplete="email" maxLength="150" required value={form.correo} onChange={set('correo')} /></Field>
      <Field label="Contraseña" required htmlFor="password" hint="Mínimo 8 caracteres."><Input id="password" type="password" autoComplete="new-password" minLength="8" required value={form.password} onChange={set('password')} /></Field>
      <Field label="Repite la contraseña" required htmlFor="password2"><Input id="password2" type="password" autoComplete="new-password" minLength="8" required value={form.password2} onChange={set('password2')} /></Field>
      {mensaje && <Alert variant={mensaje.tipo === 'exito' ? 'success' : 'error'}>{mensaje.texto}</Alert>}
      <Button full loading={cargando}>Crear cuenta</Button>
    </AuthPage>
  )
}
