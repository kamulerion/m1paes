import { useState } from 'react'
import katex from 'katex'
import styles from './StyleGuide.module.css'
import Card, { CardHeader } from '../../components/ui/Card.jsx'
import Button from '../../components/ui/Button.jsx'
import Badge from '../../components/ui/Badge.jsx'
import Alert from '../../components/ui/Alert.jsx'
import Table from '../../components/ui/Table.jsx'
import Modal from '../../components/ui/Modal.jsx'
import Field, { Input, Select, Textarea } from '../../components/ui/Input.jsx'
import { ProgressBar, ProgressRing } from '../../components/ui/Progress.jsx'
import { Spinner, EmptyState } from '../../components/ui/Feedback.jsx'
import Logo from '../../components/ui/Logo.jsx'

function Tex({ children, block }) {
  const html = katex.renderToString(children, { throwOnError: false, displayMode: block })
  return <span dangerouslySetInnerHTML={{ __html: html }} />
}

const EJES = [
  { eje: 'numeros', titulo: 'Números', desc: 'Enteros, racionales, porcentajes, potencias y raíces.', avance: 72 },
  { eje: 'algebra', titulo: 'Álgebra y Funciones', desc: 'Expresiones algebraicas, ecuaciones, sistemas y funciones.', avance: 48 },
  { eje: 'geometria', titulo: 'Geometría', desc: 'Figuras planas y 3D, transformaciones, Pitágoras y semejanza.', avance: 35 },
  { eje: 'probabilidad', titulo: 'Probabilidad y Estadística', desc: 'Tablas, gráficos, medidas de tendencia central y probabilidad.', avance: 60 },
]

