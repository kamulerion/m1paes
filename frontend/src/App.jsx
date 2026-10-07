import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import GridBackground from './components/layout/GridBackground.jsx'
import Layout from './components/layout/Layout.jsx'

const Home = lazy(() => import('./pages/Home.jsx'))
const Login = lazy(() => import('./pages/Login.jsx'))
const Registro = lazy(() => import('./pages/Registro.jsx'))
const Recuperar = lazy(() => import('./pages/Recuperar.jsx'))
const Restablecer = lazy(() => import('./pages/Restablecer.jsx'))
const Perfil = lazy(() => import('./pages/Perfil.jsx'))
const Avance = lazy(() => import('./pages/Avance.jsx'))
const Contenido = lazy(() => import('./pages/Contenido.jsx'))
const Ejercicios = lazy(() => import('./pages/Ejercicios.jsx'))
const Simulacro = lazy(() => import('./pages/Simulacro.jsx'))
const Institucion = lazy(() => import('./pages/Institucion.jsx'))
const Admin = lazy(() => import('./pages/Admin.jsx'))
const StyleGuide = lazy(() => import('./pages/dev/StyleGuide.jsx'))

export default function App() {
  return (
    <>
      <GridBackground />
      <Layout>
        <Suspense fallback={<p role="status" aria-live="polite">Cargando…</p>}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/registro" element={<Registro />} />
          <Route path="/recuperar" element={<Recuperar />} />
          <Route path="/restablecer" element={<Restablecer />} />
          <Route path="/perfil" element={<Perfil />} />
          <Route path="/avance" element={<Avance />} />
          <Route path="/contenido" element={<Contenido />} />
          <Route path="/ejercicios" element={<Ejercicios />} />
          <Route path="/simulacro" element={<Simulacro />} />
          <Route path="/institucion" element={<Institucion />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/guia" element={<StyleGuide />} />
          <Route path="*" element={<Home />} />
        </Routes>
        </Suspense>
      </Layout>
    </>
  )
}
