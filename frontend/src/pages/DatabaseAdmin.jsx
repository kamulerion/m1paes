import { useEffect, useState } from 'react'
import Alert from '../components/ui/Alert.jsx'
import Button from '../components/ui/Button.jsx'
import Card from '../components/ui/Card.jsx'
import Table from '../components/ui/Table.jsx'
import { Textarea } from '../components/ui/Input.jsx'
import { api } from '../api.js'
import styles from './DatabaseAdmin.module.css'

const PAGE_SIZE = 200
const INITIAL_QUERY = 'SELECT * FROM public.usuario LIMIT 50'

function mostrar(valor) {
  if (valor === null || valor === undefined) return 'NULL'
  if (typeof valor === 'object') return JSON.stringify(valor)
  return String(valor)
}

export default function DatabaseAdmin() {
  const [tablas, setTablas] = useState([])
  const [consulta, setConsulta] = useState(INITIAL_QUERY)
  const [resultado, setResultado] = useState(null)
  const [tablaActiva, setTablaActiva] = useState(null)
  const [datosTabla, setDatosTabla] = useState(null)
  const [offset, setOffset] = useState(0)
  const [mensaje, setMensaje] = useState(null)
  const [cargando, setCargando] = useState(false)

  async function cargarTablas() {
    try {
      const respuesta = await api.get('/api/admin/database/tables')
      setTablas(respuesta.tablas)
    } catch (error) { setMensaje(error.message) }
  }

  useEffect(() => { cargarTablas() }, [])

  async function abrirTabla(nombre, nuevoOffset = 0) {
    setCargando(true); setMensaje(null); setTablaActiva(nombre); setResultado(null)
    try {
      const datos = await api.get(`/api/admin/database/tables/${encodeURIComponent(nombre)}?offset=${nuevoOffset}`)
      setDatosTabla(datos); setOffset(nuevoOffset)
    } catch (error) { setMensaje(error.message); setDatosTabla(null) }
    finally { setCargando(false) }
  }

  async function ejecutarConsulta(event) {
    event.preventDefault(); setCargando(true); setMensaje(null); setTablaActiva(null); setDatosTabla(null)
    try {
      setResultado(await api.post('/api/admin/database/query', { sql: consulta }))
    } catch (error) { setMensaje(error.message); setResultado(null) }
    finally { setCargando(false) }
  }

  function renderResultado(columnas, filas, caption) {
    if (!filas.length) return <p className="text-faint">La consulta no devolvió filas.</p>
    return (
      <Table caption={caption} head={columnas.map((columna) => ({ label: columna }))}>
        {filas.map((fila, i) => (
          <tr key={i}>{columnas.map((columna) => <td key={columna} className={styles.cell}>{mostrar(Array.isArray(fila) ? fila[columnas.indexOf(columna)] : fila[columna])}</td>)}</tr>
        ))}
      </Table>
    )
  }

  return (
    <section className="stack">
      <div>
        <h2>Base de datos</h2>
        <p>Explora tablas y ejecuta consultas SQL de solo lectura sobre Neon.</p>
      </div>
      <Alert variant="info">Acceso exclusivo de superadministrador. Las consultas no pueden cambiar datos; cada resultado está limitado a 200 filas y 5 segundos.</Alert>
      {mensaje && <Alert variant="error">{mensaje}</Alert>}

      <Card variant="flat">
        <div className={styles.layout}>
          <aside className="stack" aria-label="Tablas disponibles">
            <h3>Tablas</h3>
            {tablas.length === 0 && <p className="text-faint">No hay tablas visibles.</p>}
            <ul className={styles.tableList}>
              {tablas.map((tabla) => (
                <li key={tabla.nombre}>
                  <button type="button" className={tablaActiva === tabla.nombre ? styles.selected : ''} onClick={() => abrirTabla(tabla.nombre)}>
                    {tabla.nombre}<small>{tabla.tipo === 'VIEW' ? 'Vista' : 'Tabla'}</small>
                  </button>
                </li>
              ))}
            </ul>
          </aside>

          <div className="stack">
            <form className="stack" onSubmit={ejecutarConsulta}>
              <label htmlFor="admin-sql"><strong>Consulta SQL</strong></label>
              <Textarea id="admin-sql" rows={7} maxLength={5000} spellCheck="false" value={consulta} onChange={(event) => setConsulta(event.target.value)} />
              <div className={styles.actions}>
                <span className="text-faint">Solo SELECT · máximo 5.000 caracteres</span>
                <Button loading={cargando}>Ejecutar consulta</Button>
              </div>
            </form>

            {resultado && <div className="stack"><h3>Resultado de la consulta</h3>{renderResultado(resultado.columnas, resultado.filas, 'Resultado SQL')}{resultado.hayMas && <p className="text-faint">Se muestran las primeras {PAGE_SIZE} filas. Agrega LIMIT a tu consulta para acotar el resultado.</p>}</div>}

            {datosTabla && <div className="stack">
              <h3>{tablaActiva}</h3>
              <p className="text-faint">Columnas: {datosTabla.columnas.map((c) => `${c.nombre} (${c.tipo})`).join(' · ')}</p>
              {renderResultado(datosTabla.columnas.map((c) => c.nombre), datosTabla.filas, `Filas de ${tablaActiva}`)}
              <div className={styles.actions}>
                <Button variant="outline" disabled={offset === 0 || cargando} onClick={() => abrirTabla(tablaActiva, Math.max(0, offset - PAGE_SIZE))}>← Anterior</Button>
                <span className="text-faint">Filas {offset + 1}–{offset + datosTabla.filas.length}</span>
                <Button variant="outline" disabled={!datosTabla.hayMas || cargando} onClick={() => abrirTabla(tablaActiva, offset + PAGE_SIZE)}>Siguiente →</Button>
              </div>
            </div>}
          </div>
        </div>
      </Card>
    </section>
  )
}
