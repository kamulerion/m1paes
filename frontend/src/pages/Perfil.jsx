import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Field, { Input } from '../components/ui/Input.jsx'
import Button from '../components/ui/Button.jsx'
import Badge from '../components/ui/Badge.jsx'
import Alert from '../components/ui/Alert.jsx'
import { Spinner } from '../components/ui/Feedback.jsx'
import { api, obtenerSesion } from '../api.js'

export default function Perfil() {
  const [usuario, setUsuario] = useState(null)
  const [form, setForm] = useState({ nombre: '', correo: '' })
  const [mensaje, setMensaje] = useState(null)
  const [cargando, setCargando] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    obtenerSesion().then((u) => {
      if (!u) return navigate('/login?redirigir=%2Fperfil')
      setUsuario(u)
      setForm({ nombre: u.nombre, correo: u.correo })
    })
  }, [navigate])

  async function onSubmit(e) {
    e.preventDefault()
    setMensaje(null)
    if (!form.nombre.trim() || !form.correo.trim()) return setMensaje({ tipo: 'error', texto: 'El nombre y el correo son obligatorios.' })
    setCargando(true)
    try {
      const datos = await api.put('/api/perfil', { nombre: form.nombre.trim(), correo: form.correo.trim() })
      setUsuario(datos.usuario)
      setMensaje({ tipo: 'exito', texto: 'Cambios guardados.' })
    } catch (error) {
      setMensaje({ tipo: 'error', texto: error.message })
    } finally {
      setCargando(false)
    }
  }

  async function salir() {
    await api.post('/api/auth/logout')
    navigate('/')
  }

  if (!usuario) return <Spinner />

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', paddingBlock: 'var(--sp-7)' }}>
      <h1>Mi perfil</h1>
      <p style={{ marginTop: 'var(--sp-2)' }}><Badge variant="info">{usuario.rol}</Badge></p>
      <dl style={{ marginTop: 'var(--sp-5)', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--radius)', padding: 'var(--sp-5)' }}>
        {[['Nombre', usuario.nombre], ['Correo', usuario.correo], ['Suscripción', usuario.suscripcion], ['Fecha de registro', usuario.fechaRegistro ? new Date(usuario.fechaRegistro).toLocaleDateString('es-CL') : '—']].map(([k, v]) => (
          <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', borderBottom: '1px dashed var(--line)' }}>
            <dt style={{ fontWeight: 700 }}>{k}</dt><dd>{v}</dd>
          </div>
        ))}
      </dl>
      <h2 style={{ marginTop: 'var(--sp-6)' }}>Editar mis datos</h2>
      <form className="stack" style={{ marginTop: 'var(--sp-4)' }} onSubmit={onSubmit} noValidate>
        <Field label="Nombre" required htmlFor="nombre"><Input id="nombre" type="text" maxLength="100" required value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} /></Field>
        <Field label="Correo electrónico" required htmlFor="correo"><Input id="correo" type="email" maxLength="150" required value={form.correo} onChange={(e) => setForm({ ...form, correo: e.target.value })} /></Field>
        {mensaje && <Alert variant={mensaje.tipo === 'exito' ? 'success' : 'error'}>{mensaje.texto}</Alert>}
        <Button loading={cargando}>Guardar cambios</Button>
        <Button type="button" variant="ghost" onClick={salir}>Cerrar sesión</Button>
      </form>
    </div>
  )
}
