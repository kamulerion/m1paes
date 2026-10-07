import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Badge from '../components/ui/Badge.jsx'
import Card from '../components/ui/Card.jsx'
import Table from '../components/ui/Table.jsx'
import Button from '../components/ui/Button.jsx'
import Field, { Input, Select, Textarea } from '../components/ui/Input.jsx'
import Alert from '../components/ui/Alert.jsx'
import { Spinner } from '../components/ui/Feedback.jsx'
import { api, obtenerSesion } from '../api.js'
import styles from './Admin.module.css'

const TABS = [
  { id: 'instituciones', label: 'Instituciones' },
  { id: 'administradores', label: 'Administradores' },
  { id: 'contenido', label: 'Ejes y lecciones' },
  { id: 'ejercicios', label: 'Ejercicios' },
  { id: 'simulacros', label: 'Simulacros' },
  { id: 'metricas', label: 'Métricas' },
]

export default function Admin() {
  const [tab, setTab] = useState('instituciones')
  const [mensaje, setMensaje] = useState(null)
  const [cargando, setCargando] = useState(false)
  const navigate = useNavigate()
  const ok = (t) => setMensaje({ tipo: 'success', texto: t })
  const err = (e) => setMensaje({ tipo: 'error', texto: e.message ?? e })

  // Instituciones
  const [instituciones, setInstituciones] = useState([])
  const [instForm, setInstForm] = useState({ id: '', nombre: '', rut: '' })
  // Administradores
  const [administradores, setAdministradores] = useState([])
  const [admForm, setAdmForm] = useState({ id: '', nombre: '', correo: '', password: '', id_institucion: '', cargo: '' })
  // Ejes y lecciones
  const [ejes, setEjes] = useState([])
  const [ejeForm, setEjeForm] = useState({ id: '', nombre: '', descripcion: '' })
  const [lecciones, setLecciones] = useState([])
  const [lecForm, setLecForm] = useState({ id: '', id_eje: '', titulo: '', orden: 1, url_video: '', cuerpo_teoria: '' })
  // Ejercicios
  const [ejercicios, setEjercicios] = useState([])
  const [ejrForm, setEjrForm] = useState({ id: '', id_contenido: '', enunciado: '', explicacion_solucion: '', dificultad: 'MEDIA', alternativas: [{ texto: '', correcta: true }, { texto: '', correcta: false }] })
  // Simulacros
  const [simulacros, setSimulacros] = useState([])
  const [simForm, setSimForm] = useState({ id: '', nombre: '', cantidad: 65, tiempo: 140 })
  const [comp, setComp] = useState(null) // { simulacro, orden: [], banco: [] }
  // Métricas
  const [metricas, setMetricas] = useState(null)

  useEffect(() => {
    obtenerSesion().then((u) => {
      if (!u) return navigate('/login?redirigir=%2Fadmin')
      if (u.rol !== 'SUPERADMIN') return navigate('/')
      cargarTodo()
    })
  }, [navigate])

  async function cargarTodo() {
    try {
      const [ins, adm, ej, lec, ejr, sim, met] = await Promise.all([
        api.get('/api/admin/instituciones'), api.get('/api/admin/administradores'),
        api.get('/api/admin/ejes'), api.get('/api/admin/lecciones'),
        api.get('/api/admin/ejercicios'), api.get('/api/admin/simulacros'),
        api.get('/api/admin/metricas'),
      ])
      setInstituciones(ins.instituciones); setAdministradores(adm.administradores)
      setEjes(ej.ejes); setLecciones(lec.lecciones)
      setEjercicios(ejr.ejercicios); setSimulacros(sim.simulacros); setMetricas(met)
    } catch (e) { err(e) }
  }

  /* --- Instituciones --- */
  async function onInst(e) {
    e.preventDefault(); setCargando(true)
    try {
      const cuerpo = { nombre: instForm.nombre.trim(), rut_identificador: instForm.rut.trim() }
      if (instForm.id) await api.put(`/api/admin/instituciones/${instForm.id}`, cuerpo)
      else await api.post('/api/admin/instituciones', cuerpo)
      setInstForm({ id: '', nombre: '', rut: '' }); ok(instForm.id ? 'Institución actualizada.' : 'Institución creada.'); cargarTodo()
    } catch (e) { err(e) } finally { setCargando(false) }
  }
  async function instBaja(id) {
    if (!window.confirm('¿Dar de baja esta institución?')) return
    try { await api.delete(`/api/admin/instituciones/${id}`); ok('Institución dada de baja.'); cargarTodo() } catch (e) { err(e) }
  }
  async function instReactivar(id) { try { await api.put(`/api/admin/instituciones/${id}`, { activo: true }); ok('Institución reactivada.'); cargarTodo() } catch (e) { err(e) } }

  /* --- Administradores --- */
  async function onAdm(e) {
    e.preventDefault(); setCargando(true)
    try {
      if (admForm.id) {
        await api.put(`/api/admin/administradores/${admForm.id}`, { nombre: admForm.nombre.trim(), id_institucion: Number(admForm.id_institucion), ...(admForm.cargo ? { cargo: admForm.cargo } : {}) })
      } else {
        if (!admForm.password) return err(new Error('La contraseña es obligatoria en el alta.'))
        await api.post('/api/admin/administradores', { nombre: admForm.nombre.trim(), correo: admForm.correo.trim(), password: admForm.password, id_institucion: Number(admForm.id_institucion), cargo: admForm.cargo || undefined })
      }
      setAdmForm({ id: '', nombre: '', correo: '', password: '', id_institucion: '', cargo: '' }); ok(admForm.id ? 'Administrador actualizado.' : 'Administrador creado.'); cargarTodo()
    } catch (e) { err(e) } finally { setCargando(false) }
  }
  async function admBaja(id) {
    if (!window.confirm('¿Dar de baja este administrador?')) return
    try { await api.delete(`/api/admin/administradores/${id}`); ok('Administrador dado de baja.'); cargarTodo() } catch (e) { err(e) }
  }
  async function admReactivar(id) { try { await api.put(`/api/admin/administradores/${id}`, { activo: true }); ok('Administrador reactivado.'); cargarTodo() } catch (e) { err(e) } }

  /* --- Ejes --- */
  async function onEje(e) {
    e.preventDefault(); setCargando(true)
    try {
      if (ejeForm.id) await api.put(`/api/admin/ejes/${ejeForm.id}`, { nombre: ejeForm.nombre.trim(), descripcion: ejeForm.descripcion.trim() })
      else await api.post('/api/admin/ejes', { nombre: ejeForm.nombre.trim(), descripcion: ejeForm.descripcion.trim() })
      setEjeForm({ id: '', nombre: '', descripcion: '' }); ok(ejeForm.id ? 'Eje actualizado.' : 'Eje creado.'); cargarTodo()
    } catch (e) { err(e) } finally { setCargando(false) }
  }

  /* --- Lecciones --- */
  async function onLec(e) {
    e.preventDefault(); setCargando(true)
    try {
      const cuerpo = { id_eje: Number(lecForm.id_eje), titulo: lecForm.titulo.trim(), cuerpo_teoria: lecForm.cuerpo_teoria.trim(), url_video: lecForm.url_video.trim() || null, orden: Number(lecForm.orden) }
      if (lecForm.id) await api.put(`/api/admin/lecciones/${lecForm.id}`, cuerpo)
      else await api.post('/api/admin/lecciones', cuerpo)
      setLecForm({ id: '', id_eje: '', titulo: '', orden: 1, url_video: '', cuerpo_teoria: '' }); ok(lecForm.id ? 'Lección actualizada.' : 'Lección publicada.'); cargarTodo()
    } catch (e) { err(e) } finally { setCargando(false) }
  }

  /* --- Ejercicios --- */
  async function onEjr(e) {
    e.preventDefault(); setCargando(true)
    try {
      const alternativas = ejrForm.alternativas.filter((a) => a.texto.trim()).map((a) => ({ texto: a.texto.trim(), es_correcta: a.correcta }))
      if (alternativas.filter((a) => a.es_correcta).length !== 1) return err(new Error('Marca exactamente una alternativa correcta.'))
      const cuerpo = { id_contenido: Number(ejrForm.id_contenido), enunciado: ejrForm.enunciado.trim(), explicacion_solucion: ejrForm.explicacion_solucion.trim(), dificultad: ejrForm.dificultad, alternativas }
      if (ejrForm.id) { const edicion = { ...cuerpo }; delete edicion.id_contenido; await api.put(`/api/admin/ejercicios/${ejrForm.id}`, edicion) }
      else await api.post('/api/admin/ejercicios', cuerpo)
      setEjrForm({ id: '', id_contenido: '', enunciado: '', explicacion_solucion: '', dificultad: 'MEDIA', alternativas: [{ texto: '', correcta: true }, { texto: '', correcta: false }] })
      ok(ejrForm.id ? 'Ejercicio actualizado.' : 'Ejercicio creado.'); cargarTodo()
    } catch (e) { err(e) } finally { setCargando(false) }
  }

  /* --- Simulacros --- */
  async function onSim(e) {
    e.preventDefault(); setCargando(true)
    try {
      const cuerpo = { nombre: simForm.nombre.trim(), cantidad_preguntas: Number(simForm.cantidad), tiempo_limite_minutos: Number(simForm.tiempo) }
      if (simForm.id) await api.put(`/api/admin/simulacros/${simForm.id}`, cuerpo)
      else await api.post('/api/admin/simulacros', cuerpo)
      setSimForm({ id: '', nombre: '', cantidad: 65, tiempo: 140 }); ok(simForm.id ? 'Simulacro reparametrizado.' : 'Simulacro creado.'); cargarTodo()
    } catch (e) { err(e) } finally { setCargando(false) }
  }
  async function abrirComp(sim) {
    try {
      const [actuales, banco] = await Promise.all([api.get(`/api/admin/simulacros/${sim.id_simulacro}/preguntas`), api.get('/api/admin/ejercicios')])
      setComp({ simulacro: sim, orden: actuales.preguntas.map((p) => p.id_ejercicio), banco: banco.ejercicios })
    } catch (e) { err(e) }
  }
  async function guardarComp() {
    try {
      const datos = await api.put(`/api/admin/simulacros/${comp.simulacro.id_simulacro}/preguntas`, { id_ejercicios: comp.orden })
      ok(datos.mensaje); cargarTodo()
    } catch (e) { err(e) }
  }

  if (metricas === null) return <Spinner />

  const textoEjercicio = (id) => {
    const e = comp.banco.find((x) => x.id_ejercicio === id)
    return e ? `#${id} — ${e.enunciado.length > 70 ? e.enunciado.slice(0, 70) + '…' : e.enunciado}` : `Ejercicio #${id}`
  }

  return (
    <div className="stack">
      <h1>Panel de administración</h1>
      <p><Badge variant="info">SUPERADMIN</Badge></p>
      {mensaje && <Alert variant={mensaje.tipo}>{mensaje.texto}</Alert>}

      <div className="row" role="tablist" aria-label="Secciones del panel">
        {TABS.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}
            style={{ padding: '0.5rem 1rem', borderRadius: 'var(--radius-full)', fontWeight: 600, fontSize: 'var(--fs-sm)', background: tab === t.id ? 'var(--ink)' : 'var(--surface)', color: tab === t.id ? 'var(--paper)' : 'var(--ink)', border: '2px solid var(--ink)' }}>{t.label}</button>
        ))}
      </div>

      {tab === 'instituciones' && (
        <section className={`stack ${styles.institutionSection}`}>
          <h2>Instituciones bajo convenio</h2>
          <form className={styles.institutionForm} onSubmit={onInst} noValidate>
            <div className={styles.institutionFields}>
              <Field label="Nombre" required htmlFor="inst-nombre"><Input id="inst-nombre" maxLength="120" required value={instForm.nombre} onChange={(e) => setInstForm({ ...instForm, nombre: e.target.value })} /></Field>
              <Field label="RUT identificador" required htmlFor="inst-rut"><Input id="inst-rut" maxLength="20" placeholder="76.123.456-7" required value={instForm.rut} onChange={(e) => setInstForm({ ...instForm, rut: e.target.value })} /></Field>
              <div className={styles.conventionField}>
                <span className={styles.conventionLabel}>Tipo de convenio</span>
                <span className={styles.conventionValue}>B2B Premium</span>
              </div>
            </div>
            <div className={styles.institutionActions}>
              <Button loading={cargando}>{instForm.id ? 'Guardar cambios' : 'Crear institución'}</Button>
              {instForm.id && <Button type="button" variant="ghost" onClick={() => setInstForm({ id: '', nombre: '', rut: '' })}>Cancelar edición</Button>}
            </div>
          </form>
          <Table caption="Instituciones" head={[{ label: 'ID' }, { label: 'Nombre' }, { label: 'RUT' }, { label: 'Convenio' }, { label: 'Usuarios', align: 'right' }, { label: 'Estado' }, { label: 'Acciones' }]}>
            {instituciones.map((i) => (
              <tr key={i.id_institucion}>
                <td>{i.id_institucion}</td><td>{i.nombre}</td><td>{i.rut_identificador}</td><td>{i.convenio_tipo === 'B2B_PREMIUM' ? 'B2B Premium' : i.convenio_tipo}</td><td style={{ textAlign: 'right' }}>{i.usuarios}</td><td>{i.activo ? 'Activa' : 'Baja'}</td>
                <td>
                  <Button size="sm" variant="outline" onClick={() => setInstForm({ id: i.id_institucion, nombre: i.nombre, rut: i.rut_identificador })}>Editar</Button>
                  {i.activo ? <Button size="sm" variant="danger" onClick={() => instBaja(i.id_institucion)}>Baja</Button> : <Button size="sm" variant="success" onClick={() => instReactivar(i.id_institucion)}>Reactivar</Button>}
                </td>
              </tr>
            ))}
          </Table>
        </section>
      )}

      {tab === 'administradores' && (
        <section className="stack">
          <h2>Administradores de institución</h2>
          <form className="grid-auto" style={{ '--min': '220px' }} onSubmit={onAdm} noValidate>
            <Field label="Nombre" required htmlFor="adm-nombre"><Input id="adm-nombre" maxLength="100" required value={admForm.nombre} onChange={(e) => setAdmForm({ ...admForm, nombre: e.target.value })} /></Field>
            <Field label="Correo electrónico" required htmlFor="adm-correo"><Input id="adm-correo" type="email" maxLength="150" required disabled={Boolean(admForm.id)} value={admForm.correo} onChange={(e) => setAdmForm({ ...admForm, correo: e.target.value })} /></Field>
            {!admForm.id && <Field label="Contraseña" required htmlFor="adm-password"><Input id="adm-password" type="password" minLength="8" value={admForm.password} onChange={(e) => setAdmForm({ ...admForm, password: e.target.value })} /></Field>}
            <Field label="Institución" htmlFor="adm-institucion">
              <Select id="adm-institucion" value={admForm.id_institucion} onChange={(e) => setAdmForm({ ...admForm, id_institucion: e.target.value })}>
                <option value="">Selecciona…</option>
                {instituciones.filter((i) => i.activo).map((i) => <option key={i.id_institucion} value={i.id_institucion}>{i.nombre}</option>)}
              </Select>
            </Field>
            <Field label="Cargo" htmlFor="adm-cargo"><Input id="adm-cargo" maxLength="50" placeholder="Jefe de UTP" value={admForm.cargo} onChange={(e) => setAdmForm({ ...admForm, cargo: e.target.value })} /></Field>
            <div style={{ gridColumn: '1/-1' }}>
              <Button loading={cargando}>{admForm.id ? 'Guardar cambios' : 'Crear administrador'}</Button>
              {admForm.id && <Button type="button" variant="ghost" onClick={() => setAdmForm({ id: '', nombre: '', correo: '', password: '', id_institucion: '', cargo: '' })}>Cancelar edición</Button>}
            </div>
          </form>
          <Table caption="Administradores" head={[{ label: 'ID' }, { label: 'Nombre' }, { label: 'Correo' }, { label: 'Cargo' }, { label: 'Institución' }, { label: 'Estado' }, { label: 'Acciones' }]}>
            {administradores.map((a) => (
              <tr key={a.id}>
                <td>{a.id}</td><td>{a.nombre}</td><td>{a.correo}</td><td>{a.cargo ?? '—'}</td><td>{a.institucion ?? '—'}</td><td>{a.activo ? 'Activo' : 'Baja'}</td>
                <td>
                  <Button size="sm" variant="outline" onClick={() => setAdmForm({ id: a.id, nombre: a.nombre, correo: a.correo, password: '', id_institucion: instituciones.find((i) => i.nombre === a.institucion)?.id_institucion ?? '', cargo: a.cargo ?? '' })}>Editar</Button>
                  {a.activo ? <Button size="sm" variant="danger" onClick={() => admBaja(a.id)}>Baja</Button> : <Button size="sm" variant="success" onClick={() => admReactivar(a.id)}>Reactivar</Button>}
                </td>
              </tr>
            ))}
          </Table>
        </section>
      )}

      {tab === 'contenido' && (
        <section className="stack">
          <h2>Ejes temáticos</h2>
          <form className="grid-auto" style={{ '--min': '220px' }} onSubmit={onEje} noValidate>
            <Field label="Nombre del eje" required htmlFor="eje-nombre"><Input id="eje-nombre" maxLength="100" required value={ejeForm.nombre} onChange={(e) => setEjeForm({ ...ejeForm, nombre: e.target.value })} /></Field>
            <Field label="Descripción" required htmlFor="eje-descripcion"><Input id="eje-descripcion" maxLength="2000" required value={ejeForm.descripcion} onChange={(e) => setEjeForm({ ...ejeForm, descripcion: e.target.value })} /></Field>
            <div style={{ gridColumn: '1/-1' }}>
              <Button loading={cargando}>{ejeForm.id ? 'Guardar cambios' : 'Crear eje'}</Button>
              {ejeForm.id && <Button type="button" variant="ghost" onClick={() => setEjeForm({ id: '', nombre: '', descripcion: '' })}>Cancelar edición</Button>}
            </div>
          </form>
          <Table caption="Ejes temáticos" head={[{ label: 'ID' }, { label: 'Eje' }, { label: 'Descripción' }, { label: 'Lecciones', align: 'right' }, { label: 'Acciones' }]}>
            {ejes.map((e) => (
              <tr key={e.id_eje}>
                <td>{e.id_eje}</td><td>{e.nombre}</td><td>{e.descripcion}</td><td style={{ textAlign: 'right' }}>{e.lecciones}</td>
                <td><Button size="sm" variant="outline" onClick={() => setEjeForm({ id: e.id_eje, nombre: e.nombre, descripcion: e.descripcion })}>Editar</Button></td>
              </tr>
            ))}
          </Table>

          <h2 style={{ marginTop: 'var(--sp-5)' }}>Lecciones publicadas</h2>
          <form className="grid-auto" style={{ '--min': '220px' }} onSubmit={onLec} noValidate>
            <Field label="Eje temático" htmlFor="lec-eje">
              <Select id="lec-eje" value={lecForm.id_eje} onChange={(e) => setLecForm({ ...lecForm, id_eje: e.target.value })}>
                <option value="">Selecciona…</option>
                {ejes.map((e) => <option key={e.id_eje} value={e.id_eje}>{e.nombre}</option>)}
              </Select>
            </Field>
            <Field label="Título" required htmlFor="lec-titulo"><Input id="lec-titulo" maxLength="150" required value={lecForm.titulo} onChange={(e) => setLecForm({ ...lecForm, titulo: e.target.value })} /></Field>
            <Field label="Orden" required htmlFor="lec-orden"><Input id="lec-orden" type="number" min="1" max="1000" required value={lecForm.orden} onChange={(e) => setLecForm({ ...lecForm, orden: e.target.value })} /></Field>
            <Field label="URL del video (opcional)" htmlFor="lec-video"><Input id="lec-video" type="url" maxLength="255" placeholder="https://…" value={lecForm.url_video} onChange={(e) => setLecForm({ ...lecForm, url_video: e.target.value })} /></Field>
            <div style={{ gridColumn: '1/-1' }}>
              <Field label="Cuerpo de la teoría" required htmlFor="lec-cuerpo"><Textarea id="lec-cuerpo" minLength="10" required value={lecForm.cuerpo_teoria} onChange={(e) => setLecForm({ ...lecForm, cuerpo_teoria: e.target.value })} /></Field>
            </div>
            <div style={{ gridColumn: '1/-1' }}>
              <Button loading={cargando}>{lecForm.id ? 'Guardar cambios' : 'Publicar lección'}</Button>
              {lecForm.id && <Button type="button" variant="ghost" onClick={() => setLecForm({ id: '', id_eje: '', titulo: '', orden: 1, url_video: '', cuerpo_teoria: '' })}>Cancelar edición</Button>}
            </div>
          </form>
          <Table caption="Lecciones" head={[{ label: 'ID' }, { label: 'Eje' }, { label: 'Título' }, { label: 'Orden', align: 'right' }, { label: 'Publicada' }, { label: 'Acciones' }]}>
            {lecciones.map((l) => (
              <tr key={l.id_contenido}>
                <td>{l.id_contenido}</td><td>{l.eje}</td><td>{l.titulo}</td><td style={{ textAlign: 'right' }}>{l.orden}</td><td>{l.fecha_publicacion ? new Date(l.fecha_publicacion).toLocaleDateString('es-CL') : '—'}</td>
                <td><Button size="sm" variant="outline" onClick={() => setLecForm({ id: l.id_contenido, id_eje: l.id_eje ?? '', titulo: l.titulo, orden: l.orden, url_video: l.url_video ?? '', cuerpo_teoria: l.cuerpo_teoria ?? '' })}>Editar</Button></td>
              </tr>
            ))}
          </Table>
        </section>
      )}

      {tab === 'ejercicios' && (
        <section className="stack">
          <h2>Banco de ejercicios</h2>
          <form className="grid-auto" style={{ '--min': '220px' }} onSubmit={onEjr} noValidate>
            <Field label="Lección" htmlFor="ejr-contenido">
              <Select id="ejr-contenido" value={ejrForm.id_contenido} onChange={(e) => setEjrForm({ ...ejrForm, id_contenido: e.target.value })}>
                <option value="">Selecciona…</option>
                {lecciones.map((l) => <option key={l.id_contenido} value={l.id_contenido}>{l.eje} — {l.titulo}</option>)}
              </Select>
            </Field>
            <Field label="Dificultad" htmlFor="ejr-dificultad">
              <Select id="ejr-dificultad" value={ejrForm.dificultad} onChange={(e) => setEjrForm({ ...ejrForm, dificultad: e.target.value })}><option>FACIL</option><option>MEDIA</option><option>DIFICIL</option></Select>
            </Field>
            <div style={{ gridColumn: '1/-1' }}><Field label="Enunciado" required htmlFor="ejr-enunciado"><Textarea id="ejr-enunciado" minLength="5" required value={ejrForm.enunciado} onChange={(e) => setEjrForm({ ...ejrForm, enunciado: e.target.value })} /></Field></div>
            <div style={{ gridColumn: '1/-1' }}><Field label="Explicación de la solución" required htmlFor="ejr-explicacion"><Textarea id="ejr-explicacion" minLength="5" required value={ejrForm.explicacion_solucion} onChange={(e) => setEjrForm({ ...ejrForm, explicacion_solucion: e.target.value })} /></Field></div>
            <div style={{ gridColumn: '1/-1' }}>
              <p style={{ fontWeight: 600, fontSize: 'var(--fs-sm)' }}>Alternativas (marca la correcta)</p>
              {ejrForm.alternativas.map((a, i) => (
                <div key={i} className="row" style={{ marginBottom: 'var(--sp-2)' }}>
                  <input type="radio" name="correcta" checked={a.correcta} onChange={() => setEjrForm({ ...ejrForm, alternativas: ejrForm.alternativas.map((x, j) => ({ ...x, correcta: j === i })) })} />
                  <Input placeholder={`Alternativa ${i + 1}`} value={a.texto} onChange={(e) => setEjrForm({ ...ejrForm, alternativas: ejrForm.alternativas.map((x, j) => j === i ? { ...x, texto: e.target.value } : x) })} />
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={() => setEjrForm({ ...ejrForm, alternativas: [...ejrForm.alternativas, { texto: '', correcta: false }] })}>+ Agregar alternativa</Button>
            </div>
            <div style={{ gridColumn: '1/-1' }}>
              <Button loading={cargando}>{ejrForm.id ? 'Guardar cambios' : 'Crear ejercicio'}</Button>
              {ejrForm.id && <Button type="button" variant="ghost" onClick={() => setEjrForm({ id: '', id_contenido: '', enunciado: '', explicacion_solucion: '', dificultad: 'MEDIA', alternativas: [{ texto: '', correcta: true }, { texto: '', correcta: false }] })}>Cancelar edición</Button>}
            </div>
          </form>
          <Table caption="Ejercicios" head={[{ label: 'ID' }, { label: 'Lección' }, { label: 'Enunciado' }, { label: 'Dificultad' }, { label: 'Alts.', align: 'right' }, { label: 'Acciones' }]}>
            {ejercicios.map((e) => (
              <tr key={e.id_ejercicio}>
                <td>{e.id_ejercicio}</td><td>{e.contenido}</td><td>{e.enunciado?.slice(0, 60)}…</td><td>{e.dificultad}</td><td style={{ textAlign: 'right' }}>{e.alternativas}</td>
                <td><Button size="sm" variant="outline" onClick={async () => { const d = await api.get(`/api/admin/ejercicios/${e.id_ejercicio}`); setEjrForm({ id: e.id_ejercicio, id_contenido: d.ejercicio.id_contenido, enunciado: d.ejercicio.enunciado, explicacion_solucion: d.ejercicio.explicacion_solucion, dificultad: d.ejercicio.dificultad, alternativas: d.ejercicio.alternativas.map((a) => ({ texto: a.texto, correcta: a.es_correcta })) }) }}>Editar</Button></td>
              </tr>
            ))}
          </Table>
        </section>
      )}

      {tab === 'simulacros' && (
        <section className="stack">
          <h2>Simulacros (formato oficial: 65 preguntas / 140 minutos)</h2>
          <form className="grid-auto" style={{ '--min': '220px' }} onSubmit={onSim} noValidate>
            <Field label="Nombre" required htmlFor="sim-nombre"><Input id="sim-nombre" maxLength="120" required value={simForm.nombre} onChange={(e) => setSimForm({ ...simForm, nombre: e.target.value })} /></Field>
            <Field label="Cantidad de preguntas" required htmlFor="sim-cantidad"><Input id="sim-cantidad" type="number" min="1" max="120" required value={simForm.cantidad} onChange={(e) => setSimForm({ ...simForm, cantidad: e.target.value })} /></Field>
            <Field label="Tiempo límite (minutos)" required htmlFor="sim-tiempo"><Input id="sim-tiempo" type="number" min="1" max="300" required value={simForm.tiempo} onChange={(e) => setSimForm({ ...simForm, tiempo: e.target.value })} /></Field>
            <div style={{ gridColumn: '1/-1' }}>
              <Button loading={cargando}>{simForm.id ? 'Guardar cambios' : 'Crear simulacro'}</Button>
              {simForm.id && <Button type="button" variant="ghost" onClick={() => setSimForm({ id: '', nombre: '', cantidad: 65, tiempo: 140 })}>Cancelar edición</Button>}
            </div>
          </form>
          <Table caption="Simulacros" head={[{ label: 'ID' }, { label: 'Nombre' }, { label: 'Preguntas', align: 'right' }, { label: 'Tiempo', align: 'right' }, { label: 'Compuestas', align: 'right' }, { label: 'Creado' }, { label: 'Acciones' }]}>
            {simulacros.map((s) => (
              <tr key={s.id_simulacro}>
                <td>{s.id_simulacro}</td><td>{s.nombre}</td><td style={{ textAlign: 'right' }}>{s.cantidad_preguntas}</td><td style={{ textAlign: 'right' }}>{s.tiempo_limite_minutos} min</td><td style={{ textAlign: 'right' }}>{s.preguntas}</td><td>{new Date(s.fecha_creacion).toLocaleDateString('es-CL')}</td>
                <td>
                  <Button size="sm" variant="outline" onClick={() => setSimForm({ id: s.id_simulacro, nombre: s.nombre, cantidad: s.cantidad_preguntas, tiempo: s.tiempo_limite_minutos })}>Parametrizar</Button>
                  <Button size="sm" variant="secondary" onClick={() => abrirComp(s)}>Componer</Button>
                </td>
              </tr>
            ))}
          </Table>

          {comp && (
            <section className="stack">
              <h3>Composición de «{comp.simulacro.nombre}» — {comp.simulacro.cantidad_preguntas} preguntas / {comp.simulacro.tiempo_limite_minutos} min</h3>
              <div className="grid-auto" style={{ '--min': '300px' }}>
                <div>
                  <h4>Ejercicios disponibles</h4>
                  <ul className="stack" style={{ '--gap': 'var(--sp-1)' }}>
                    {comp.banco.filter((e) => !comp.orden.includes(e.id_ejercicio)).map((e) => (
                      <li key={e.id_ejercicio} className="row" style={{ justifyContent: 'space-between' }}>
                        <span>{textoEjercicio(e.id_ejercicio)}</span>
                        <Button size="sm" variant="outline" onClick={() => comp.orden.length < comp.simulacro.cantidad_preguntas && setComp({ ...comp, orden: [...comp.orden, e.id_ejercicio] })}>+</Button>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4>Composición del simulacro (en orden)</h4>
                  <ul className="stack" style={{ '--gap': 'var(--sp-1)' }}>
                    {comp.orden.map((id, i) => (
                      <li key={id} className="row" style={{ justifyContent: 'space-between' }}>
                        <span>{i + 1}. {textoEjercicio(id)}</span>
                        <span>
                          <Button size="sm" variant="ghost" disabled={i === 0} onClick={() => { const o = [...comp.orden]; [o[i - 1], o[i]] = [o[i], o[i - 1]]; setComp({ ...comp, orden: o }) }}>↑</Button>
                          <Button size="sm" variant="ghost" disabled={i === comp.orden.length - 1} onClick={() => { const o = [...comp.orden]; [o[i + 1], o[i]] = [o[i], o[i + 1]]; setComp({ ...comp, orden: o }) }}>↓</Button>
                          <Button size="sm" variant="danger" onClick={() => setComp({ ...comp, orden: comp.orden.filter((x) => x !== id) })}>✕</Button>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <div className="row">
                <Button onClick={guardarComp}>Guardar composición</Button>
                <Button variant="ghost" onClick={() => setComp(null)}>Cerrar</Button>
              </div>
            </section>
          )}
        </section>
      )}

      {tab === 'metricas' && (
        <section className="stack">
          <h2>Métricas globales de la plataforma</h2>
          <p className="text-faint">Indicadores agregados de concurrencia y actividad (CP-20).</p>
          <div className="grid-auto" style={{ '--min': '160px' }}>
            {metricas && [
              ['Usuarios totales', metricas.concurrencia.usuarios], ['Usuarios activos', metricas.concurrencia.usuarios_activos],
              ['Sedes', metricas.concurrencia.instituciones], ['Sedes activas', metricas.concurrencia.institucionesActivas],
              ['Prácticas', metricas.actividad.practicas], ['Simulacros', metricas.actividad.simulacros],
              ['Puntaje promedio', metricas.actividad.puntaje_promedio], ['Respuestas', metricas.actividad.respuestas],
              ['Actividad hoy', metricas.actividad.practicas_hoy],
            ].map(([k, v]) => (
              <Card key={k} variant="raised"><p className="text-faint" style={{ fontSize: 'var(--fs-sm)' }}>{k}</p><p style={{ fontSize: 'var(--fs-2xl)', fontFamily: 'var(--font-display)', fontWeight: 700 }}>{v}</p></Card>
            ))}
          </div>
          <h3>Usuarios por rol</h3>
          <Table caption="Usuarios por rol" head={[{ label: 'Rol' }, { label: 'Usuarios', align: 'right' }, { label: 'Activos', align: 'right' }]}>
            {metricas?.concurrencia.porRol.map((f) => (
              <tr key={f.rol}><td>{f.rol}</td><td style={{ textAlign: 'right' }}>{f.total}</td><td style={{ textAlign: 'right' }}>{f.activos}</td></tr>
            ))}
          </Table>
          <h3>Últimos 7 días</h3>
          <Table caption="Actividad últimos 7 días" head={[{ label: 'Fecha' }, { label: 'Prácticas', align: 'right' }, { label: 'Simulacros', align: 'right' }]}>
            {metricas?.serie.map((d) => (
              <tr key={d.fecha}><td>{new Date(`${d.fecha}T00:00:00`).toLocaleDateString('es-CL')}</td><td style={{ textAlign: 'right' }}>{d.practicas}</td><td style={{ textAlign: 'right' }}>{d.simulacros}</td></tr>
            ))}
          </Table>
        </section>
      )}
    </div>
  )
}
