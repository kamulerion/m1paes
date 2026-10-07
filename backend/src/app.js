'use strict';

const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const config = require('./config');
const healthRoutes = require('./routes/health.routes');
const authRoutes = require('./routes/auth.routes');
const perfilRoutes = require('./routes/perfil.routes');
const adminRoutes = require('./routes/admin.routes');
const institucionesRoutes = require('./routes/instituciones.routes');
const administradoresRoutes = require('./routes/administradores.routes');
const ejesRoutes = require('./routes/ejes.routes');
const leccionesRoutes = require('./routes/lecciones.routes');
const ejerciciosRoutes = require('./routes/ejercicios.routes');
const simulacrosRoutes = require('./routes/simulacros.routes');
const contenidoPublicoRoutes = require('./routes/contenido-publico.routes');
const contenidoEstudianteRoutes = require('./routes/contenido-estudiante.routes');
const practicaRoutes = require('./routes/practica.routes');
const simulacrosEstudianteRoutes = require('./routes/simulacros-estudiante.routes');
const progresoRoutes = require('./routes/progreso.routes');
const institucionRoutes = require('./routes/institucion.routes');
const calendarioEstudianteRoutes = require('./routes/calendario-estudiante.routes');
const metricasRoutes = require('./routes/metricas.routes');
const publicidadRoutes = require('./routes/publicidad.routes');
const { notFound, errorHandler } = require('./middleware/error-handler');

/**
 * Fabrica la instancia de Express (arquitectura de 3 capas: la capa de
 * presentación aquí, lógica en controllers/services, datos en repositories).
 */
function createApp() {
  const app = express();

  app.disable('x-powered-by');
  if (config.trustProxy) app.set('trust proxy', config.trustProxy);
  app.use(helmet({ referrerPolicy: { policy: 'no-referrer' } }));

  // CORS solo si se configura un origen explícito; por defecto el frontend
  // se sirve desde la misma API (mismo origen) y no hace falta abrirlo.
  if (config.corsOrigin) {
    app.use(cors({ origin: config.corsOrigin, credentials: true }));
  }

  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser()); // cookies para la sesión JWT httpOnly (ADR-003)

  // --- Rutas de la API ---
  app.use('/api/health', healthRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/perfil', perfilRoutes);
  // Panel Superadmin (RF-05, RF-06, RF-08, RF-09, RF-10)
  app.use('/api/admin', adminRoutes);
  app.use('/api/admin/instituciones', institucionesRoutes);
  app.use('/api/admin/administradores', administradoresRoutes);
  app.use('/api/admin/ejes', ejesRoutes);
  app.use('/api/admin/lecciones', leccionesRoutes);
  app.use('/api/admin/ejercicios', ejerciciosRoutes);
  app.use('/api/admin/simulacros', simulacrosRoutes);
  // Métricas globales del Superadmin (RF-17 — Fase 4)
  app.use('/api/admin/metricas', metricasRoutes);
  // Contenido visible con sesión (estudiantes incluidos)
  app.use('/api/ejes', contenidoPublicoRoutes);
  // Módulo estudiante (RF-18, RF-11, RF-12, RF-13 — Fase 3)
  app.use('/api/contenido', contenidoEstudianteRoutes);
  app.use('/api/practica', practicaRoutes);
  app.use('/api/simulacros', simulacrosEstudianteRoutes);
  app.use('/api/progreso', progresoRoutes);
  // Módulo institucional (RF-07, RF-14, RF-16 — Fase 4)
  app.use('/api/institucion', institucionRoutes);
  app.use('/api/calendario', calendarioEstudianteRoutes);
  // Publicidad segmentada Free (RF-15 — Fase 5)
  app.use('/api/publicidad', publicidadRoutes);

  // --- Frontend estático (React/Vite, SPA) ---
  const frontendDir = path.join(__dirname, '..', '..', 'frontend', 'dist');
  const frontendIndex = path.join(frontendDir, 'index.html');
  if (config.env === 'production' && !require('fs').existsSync(frontendIndex)) {
    throw new Error('Frontend sin compilar: ejecuta npm ci && npm run build en frontend antes de iniciar producción');
  }
  app.use(express.static(frontendDir));

  // Fallback SPA: las rutas del cliente (react-router, BrowserRouter) que no
  // existan como archivo estático devuelven index.html.
  app.use((req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();
    if (req.path.startsWith('/api')) return next();
    if (path.extname(req.path)) return next();
    return res.sendFile(frontendIndex);
  });

  // --- Manejo de errores (siempre al final) ---
  app.use(notFound);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
