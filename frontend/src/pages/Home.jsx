import { useEffect, useState } from 'react'
import Card from '../components/ui/Card.jsx'
import Badge from '../components/ui/Badge.jsx'
import { api, obtenerSesion } from '../api.js'

export default function Home() {
  const [estadoApi, setEstadoApi] = useState('Verificando conexión con la API…')
  const [estadoSesion, setEstadoSesion] = useState('Verificando sesión…')

  useEffect(() => {
    api.get('/api/health')
      .then((d) => setEstadoApi(`API: ${d.status} · versión ${d.version} · entorno ${d.environment}\nTiempo activo: ${d.uptimeSec}s\nActualizado: ${d.timestamp}`))
      .catch((e) => setEstadoApi(`No fue posible contactar a la API: ${e.message}`))
    obtenerSesion()
      .then((u) => setEstadoSesion(u ? `Sesión iniciada como ${u.nombre} (${u.rol}).` : 'No has iniciado sesión. Crea una cuenta gratis para guardar tu avance.'))
      .catch((e) => setEstadoSesion(`No fue posible verificar la sesión: ${e.message}`))
  }, [])

  return (
    <div className="container stack" style={{ paddingBlock: 'var(--sp-7)', gap: 'var(--sp-6)' }}>
      <section className="stack">
        <h1 style={{ fontSize: 'var(--fs-4xl)' }}>Prepara tu PAES de <span className="highlight">Competencia Matemática 1</span></h1>
        <p style={{ maxWidth: '60ch', fontSize: 'var(--fs-lg)' }}>
          Plataforma de estudio con contenidos por eje temático (Números, Álgebra y Funciones,
          Geometría, Probabilidad y Estadística), ejercicios interactivos con retroalimentación
          y simulacros cronometrados tipo DEMRE.
        </p>
        <p><Badge variant="accent">MVP en construcción — Fase 5 (publicidad Free + pulido)</Badge></p>
      </section>

      <section>
        <h2>Estado de la API</h2>
        <Card variant="flat" className="stack">
          <p className="text-muted" style={{ fontFamily: 'ui-monospace, monospace', fontSize: 'var(--fs-sm)', whiteSpace: 'pre-wrap' }}>{estadoApi}</p>
        </Card>
      </section>

      <section>
        <h2>Tu sesión</h2>
        <Card variant="flat"><p className="text-muted">{estadoSesion}</p></Card>
      </section>

      <section>
        <h2>Tus ejes temáticos</h2>
        <div className="grid-auto" style={{ '--min': '200px' }}>
          <Card variant="pop" eje="numeros" interactive><p><strong>Números</strong></p><p className="text-faint">Avance 72%</p></Card>
          <Card variant="pop" eje="algebra" interactive><p><strong>Álgebra y Funciones</strong></p><p className="text-faint">Avance 48%</p></Card>
          <Card variant="pop" eje="geometria" interactive><p><strong>Geometría</strong></p><p className="text-faint">Avance 35%</p></Card>
          <Card variant="pop" eje="probabilidad" interactive><p><strong>Probabilidad y Estadística</strong></p><p className="text-faint">Avance 60%</p></Card>
        </div>
      </section>
    </div>
  )
}
