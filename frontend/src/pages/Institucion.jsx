import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Badge from '../components/ui/Badge.jsx'
import Table from '../components/ui/Table.jsx'
import Button from '../components/ui/Button.jsx'
import Field, { Input, Textarea } from '../components/ui/Input.jsx'
import Alert from '../components/ui/Alert.jsx'
import { api, obtenerSesion } from '../api.js'

const TABS = [
  { id: 'estudiantes', label: 'Estudiantes' },
  { id: 'reporte', label: 'Reportes' },
  { id: 'calendario', label: 'Calendario' },
]

export default function Institucion() {
  const [tab, setTab] = useState('estudiantes')
  const [mensaje, setMensaje] = useState(null)
  const [cargando, setCargando] = useState(false)
  const navigate = useNavigate()

  const [estudiantes, setEstudiantes] = useState([])
  const [estForm, setEstForm] = useState({ id: '', nombre: '', correo: '', password: '', matricula: '' })
  const [reporte, setReporte] = useState(null)
  const [eventos, setEventos] = useState([])
  const [evForm, setEvForm] = useState({ id: '', titulo: '', fecha: '', descripcion: '' })

  useEffect(() => {
    obtenerSesion().then((u) => {
      if (!u) return navigate('/login?redirigir=%2Finstitucion')
      if (u.rol !== 'ADMIN_INSTITUCION') return navigate('/')
      cargarEstudiantes()
      cargarReporte()
      cargarEventos()
    })
  }, [navigate])

  async function cargarEstudiantes() { try { setEstudiantes((await api.get('/api/institucion/estudiantes')).estudiantes) } catch (e) { setMensaje(e.message) } }
  async function cargarReporte() { try { setReporte(await api.get('/api/institucion/reporte')) } catch (e) { setMensaje(e.message) } }
  async function cargarEventos() { try { setEventos((await api.get('/api/institucion/calendario')).eventos) } catch (e) { setMensaje(e.message) } }

  async function onEstSubmit(e) {
    e.preventDefault(); setMensaje(null)
    const { id, nombre, correo, password, matricula } = estForm
    if (!nombre.trim() || !correo.trim()) return setMensaje('Nombre y correo son obligatorios.')
    if (!id && !password) return setMensaje('Define una contraseña inicial para matricular.')
    const cuerpo = { nombre: nombre.trim(), correo: correo.trim() }
    if (password) cuerpo.password = password
    if (matricula.trim()) cuerpo.matricula = matricula.trim()
    setCargando(true)
    try {
      if (id) await api.put(`/api/institucion/estudiantes/${id}`, cuerpo)
      else await api.post('/api/institucion/estudiantes', cuerpo)
      setEstForm({ id: '', nombre: '', correo: '', password: '', matricula: '' })
      setMensaje(id ? 'Estudiante actualizado.' : 'Estudiante matriculado.')
      cargarEstudiantes()
    } catch (error) { setMensaje(error.message) } finally { setCargando(false) }
  }

  async function darBaja(id) {
    if (!window.confirm('¿Dar de baja a este estudiante? Se conserva el registro (baja lógica).')) return
    try { await api.delete(`/api/institucion/estudiantes/${id}`); setMensaje('Estudiante dado de baja.'); cargarEstudiantes() } catch (e) { setMensaje(e.message) }
  }

  async function onEvSubmit(e) {
    e.preventDefault(); setMensaje(null)
    const { id, titulo, fecha, descripcion } = evForm
    if (!titulo.trim() || !fecha) return setMensaje('Título y fecha/hora son obligatorios.')
    const cuerpo = { titulo: titulo.trim(), fecha_evento: fecha }
    if (descripcion.trim()) cuerpo.descripcion = descripcion.trim()
    setCargando(true)
    try {
      if (id) await api.put(`/api/institucion/calendario/${id}`, cuerpo)
      else await api.post('/api/institucion/calendario', cuerpo)
      setEvForm({ id: '', titulo: '', fecha: '', descripcion: '' })
      setMensaje(id ? 'Evento actualizado.' : 'Evento asignado al calendario.')
      cargarEventos()
    } catch (error) { setMensaje(error.message) } finally { setCargando(false) }
  }

  async function eliminarEvento(id) {
    if (!window.confirm('¿Eliminar este evento?')) return
    try { await api.delete(`/api/institucion/calendario/${id}`); setMensaje('Evento eliminado.'); cargarEventos() } catch (e) { setMensaje(e.message) }
  }

  return (
    <div className="stack">
      <h1>Panel de mi sede</h1>
      <p><Badge variant="info">ADMIN_INSTITUCION</Badge></p>
      {mensaje && <Alert variant="info">{mensaje}</Alert>}

      <div className="row" role="tablist" aria-label="Secciones del panel">
        {TABS.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}
            style={{ padding: '0.5rem 1rem', borderRadius: 'var(--radius-full)', fontWeight: 600, fontSize: 'var(--fs-sm)', background: tab === t.id ? 'var(--ink)' : 'var(--surface)', color: tab === t.id ? 'var(--paper)' : 'var(--ink)', border: '2px solid var(--ink)' }}>{t.label}</button>
        ))}
      </div>

      {tab === 'estudiantes' && (
        <section className="stack">
          <h2>Matrícula de estudiantes</h2>
          <form className="grid-auto" style={{ '--min': '240px' }} onSubmit={onEstSubmit} noValidate>
            <Field label="Nombre completo" required htmlFor="est-nombre"><Input id="est-nombre" maxLength="100" required value={estForm.nombre} onChange={(e) => setEstForm({ ...estForm, nombre: e.target.value })} /></Field>
            <Field label="Correo electrónico" required htmlFor="est-correo"><Input id="est-correo" type="email" maxLength="150" required value={estForm.correo} onChange={(e) => setEstForm({ ...estForm, correo: e.target.value })} /></Field>
            <Field label="Contraseña inicial" htmlFor="est-password"><Input id="est-password" type="password" minLength="8" value={estForm.password} onChange={(e) => setEstForm({ ...estForm, password: e.target.value })} /></Field>
            <Field label="Matrícula (opcional)" htmlFor="est-matricula"><Input id="est-matricula" maxLength="50" placeholder="MAT-001" value={estForm.matricula} onChange={(e) => setEstForm({ ...estForm, matricula: e.target.value })} /></Field>
            <div style={{ gridColumn: '1/-1' }}>
              <Button loading={cargando}>{estForm.id ? 'Guardar cambios' : 'Matricular estudiante'}</Button>
              {estForm.id && <Button type="button" variant="ghost" onClick={() => setEstForm({ id: '', nombre: '', correo: '', password: '', matricula: '' })}>Cancelar edición</Button>}
            </div>
          </form>
          <h3>Estudiantes de la sede</h3>
          <Table caption="Estudiantes de la sede" head={[{ label: 'ID' }, { label: 'Nombre' }, { label: 'Correo' }, { label: 'Matrícula' }, { label: 'Estado' }, { label: 'Acciones' }]}>
            {estudiantes.length === 0 ? <tr><td colSpan="6" style={{ textAlign: 'center', color: 'var(--ink-faint)' }}>Sin estudiantes registrados.</td></tr> : estudiantes.map((e) => (
              <tr key={e.id}>
                <td>{e.id}</td><td>{e.nombre}</td><td>{e.correo}</td><td>{e.matricula ?? '—'}</td><td>{e.activo ? 'Activo' : 'Baja'}</td>
                <td>
                  <Button size="sm" variant="outline" onClick={() => setEstForm({ id: e.id, nombre: e.nombre, correo: e.correo, password: '', matricula: e.matricula ?? '' })}>Editar</Button>
                  {e.activo && <Button size="sm" variant="danger" onClick={() => darBaja(e.id)}>Dar de baja</Button>}
                </td>
              </tr>
            ))}
          </Table>
        </section>
      )}

      {tab === 'reporte' && (
        <section className="stack">
          <h2>Reporte de rendimiento de la sede</h2>
          {reporte && <p className="text-faint">Sede: {reporte.sede.nombre} — {reporte.resumen.estudiantes} estudiantes matriculados ({reporte.resumen.activos} activos)</p>}
          <h3>Áreas débiles (menor progreso promedio primero)</h3>
          <Table caption="Reporte de rendimiento" head={[{ label: '#' }, { label: 'Eje temático' }, { label: 'Progreso promedio', align: 'right' }, { label: 'Respuestas', align: 'right' }, { label: 'Aciertos', align: 'right' }, { label: 'Diagnóstico' }]}>
            {!reporte ? <tr><td colSpan="6" style={{ textAlign: 'center', color: 'var(--ink-faint)' }}>Cargando…</td></tr> : reporte.areas_debiles.map((eje, i) => (
              <tr key={i}>
                <td>{i + 1}</td><td>{eje.nombre}</td><td style={{ textAlign: 'right' }}>{eje.progreso_promedio} %</td><td style={{ textAlign: 'right' }}>{eje.respuestas}</td><td style={{ textAlign: 'right' }}>{eje.aciertos}</td>
                <td>{eje.progreso_promedio < 50 ? 'Área débil' : 'Satisfactorio'}</td>
              </tr>
            ))}
          </Table>
        </section>
      )}

      {tab === 'calendario' && (
        <section className="stack">
          <h2>Calendario de ensayos de la sede</h2>
          <form className="grid-auto" style={{ '--min': '240px' }} onSubmit={onEvSubmit} noValidate>
            <Field label="Título" required htmlFor="ev-titulo"><Input id="ev-titulo" maxLength="150" placeholder="Ensayo DEMRE N° 3" required value={evForm.titulo} onChange={(e) => setEvForm({ ...evForm, titulo: e.target.value })} /></Field>
            <Field label="Fecha y hora" required htmlFor="ev-fecha"><Input id="ev-fecha" type="datetime-local" required value={evForm.fecha} onChange={(e) => setEvForm({ ...evForm, fecha: e.target.value })} /></Field>
            <div style={{ gridColumn: '1/-1' }}>
              <Field label="Descripción (opcional)" htmlFor="ev-descripcion"><Textarea id="ev-descripcion" maxLength="2000" value={evForm.descripcion} onChange={(e) => setEvForm({ ...evForm, descripcion: e.target.value })} /></Field>
            </div>
            <div style={{ gridColumn: '1/-1' }}>
              <Button loading={cargando}>{evForm.id ? 'Guardar cambios' : 'Asignar evento'}</Button>
              {evForm.id && <Button type="button" variant="ghost" onClick={() => setEvForm({ id: '', titulo: '', fecha: '', descripcion: '' })}>Cancelar edición</Button>}
            </div>
          </form>
          <h3>Eventos publicados</h3>
          <Table caption="Eventos publicados" head={[{ label: 'ID' }, { label: 'Título' }, { label: 'Fecha y hora' }, { label: 'Descripción' }, { label: 'Acciones' }]}>
            {eventos.length === 0 ? <tr><td colSpan="5" style={{ textAlign: 'center', color: 'var(--ink-faint)' }}>Sin eventos publicados.</td></tr> : eventos.map((ev) => (
              <tr key={ev.id_evento}>
                <td>{ev.id_evento}</td><td>{ev.titulo}</td><td>{new Date(ev.fecha_evento).toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' })}</td><td>{ev.descripcion ?? '—'}</td>
                <td>
                  <Button size="sm" variant="outline" onClick={() => setEvForm({ id: ev.id_evento, titulo: ev.titulo, fecha: ev.fecha_evento.slice(0, 16), descripcion: ev.descripcion ?? '' })}>Editar</Button>
                  <Button size="sm" variant="danger" onClick={() => eliminarEvento(ev.id_evento)}>Eliminar</Button>
                </td>
              </tr>
            ))}
          </Table>
        </section>
      )}
    </div>
  )
}