export default function StyleGuide() {
  const [modal, setModal] = useState(false)
  return (
    <main className={`container ${styles.page}`}>
      <header className={`${styles.hero} animate-in`}>
        <Logo />
        <h1>Guía de estilos <span className="highlight">M1PAES</span></h1>
        <p>Etapa 1: sistema de diseño base. Fondo de grilla animada, paleta por eje temático, tipografías y componentes reutilizables.</p>
      </header>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}><span className="highlight">Tipografía</span></h2>
        <Card variant="raised"><div className="stack">
          <h1>Título H1 · Poppins</h1>
          <h2>Título H2 · Prepárate para la PAES M1</h2>
          <h3>Título H3 · Ejes temáticos</h3>
          <h4>Título H4 · Lección 3</h4>
          <p>Párrafo en Inter. La prueba de Competencia Matemática 1 evalúa 65 preguntas en 2 horas y 20 minutos, a través de las habilidades de resolver problemas, modelar, representar y argumentar.</p>
          <p className="text-faint">Texto secundario tenue para metadatos.</p>
        </div></Card>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}><span className="highlight">Paleta</span></h2>
        <div className={styles.swatches}>
          {[['Papel', '--paper', 'var(--paper)'], ['Tinta', '--ink', 'var(--ink)'], ['Tinta suave', '--ink-soft', 'var(--ink-soft)'], ['Primario', '--primary', 'var(--primary)'], ['Acento', '--accent', 'var(--accent)'], ['Éxito', '--success', 'var(--success)'], ['Error', '--error', 'var(--error)'], ['Advertencia', '--warning', 'var(--warning)']].map(([n, v, c]) => (
            <div key={v} className={styles.swatch}><span className={styles.swatchColor} style={{ background: c }}></span><strong>{n}</strong><code>{v}</code></div>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}><span className="highlight">Ejes temáticos</span></h2>
        <div className="grid-auto" style={{ '--min': '250px' }}>
          {EJES.map((e) => (
            <Card key={e.eje} variant="pop" eje={e.eje} interactive>
              <CardHeader title={e.titulo} />
              <p className={styles.ejeDesc}>{e.desc}</p>
              <ProgressBar value={e.avance} eje={e.eje} />
            </Card>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}><span className="highlight">Botones</span></h2>
        <Card variant="raised"><div className="stack">
          <div className="row">
            <Button>Primario</Button>
            <Button variant="secondary">Secundario</Button>
            <Button variant="outline">Contorno</Button>
            <Button variant="ghost">Fantasma</Button>
            <Button variant="success">Éxito</Button>
            <Button variant="danger">Eliminar</Button>
          </div>
          <div className="row">
            <Button size="sm">Pequeño</Button>
            <Button>Mediano</Button>
            <Button size="lg">Grande</Button>
            <Button loading>Cargando</Button>
            <Button disabled>Deshabilitado</Button>
          </div>
        </div></Card>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}><span className="highlight">Formularios</span></h2>
        <Card variant="raised">
          <div className={styles.formGrid}>
            <Field label="Correo electrónico" required htmlFor="sg-correo"><Input id="sg-correo" type="email" placeholder="tu@correo.cl" required /></Field>
            <Field label="Contraseña" required hint="Mínimo 8 caracteres." htmlFor="sg-pass"><Input id="sg-pass" type="password" placeholder="********" required /></Field>
            <Field label="Buscar" htmlFor="sg-buscar"><Input id="sg-buscar" placeholder="Buscar lección." /></Field>
            <Field label="RUN" error="El dígito verificador no es válido." htmlFor="sg-run"><Input id="sg-run" placeholder="12.345.678-9" aria-invalid="true" /></Field>
            <Field label="Eje temático" htmlFor="sg-eje">
              <Select id="sg-eje"><option value="" disabled selected>Selecciona un eje</option><option>Números</option><option>Álgebra y Funciones</option><option>Geometría</option><option>Probabilidad y Estadística</option></Select>
            </Field>
            <Field label="Comentario" htmlFor="sg-coment"><Textarea id="sg-coment" placeholder="Escribe aquí." /></Field>
          </div>
        </Card>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}><span className="highlight">Etiquetas y progreso</span></h2>
        <Card variant="raised"><div className="stack" style={{ '--gap': 'var(--sp-5)' }}>
          <div className="row">
            <Badge>Neutral</Badge><Badge variant="info">Info</Badge><Badge variant="success">Correcta</Badge><Badge variant="warning">Pendiente</Badge><Badge variant="error">Incorrecta</Badge><Badge variant="accent">Free</Badge>
            <Badge eje="numeros">Números</Badge><Badge eje="algebra">Álgebra y Funciones</Badge><Badge eje="geometria">Geometría</Badge><Badge eje="probabilidad">Probabilidad y Estadística</Badge>
          </div>
          <div className="row" style={{ '--gap': 'var(--sp-6)' }}>
            <ProgressRing value={64} size={110} label="Avance general" />
            <ProgressRing value={72} eje="numeros" label="Números" />
            <ProgressRing value={48} eje="algebra" label="Álgebra y Funciones" />
            <ProgressRing value={35} eje="geometria" label="Geometría" />
            <ProgressRing value={60} eje="probabilidad" label="Probabilidad y Estadística" />
          </div>
        </div></Card>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}><span className="highlight">Alertas</span></h2>
        <div className="stack">
          <Alert variant="success" title="¡Respuesta correcta!">Muy bien, aplicaste correctamente la propiedad distributiva.</Alert>
          <Alert variant="error" title="Respuesta incorrecta">Revisa la solución paso a paso para entender el error.</Alert>
          <Alert variant="warning" title="Te quedan 10 minutos">Administra bien tu tiempo en el ensayo.</Alert>
          <Alert variant="info" onClose={() => {}}>Hay un nuevo ensayo programado por tu institución.</Alert>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}><span className="highlight">Fórmulas (KaTeX)</span></h2>
        <Card variant="pop" eje="algebra">
          <CardHeader title="Ecuación cuadrática" subtitle="Ejemplo de renderizado matemático" />
          <p>Para <Tex>{`ax^2 + bx + c = 0`}</Tex> con <Tex>{`a \\neq 0`}</Tex>, las soluciones son:</p>
          <Tex block>{`x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}`}</Tex>
          <p style={{ marginTop: 'var(--sp-4)' }}>Si una polera cuesta $12.990 y tiene un descuento del <Tex>{`15\\%`}</Tex>, se paga <Tex>{`12990 \\cdot 0{,}85`}</Tex>.</p>
        </Card>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}><span className="highlight">Tabla</span></h2>
        <Table caption="Historial de ensayos" head={[{ label: 'Ensayo' }, { label: 'Fecha' }, { label: 'Eje más débil' }, { label: 'Puntaje', align: 'right' }]}>
          <tr><td>Ensayo diagnóstico</td><td>12-08-2026</td><td><Badge eje="algebra">Álgebra y Funciones</Badge></td><td style={{ textAlign: 'right' }}><strong>612</strong></td></tr>
          <tr><td>Ensayo N°2</td><td>02-09-2026</td><td><Badge eje="geometria">Geometría</Badge></td><td style={{ textAlign: 'right' }}><strong>704</strong></td></tr>
          <tr><td>Ensayo N°3</td><td>28-09-2026</td><td><Badge eje="probabilidad">Probabilidad y Estadística</Badge></td><td style={{ textAlign: 'right' }}><strong>781</strong></td></tr>
        </Table>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}><span className="highlight">Modal, carga y estado vacío</span></h2>
        <div className="grid-auto" style={{ '--min': '280px' }}>
          <Card variant="raised">
            <CardHeader title="Diálogo modal" subtitle="Accesible con teclado (Esc, Tab)" />
            <Button variant="outline" onClick={() => setModal(true)}>Abrir modal</Button>
          </Card>
          <Card variant="raised">
            <CardHeader title="Cargando" />
            <Spinner />
          </Card>
          <EmptyState title="Aún no rindes ensayos" text="Cuando completes un ensayo, verás aquí tu puntaje y evolución." actionLabel="Rendir mi primer ensayo" />
        </div>
      </section>

      <Modal open={modal} onClose={() => setModal(false)} title="Confirmar ensayo" description="¿Estás listo para comenzar el ensayo cronometrado?" footer={<><Button variant="ghost" onClick={() => setModal(false)}>Cancelar</Button><Button onClick={() => setModal(false)}>Comenzar</Button></>}>
        <p>Tendrás 140 minutos para responder las 65 preguntas. Puedes moverte entre preguntas antes de finalizar.</p>
      </Modal>
    </main>
  )
}
