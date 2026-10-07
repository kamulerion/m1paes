import { useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import Logo from '../ui/Logo.jsx'
import { obtenerSesion } from '../../api.js'

const ESTUDIANTE_LINKS = [
  { to: '/contenido', label: 'Contenidos' },
  { to: '/ejercicios', label: 'Ejercicios' },
  { to: '/simulacro', label: 'Simulacros' },
  { to: '/avance', label: 'Mi avance' },
]

export default function Layout({ children }) {
  const { pathname } = useLocation()
  const isHome = pathname === '/'
  const [usuario, setUsuario] = useState(null)

  useEffect(() => {
    obtenerSesion().then(setUsuario).catch(() => setUsuario(null))
  }, [pathname])

  return (
    <>
      <header style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'var(--ink)',
        borderBottom: '3px solid var(--ink)',
        boxShadow: '0 4px 0 rgba(30, 42, 74, 0.15)',
      }}>
        <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.6rem 1.5rem', flexWrap: 'wrap', gap: '0.6rem' }}>
          <Logo light />
          <nav aria-label="Principal" style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <NavLink to="/" end className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>Inicio</NavLink>
            {usuario?.rol === 'ESTUDIANTE' && ESTUDIANTE_LINKS.map((l) => (
              <NavLink key={l.to} to={l.to} className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>{l.label}</NavLink>
            ))}
            {usuario?.rol === 'ADMIN_INSTITUCION' && (
              <NavLink to="/institucion" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>Mi sede</NavLink>
            )}
            {usuario?.rol === 'SUPERADMIN' && (
              <NavLink to="/admin" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>Administración</NavLink>
            )}
            {usuario ? (
              <NavLink to="/perfil" className={({ isActive }) => `nav-cta${isActive ? ' active' : ''}`}>Mi perfil</NavLink>
            ) : (
              <NavLink to="/login" className={({ isActive }) => `nav-cta${isActive ? ' active' : ''}`}>Ingresar</NavLink>
            )}
          </nav>
        </div>
      </header>
      <main className={isHome ? '' : 'container'} style={{ paddingBlock: 'var(--sp-6)' }}>
        {children}
      </main>
      <footer style={{ textAlign: 'center', padding: 'var(--sp-5)', borderTop: '1px dashed var(--line-strong)', color: 'var(--ink-faint)' }}>
        <small>M1PAES · Preparación para Competencia Matemática 1</small>
      </footer>
    </>
  )
}
