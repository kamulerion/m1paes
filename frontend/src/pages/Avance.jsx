import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Badge from '../components/ui/Badge.jsx'
import Card from '../components/ui/Card.jsx'
import Table from '../components/ui/Table.jsx'
import Alert from '../components/ui/Alert.jsx'
import { ProgressBar } from '../components/ui/Progress.jsx'
import { Spinner } from '../components/ui/Feedback.jsx'
import { api, obtenerSesion } from '../api.js'

const EJE_MAP = { 'Números': 'numeros', 'Álgebra y Funciones': 'algebra', 'Geometría': 'geometria', 'Probabilidad y Estadística': 'probabilidad' }

export default function Avance() {
  const [datos, setDatos] = useState(null)
  const [calendario, setCalendario] = useState([])
  const [mensaje, setMensaje] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    obtenerSesion().then((u) => {
      if (!u) return navigate('/login?redirigir=%2Favance')
      if (u.rol !== 'ESTUDIANTE') return navigate('/')
      api.get('/api/progreso').then(setDatos).catch((e) => setMensaje(`No fue posible cargar tu avance: ${e.message}`))
      api.get('/api/calendario').then((c) => setCalendario(c.eventos)).catch(() => {})
    })
  }, [navigate])

  if (!datos && !mensaje) return <Spinner />

  return (
    <div className="stack">
      <h1>Mi avance</h1>
      {mensaje && <Alert variant="error">{mensaje}</Alert>}

      {datos && (
        <>
          <section>
            <h2>Resumen</h2>
            <div className="grid-auto" style={{ '--min': '180px' }}>
              {[['Prácticas', datos.resumen.practicas], ['Simulacros', datos.resumen.simulacros], ['Mejor puntaje', datos.resumen.mejor_puntaje], ['Promedio', datos.resumen.promedio_puntaje]].map(([k, v]) => (
                <Card key={k} variant="raised"><p className="text-faint" style={{ fontSize: 'var(--fs-sm)' }}>{k}</p><p style={{ fontSize: 'var(--fs-2xl)', fontFamily: 'var(--font-display)', fontWeight: 700 }}>{v}</p></Card>
              ))}
            </div>
            <p className="text-muted" style={{ marginTop: 'var(--sp-4)' }}>Progreso global: <strong style={{ color: 'var(--primary)' }}>{datos.global} %</strong></p>
          </section>

          <section>
            <h2>Porcentaje por eje temático</h2>
            <Card variant="raised">
              <div className="stack" style={{ '--gap': 'var(--sp-4)' }}>
                {datos.ejes.map((eje) => (
                  <ProgressBar key={eje.nombre} value={eje.porcentaje} label={eje.nombre} eje={EJE_MAP[eje.nombre]} />
                ))}
              </div>
            </Card>
            {datos.resumen.practicas === 0 && datos.resumen.simulacros === 0 && (
              <p className="text-faint" style={{ marginTop: 'var(--sp-3)' }}>Aún no registras actividad: resuelve ejercicios para ver tu progreso.</p>
            )}
          </section>

          <section>
            <h2>Historial reciente</h2>
            <Table caption="Historial de actividades" head={[{ label: 'Fecha' }, { label: 'Actividad' }, { label: 'Puntaje', align: 'right' }, { label: 'Duración', align: 'right' }]}>
              {datos.historial.length === 0 ? (
                <tr><td colSpan="4" style={{ textAlign: 'center', color: 'var(--ink-faint)' }}>Todavía no hay movimientos registrados.</td></tr>
              ) : datos.historial.map((h, i) => (
                <tr key={i}>
                  <td>{new Date(h.fecha_realizacion).toLocaleDateString('es-CL')}</td>
                  <td>{h.tipo_actividad === 'SIMULACRO_OFICIAL' ? `Simulacro: ${h.simulacro ?? '—'}` : 'Práctica de lección'}</td>
                  <td style={{ textAlign: 'right' }}>{h.tipo_actividad === 'SIMULACRO_OFICIAL' ? h.puntaje_obtenido : '—'}</td>
                  <td style={{ textAlign: 'right' }}>{h.duracion_minutos} min</td>
                </tr>
              ))}
            </Table>
          </section>
        </>
      )}

      <section>
        <h2>Próximos ensayos de tu sede</h2>
        <Table caption="Calendario de ensayos de la sede" head={[{ label: 'Fecha' }, { label: 'Ensayo' }, { label: 'Descripción' }]}>
          {calendario.length === 0 ? (
            <tr><td colSpan="3" style={{ textAlign: 'center', color: 'var(--ink-faint)' }}>Tu sede aún no ha publicado ensayos en el calendario.</td></tr>
          ) : calendario.map((ev, i) => (
            <tr key={i}>
              <td>{new Date(ev.fecha_evento).toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' })}</td>
              <td>{ev.titulo}</td>
              <td>{ev.descripcion ?? '—'}</td>
            </tr>
          ))}
        </Table>
      </section>
    </div>
  )
}
