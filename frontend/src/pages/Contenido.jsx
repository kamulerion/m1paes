import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Badge from '../components/ui/Badge.jsx'
import Card, { CardHeader } from '../components/ui/Card.jsx'
import Button from '../components/ui/Button.jsx'
import Alert from '../components/ui/Alert.jsx'
import { Spinner } from '../components/ui/Feedback.jsx'
import VideoPlayer from '../components/VideoPlayer.jsx'
import { api, obtenerSesion } from '../api.js'

const EJE_MAP = { 'Números': 'numeros', 'Álgebra y Funciones': 'algebra', 'Geometría': 'geometria', 'Probabilidad y Estadística': 'probabilidad' }

export default function Contenido() {
  const [ejes, setEjes] = useState(null)
  const [leccion, setLeccion] = useState(null)
  const [mensaje, setMensaje] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    obtenerSesion().then((u) => {
      if (!u) return navigate('/login?redirigir=%2Fcontenido')
      if (u.rol !== 'ESTUDIANTE') return navigate('/')
      api.get('/api/ejes').then((d) => setEjes(d.ejes)).catch((e) => setMensaje(e.message))
    })
  }, [navigate])

  async function abrirLeccion(id, eje) {
    setMensaje(null)
    try {
      const d = await api.get(`/api/contenido/lecciones/${id}`)
      setLeccion({ ...d.leccion, ejercicios: d.ejercicios, eje })
    } catch (e) { setMensaje(e.message) }
  }

  if (!ejes && !mensaje) return <Spinner />

  return (
    <div className="stack">
      <h1>Contenidos por eje temático</h1>
      {mensaje && <Alert variant="error">{mensaje}</Alert>}

      {!leccion ? (
        <div className="grid-auto" style={{ '--min': '260px' }}>
          {(ejes ?? []).map((e) => (
            <Card key={e.id} variant="pop" eje={EJE_MAP[e.nombre]}>
              <CardHeader title={e.nombre} subtitle={e.descripcion} />
              <div className="stack" style={{ '--gap': 'var(--sp-1)' }}>
                {e.lecciones.length === 0 && <p className="text-faint">Sin lecciones publicadas.</p>}
                {e.lecciones.map((l) => (
                  <Button key={l.id} variant="ghost" onClick={() => abrirLeccion(l.id, e.nombre)}>{l.titulo}</Button>
                ))}
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="stack">
          <Button variant="outline" onClick={() => setLeccion(null)}>← Volver a los ejes</Button>
          <h2>{leccion.titulo}</h2>
          <p><Badge eje={EJE_MAP[leccion.eje]}>{leccion.eje}</Badge></p>
          <Card variant="flat"><p style={{ whiteSpace: 'pre-wrap', color: 'var(--ink)' }}>{leccion.cuerpo_teoria}</p></Card>
          {leccion.url_video && <VideoPlayer url={leccion.url_video} />}
          <h3>Ejercicios de práctica</h3>
          {leccion.ejercicios.length === 0 && <p className="text-faint">Esta lección aún no tiene ejercicios publicados.</p>}
          <ul className="stack" style={{ '--gap': 'var(--sp-2)' }}>
            {leccion.ejercicios.map((ej) => (
              <li key={ej.id_ejercicio} className="row" style={{ justifyContent: 'space-between', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--radius)', padding: 'var(--sp-3) var(--sp-4)' }}>
                <span>{ej.enunciado} <Badge variant="neutral">{ej.dificultad}</Badge></span>
                <Button size="sm" variant="outline" onClick={() => navigate(`/ejercicios?ejercicio=${ej.id_ejercicio}`)}>Practicar</Button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
