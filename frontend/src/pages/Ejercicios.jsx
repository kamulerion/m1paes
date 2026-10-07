import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Badge from '../components/ui/Badge.jsx'
import Button from '../components/ui/Button.jsx'
import Alert from '../components/ui/Alert.jsx'
import Field, { Select } from '../components/ui/Input.jsx'
import { ProgressBar } from '../components/ui/Progress.jsx'
import { Spinner } from '../components/ui/Feedback.jsx'
import { api, obtenerSesion } from '../api.js'

export default function Ejercicios() {
  const [lecciones, setLecciones] = useState([])
  const [selLeccion, setSelLeccion] = useState('')
  const [ejercicios, setEjercicios] = useState([])
  const [enCurso, setEnCurso] = useState(null)
  const [eleccion, setEleccion] = useState(null)
  const [retro, setRetro] = useState(null)
  const [progreso, setProgreso] = useState(null)
  const [mensaje, setMensaje] = useState(null)
  const navigate = useNavigate()
  const [params] = useSearchParams()

  useEffect(() => {
    obtenerSesion().then((u) => {
      if (!u) return navigate('/login?redirigir=%2Fejercicios')
      if (u.rol !== 'ESTUDIANTE') return navigate('/')
      api.get('/api/ejes')
        .then(({ ejes }) => {
          const lista = ejes.flatMap((e) => e.lecciones.map((l) => ({ ...l, eje: e.nombre })))
          setLecciones(lista)
          const directo = Number(params.get('ejercicio'))
          if (directo) abrirEjercicio(directo)
          else if (lista.length > 0) { setSelLeccion(String(lista[0].id)); cargarEjercicios(lista[0].id) }
        })
        .catch((e) => setMensaje(e.message))
    })
  }, [navigate])

  async function cargarEjercicios(idLeccion) {
    try {
      const d = await api.get(`/api/contenido/lecciones/${idLeccion}`)
      setEjercicios(d.ejercicios)
    } catch (e) { setMensaje(e.message) }
  }

  async function abrirEjercicio(id) {
    try {
      const { ejercicio } = await api.get(`/api/practica/ejercicios/${id}`)
      setEnCurso(ejercicio)
      setEleccion(null)
      setRetro(null)
      setProgreso(null)
    } catch (e) { setMensaje(e.message) }
  }

  async function responder() {
    if (!eleccion) return setRetro({ tipo: 'error', texto: 'Selecciona una alternativa antes de responder.' })
    try {
      const res = await api.post(`/api/practica/ejercicios/${enCurso.id_ejercicio}/respuesta`, { id_alternativa: Number(eleccion) })
      const texto = res.esCorrecta
        ? `${res.mensaje} ${res.explicacion}`
        : `${res.mensaje} Solución paso a paso: ${res.explicacion}` + (res.alternativaCorrecta ? ` — Respuesta correcta: ${res.alternativaCorrecta.texto}.` : '')
      setRetro({ tipo: res.esCorrecta ? 'success' : 'error', texto })
      setProgreso(res.progreso.porcentaje)
    } catch (e) { setRetro({ tipo: 'error', texto: e.message }) }
  }

  if (lecciones.length === 0 && !mensaje) return <Spinner />

  return (
    <div className="stack">
      <h1>Práctica de ejercicios</h1>
      {mensaje && <Alert variant="error">{mensaje}</Alert>}

      {!enCurso ? (
        <>
          <Field label="Elige una lección" htmlFor="sel-leccion">
            <Select id="sel-leccion" value={selLeccion} onChange={(e) => { setSelLeccion(e.target.value); cargarEjercicios(Number(e.target.value)) }}>
              {lecciones.map((l) => <option key={l.id} value={l.id}>{l.eje} — {l.titulo}</option>)}
            </Select>
          </Field>
          <h2>Ejercicios disponibles</h2>
          {ejercicios.length === 0 && <p className="text-faint">La lección elegida aún no tiene ejercicios publicados.</p>}
          <ul className="stack" style={{ '--gap': 'var(--sp-2)' }}>
            {ejercicios.map((ej) => (
              <li key={ej.id_ejercicio} className="row" style={{ justifyContent: 'space-between', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--radius)', padding: 'var(--sp-3) var(--sp-4)' }}>
                <span>{ej.enunciado} <Badge variant="neutral">{ej.dificultad}</Badge></span>
                <Button size="sm" onClick={() => abrirEjercicio(ej.id_ejercicio)}>Resolver</Button>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <div className="stack">
          <Button variant="outline" onClick={() => setEnCurso(null)}>← Elegir otro ejercicio</Button>
          <p className="text-faint">Dificultad: {enCurso.dificultad}</p>
          <h2>{enCurso.enunciado}</h2>
          <div className="stack">
            {enCurso.alternativas.map((alt) => (
              <label key={alt.id_alternativa} className="alt-option">
                <input type="radio" name="alternativa" value={alt.id_alternativa} checked={String(eleccion) === String(alt.id_alternativa)} onChange={(e) => setEleccion(e.target.value)} />
                {alt.texto}
              </label>
            ))}
          </div>
          <Button onClick={responder} disabled={retro?.tipo === 'success'}>Responder</Button>
          {retro && <Alert variant={retro.tipo}>{retro.texto}</Alert>}
          {progreso !== null && <ProgressBar value={progreso} label="Progreso de la lección" />}
        </div>
      )}
    </div>
  )
}
