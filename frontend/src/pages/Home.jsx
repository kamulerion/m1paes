import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Card, { CardHeader } from '../components/ui/Card.jsx'
import Badge from '../components/ui/Badge.jsx'
import { obtenerSesion } from '../api.js'
import styles from './Home.module.css'

const EJES = [
  {
    eje: 'numeros',
    titulo: 'Números',
    descripcion: 'Operaciones, razones, proporciones, porcentajes, potencias y raíces.',
  },
  {
    eje: 'algebra',
    titulo: 'Álgebra y Funciones',
    descripcion: 'Expresiones, ecuaciones, sistemas y relaciones entre variables.',
  },
  {
    eje: 'geometria',
    titulo: 'Geometría',
    descripcion: 'Figuras, perímetros, áreas, transformaciones y trigonometría básica.',
  },
  {
    eje: 'probabilidad',
    titulo: 'Probabilidad y Estadística',
    descripcion: 'Datos, medidas estadísticas, probabilidad y combinatoria.',
  },
]

const DESTINO_ROL = {
  ESTUDIANTE: { to: '/contenido', texto: 'Ir a estudiar' },
  ADMIN_INSTITUCION: { to: '/institucion', texto: 'Abrir mi sede' },
  SUPERADMIN: { to: '/admin', texto: 'Administrar plataforma' },
}

export default function Home() {
  const [usuario, setUsuario] = useState(null)

  useEffect(() => {
    let activa = true
    obtenerSesion()
      .then((sesion) => { if (activa) setUsuario(sesion) })
      .catch(() => { if (activa) setUsuario(null) })
    return () => { activa = false }
  }, [])

  const accionPrincipal = usuario
    ? DESTINO_ROL[usuario.rol] ?? { to: '/perfil', texto: 'Ir a mi perfil' }
    : { to: '/registro', texto: 'Crear cuenta gratis' }

  return (
    <div className={`container ${styles.page}`}>
      <section className={styles.hero} aria-labelledby="inicio-titulo">
        <div className={styles.heroCopy}>
          <Badge variant="accent">PAES · Competencia Matemática 1</Badge>
          <h1 id="inicio-titulo">
            Prepárate para la PAES M1 <span className="highlight">paso a paso</span>
          </h1>
          <p className={styles.lead}>
            Organiza tu estudio por eje temático, practica con propósito y construye confianza
            para el día de la prueba.
          </p>
          <div className={styles.actions}>
            <Link className={styles.primaryAction} to={accionPrincipal.to}>
              {accionPrincipal.texto}<span aria-hidden="true">→</span>
            </Link>
            {!usuario && <Link className={styles.secondaryAction} to="/login">Ya tengo cuenta</Link>}
            {usuario?.rol === 'ESTUDIANTE' && <Link className={styles.secondaryAction} to="/avance">Ver mi avance</Link>}
          </div>
          <p className={styles.note}>Un espacio de estudio claro, enfocado en los contenidos de M1.</p>
        </div>

        <div className={styles.heroCard} aria-label="Ejemplo de contenidos de matemática M1">
          <div className={styles.heroCardTop}>
            <span>COMPETENCIA MATEMÁTICA 1</span>
            <span className={styles.mathMark}>M1</span>
          </div>
          <div className={styles.formula} aria-hidden="true">f(x) = 2x + 3</div>
          <div className={styles.formulaSmall} aria-hidden="true">Si x = 4, entonces f(x) = 11</div>
          <div className={styles.heroCardBottom}>
            <span>Comprender</span><span>Practicar</span><span>Avanzar</span>
          </div>
        </div>
      </section>

      <section className={styles.axes} aria-labelledby="ejes-titulo">
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.eyebrow}>TU RUTA DE ESTUDIO</p>
            <h2 id="ejes-titulo">Cuatro ejes, una preparación completa</h2>
          </div>
          <p>Explora los temas que forman la Competencia Matemática 1.</p>
        </div>
        <div className={styles.axisGrid}>
          {EJES.map((eje, index) => (
            <Card key={eje.eje} variant="raised" eje={eje.eje} className={styles.axisCard}>
              <CardHeader
                icon={<span className={styles.axisNumber}>{String(index + 1).padStart(2, '0')}</span>}
                title={eje.titulo}
              />
              <p>{eje.descripcion}</p>
            </Card>
          ))}
        </div>
        <p className={styles.contentNote}>
          Las lecciones y ejercicios se irán habilitando a medida que se publiquen en la plataforma.
        </p>
      </section>

      <section className={styles.nextStep} aria-label="Comienza tu preparación">
        <div>
          <h2>Empieza a prepararte hoy</h2>
          <p>Crea tu cuenta para acceder a tu espacio de estudio y guardar tu avance.</p>
        </div>
        <Link className={styles.secondaryAction} to={usuario ? accionPrincipal.to : '/registro'}>
          {usuario ? accionPrincipal.texto : 'Crear cuenta'}<span aria-hidden="true">→</span>
        </Link>
      </section>
    </div>
  )
}
