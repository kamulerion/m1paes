import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Badge from '../components/ui/Badge.jsx'
import Table from '../components/ui/Table.jsx'
import Button from '../components/ui/Button.jsx'
import Alert from '../components/ui/Alert.jsx'
import { Spinner } from '../components/ui/Feedback.jsx'
import { api, obtenerSesion } from '../api.js'

export default function Simulacro() {
  const [fase, setFase] = useState('lista')
  const [simulacros, setSimulacros] = useState(null)
  const [estado, setEstado] = useState(null)
  const [resultado, setResultado] = useState(null)
  const [restante, setRestante] = useState(null)
  const [aviso, setAviso] = useState(null)
  const [mensaje, setMensaje] = useState(null)
  const navigate = useNavigate()
  const estadoRef = useRef(null)
  estadoRef.current = estado

  useEffect(() => {
    obtenerSesion().then((u) => {
      if (!u) return navigate('/login?redirigir=%2Fsimulacro')
      if (u.rol !== 'ESTUDIANTE') return navigate('/')
      cargarLista()
    })
  }, [navigate])

  async function cargarLista() {
    try {
      const { simulacros } = await api.get('/api/simulacros')
      setSimulacros(simulacros)
      setFase('lista')
    } catch (e) { setMensaje(e.message) }
  }

  // cronómetro
  useEffect(() => {
    if (fase !== 'rinden' || !estado) return
    const t = setInterval(() => {
      const e = estadoRef.current
      if (!e) return
      const transcurridos = Math.floor((Date.now() - e.inicio) / 1000)
      const rest = e.tiempoLimite * 60 - transcurridos
      if (rest <= 0) { finalizar('Se acabó el tiempo asignado.'); return }
      setRestante(rest)
    }, 1000)
    return () => clearInterval(t)
  }, [fase, estado?.idIntento])

  async function rendir(id) {
    try {
      const datos = await api.post(`/api/simulacros/${id}/intentar`)
      setEstado({
        idIntento: datos.intento.id,
        preguntas: datos.preguntas,
        actual: 0,
        tiempoLimite: datos.simulacro.tiempoLimiteMinutos,
        inicio: Date.now(),
        respuestas: new Map(),
        cola: Promise.resolve(),
        nombre: datos.simulacro.nombre,
      })
      setRestante(datos.simulacro.tiempoLimiteMinutos * 60)
      setFase('rinden')
    } catch (e) { setMensaje(e.message) }
  }

  function responderPregunta(idAlternativa) {
    const e = estadoRef.current
    const pregunta = e.preguntas[e.actual]
    const nuevas = new Map(e.respuestas)
    nuevas.set(pregunta.idEjercicio, idAlternativa)
    setEstado({ ...e, respuestas: nuevas })
    setAviso('Respuesta guardada ✓')
    e.cola = e.cola.then(() =>
      api.put(`/api/simulacros/intentos/${e.idIntento}/respuestas`, { id_ejercicio: pregunta.idEjercicio, id_alternativa: idAlternativa })
        .catch((error) => setAviso(error.message))
    )
  }

  async function finalizar(textoAviso) {
    const e = estadoRef.current
    if (!e) return
    const duracion = Math.min(e.tiempoLimite, Math.max(0, Math.floor((Date.now() - e.inicio) / 60000)))
    try {
      await e.cola.catch(() => {})
      const datos = await api.post(`/api/simulacros/intentos/${e.idIntento}/finalizar`, { duracion_minutos: duracion })
      setResultado({ ...datos.resultado, detalle: datos.detalle })
      setEstado(null)
      setFase('resultado')
      if (textoAviso) setMensaje(textoAviso)
    } catch (error) {
      setMensaje(`No fue posible finalizar: ${error.message}`)
      setFase('lista')
      setEstado(null)
    }
  }

  if (!simulacros && fase === 'lista') return <Spinner />

  return (
    <div className="stack">
      <h1>Simulacros oficiales</h1>
      {mensaje && <Alert variant="info">{mensaje}</Alert>}

      {fase === 'lista' && (
        <>
          <Table caption="Simulacros disponibles" head={[{ label: 'Nombre' }, { label: 'Preguntas', align: 'right' }, { label: 'Compuestas', align: 'right' }, { label: 'Tiempo', align: 'right' }, { label: '' }]}>
            {(simulacros ?? []).map((s) => (
              <tr key={s.id_simulacro}>
                <td>{s.nombre}</td>
                <td style={{ textAlign: 'right' }}>{s.cantidad_preguntas}</td>
                <td style={{ textAlign: 'right' }}>{s.preguntas}</td>
                <td style={{ textAlign: 'right' }}>{s.tiempo_limite_minutos} min</td>
                <td>{s.preguntas > 0 ? <Button size="sm" onClick={() => rendir(s.id_simulacro)}>Rendir</Button> : <span className="text-faint">Sin preguntas compuestas</span>}</td>
              </tr>
            ))}
          </Table>
          <p className="text-faint">Formato oficial: 65 preguntas · 140 minutos · puntaje 100 a 1000.</p>
        </>
      )}

      {fase === 'rinden' && estado && (
        <section className="stack">
          <div className="row" style={{ justifyContent: 'space-between', background: 'var(--ink)', color: 'var(--paper)', borderRadius: 'var(--radius)', padding: 'var(--sp-3) var(--sp-5)' }}>
            <strong>{estado.nombre}</strong>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'var(--fs-xl)' }}>{restante !== null ? `${String(Math.floor(restante / 60)).padStart(2, '0')}:${String(restante % 60).padStart(2, '0')}` : '--:--'}</span>
          </div>
          <p className="text-faint">Pregunta {estado.preguntas[estado.actual].numero} de {estado.preguntas.length}</p>
          <h2>{estado.preguntas[estado.actual].enunciado}</h2>
          <div className="stack">
            {estado.preguntas[estado.actual].alternativas.map((alt) => (
              <label key={alt.id} className="alt-option">
                <input type="radio" name="alternativa" value={alt.id} checked={estado.respuestas.get(estado.preguntas[estado.actual].idEjercicio) === alt.id} onChange={() => responderPregunta(alt.id)} />
                {alt.texto}
              </label>
            ))}
          </div>
          {aviso && <Alert variant="success">{aviso}</Alert>}
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <Button variant="outline" disabled={estado.actual === 0} onClick={() => setEstado({ ...estado, actual: estado.actual - 1 })}>← Anterior</Button>
            <Button onClick={() => finalizar()}>Finalizar simulacro</Button>
            <Button variant="outline" disabled={estado.actual === estado.preguntas.length - 1} onClick={() => setEstado({ ...estado, actual: estado.actual + 1 })}>Siguiente →</Button>
          </div>
        </section>
      )}

      {fase === 'resultado' && resultado && (
        <section className="stack">
          <h2>Resultado del simulacro</h2>
          <p style={{ fontSize: 'var(--fs-4xl)', fontFamily: 'var(--font-display)', fontWeight: 800 }}>{resultado.puntaje}</p>
          <p className="text-muted">{resultado.correctas}/{resultado.total} aciertos · {resultado.respondidas} respondidas · {resultado.duracionMinutos} minutos</p>
          <h3>Revisión por pregunta</h3>
          <ul className="stack" style={{ '--gap': 'var(--sp-1)' }}>
            {resultado.detalle.map((d) => (
              <li key={d.numero}>{d.esCorrecta === null ? '—' : d.esCorrecta ? '✓' : '✗'} Pregunta {d.numero}</li>
            ))}
          </ul>
          <Button onClick={cargarLista}>Volver a simulacros</Button>
        </section>
      )}
    </div>
  )
}
