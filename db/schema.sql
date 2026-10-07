-- =============================================================================
-- ESQUEMA DE BASE DE DATOS RELACIONAL: M1PAES WEB APP (VERSIÓN 3.0)
-- Alineado al Informe de Formulación y Diseño U1 — v3.0 (03/10/2026)
-- Asignatura: Ingeniería de Software - INACAP Maipú (Sección TI3V43)
-- Docente: Felipe Fuentes Ayar
-- Motor: PostgreSQL 15+
-- Integrantes: Alexis Ferrada, Camila Cifuentes, Esteban de Souza, Jocelin Arredondo
-- Contenido: 14 tablas · 10 índices · datos semilla (3 roles y 4 ejes temáticos DEMRE)
-- Correspondencia: secciones 8.3 y 9 del Informe U1 v3.0 y del Modelo Entidad-Relación v1.1,
--   más la tabla 14 CALENDARIO_ENSAYO, añadida en la Fase 4 de desarrollo para el RF-16
--   (calendario de ensayos): el informe v3 no modela su persistencia. Decisión registrada
--   en docs/dev/BITACORA-DESARROLLO.md (entrada "Fase 4").
-- Cambios respecto de schema_m1paes_v1.1.sql: rotulación, advertencia y notas de
-- trazabilidad; las 13 tablas originales se mantienen idénticas para preservar la
-- coherencia con los diagramas UML y el modelo entidad-relación publicados en la v1.1.
--
-- ⚠ SCRIPT DESTRUCTIVO: elimina y recrea el esquema public (DROP SCHEMA ... CASCADE).
--   Ejecutar exclusivamente en entornos de desarrollo o de pruebas.
-- =============================================================================


DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;

-- 1. TABLA ROL (Catálogo de los 3 perfiles operativos)
CREATE TABLE ROL (
    id_rol SERIAL PRIMARY KEY,
    nombre_rol VARCHAR(30) NOT NULL UNIQUE
);

INSERT INTO ROL (nombre_rol) VALUES
('SUPERADMIN'),
('ADMIN_INSTITUCION'),
('ESTUDIANTE');

-- 2. TABLA INSTITUCION (Liceos, Preuniversitarios, Institutos B2B)
CREATE TABLE INSTITUCION (
    id_institucion SERIAL PRIMARY KEY,
    nombre VARCHAR(120) NOT NULL,
    rut_identificador VARCHAR(20) NOT NULL UNIQUE,
    convenio_tipo VARCHAR(50) DEFAULT 'B2B_PREMIUM',
    fecha_adhesion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    activo BOOLEAN DEFAULT TRUE NOT NULL
);

-- 3. TABLA USUARIO
-- Incorpora:
--  a) id_usuario_creador: Trazabilidad jerárquica de creación (Superadmin crea AdminInst, AdminInst matricula Estudiante).
--  b) id_institucion: NULLABLE para soportar al Estudiante Free y al Superadmin.
CREATE TABLE USUARIO (
    id_usuario SERIAL PRIMARY KEY,
    id_rol INT NOT NULL REFERENCES ROL(id_rol) ON UPDATE CASCADE,
    id_institucion INT REFERENCES INSTITUCION(id_institucion) ON DELETE SET NULL,
    id_usuario_creador INT REFERENCES USUARIO(id_usuario) ON DELETE SET NULL, -- CONEXIÓN JERÁRQUICA
    nombre VARCHAR(100) NOT NULL,
    correo VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    matricula VARCHAR(50), -- Asignado por institución si corresponde
    cargo VARCHAR(50),     -- Asignado para Admin de Institución
    tipo_suscripcion VARCHAR(20) DEFAULT 'FREE' CHECK (tipo_suscripcion IN ('FREE', 'INSTITUCIONAL')),
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    activo BOOLEAN DEFAULT TRUE NOT NULL
);

-- 4. TABLA TOKEN_RECUPERACION (Módulo de autenticación y autoservicio de contraseña)
CREATE TABLE TOKEN_RECUPERACION (
    id_token SERIAL PRIMARY KEY,
    id_usuario INT NOT NULL REFERENCES USUARIO(id_usuario) ON DELETE CASCADE,
    token VARCHAR(255) NOT NULL UNIQUE,
    expira_en TIMESTAMP NOT NULL,
    utilizado BOOLEAN DEFAULT FALSE NOT NULL
);

-- 5. TABLA EJE_TEMATICO (Ejes oficiales DEMRE PAES M1 gestionados por Superadmin)
CREATE TABLE EJE_TEMATICO (
    id_eje SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    descripcion TEXT
);

INSERT INTO EJE_TEMATICO (nombre, descripcion) VALUES
('Números', 'Conjuntos numéricos, operaciones, razones, proporciones y porcentajes.'),
('Álgebra y Funciones', 'Expresiones algebraicas, ecuaciones lineales, sistemas de ecuaciones y funciones.'),
('Geometría', 'Figuras geométricas, perímetros, áreas, transformaciones isométricas y trigonometría básica.'),
('Probabilidad y Estadística', 'Medidas de tendencia central, dispersión, reglas de probabilidad y combinatoria.');

-- 6. TABLA CONTENIDO (Lecciones teóricas y multimedia por eje)
CREATE TABLE CONTENIDO (
    id_contenido SERIAL PRIMARY KEY,
    id_eje INT NOT NULL REFERENCES EJE_TEMATICO(id_eje) ON DELETE RESTRICT,
    id_admin_creador INT NOT NULL REFERENCES USUARIO(id_usuario) ON DELETE RESTRICT,
    titulo VARCHAR(150) NOT NULL,
    cuerpo_teoria TEXT NOT NULL,
    url_video VARCHAR(255),
    orden INT DEFAULT 1 NOT NULL,
    fecha_publicacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 7. TABLA EJERCICIO (Banco oficial de ítems pedagógicos DEMRE)
CREATE TABLE EJERCICIO (
    id_ejercicio SERIAL PRIMARY KEY,
    id_contenido INT NOT NULL REFERENCES CONTENIDO(id_contenido) ON DELETE CASCADE,
    id_admin_creador INT NOT NULL REFERENCES USUARIO(id_usuario) ON DELETE RESTRICT,
    enunciado TEXT NOT NULL,
    explicacion_solucion TEXT NOT NULL,
    dificultad VARCHAR(20) DEFAULT 'MEDIA' CHECK (dificultad IN ('FACIL', 'MEDIA', 'DIFICIL')),
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 8. TABLA ALTERNATIVA (Opciones de respuesta de selección múltiple con retroalimentación)
CREATE TABLE ALTERNATIVA (
    id_alternativa SERIAL PRIMARY KEY,
    id_ejercicio INT NOT NULL REFERENCES EJERCICIO(id_ejercicio) ON DELETE CASCADE,
    texto TEXT NOT NULL,
    es_correcta BOOLEAN NOT NULL DEFAULT FALSE
);

-- 9. TABLA SIMULACRO (Ensayos oficiales tipo DEMRE de 65 preguntas y 140 minutos)
CREATE TABLE SIMULACRO (
    id_simulacro SERIAL PRIMARY KEY,
    id_admin_creador INT NOT NULL REFERENCES USUARIO(id_usuario) ON DELETE RESTRICT,
    nombre VARCHAR(120) NOT NULL,
    tiempo_limite_minutos INT DEFAULT 140 NOT NULL,
    cantidad_preguntas INT DEFAULT 65 NOT NULL,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 10. TABLA INTERMEDIA SIMULACRO_EJERCICIO (Composición formal del ensayo)
CREATE TABLE SIMULACRO_EJERCICIO (
    id_simulacro INT NOT NULL REFERENCES SIMULACRO(id_simulacro) ON DELETE CASCADE,
    id_ejercicio INT NOT NULL REFERENCES EJERCICIO(id_ejercicio) ON DELETE RESTRICT,
    numero_pregunta INT NOT NULL,
    PRIMARY KEY (id_simulacro, id_ejercicio)
);

-- 11. TABLA HISTORIAL_AVANCE (Resuelve la observación de Primary Key para intentos del estudiante)
CREATE TABLE HISTORIAL_AVANCE (
    id_historial SERIAL PRIMARY KEY, -- PRIMARY KEY INDISPENSABLE
    id_estudiante INT NOT NULL REFERENCES USUARIO(id_usuario) ON DELETE CASCADE,
    id_simulacro INT REFERENCES SIMULACRO(id_simulacro) ON DELETE SET NULL,
    tipo_actividad VARCHAR(50) NOT NULL CHECK (tipo_actividad IN ('PRACTICA_LECCION', 'SIMULACRO_OFICIAL')),
    puntaje_obtenido DECIMAL(6,2) NOT NULL DEFAULT 0.00,
    duracion_minutos INT NOT NULL,
    fecha_realizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 12. TABLA RESPUESTA_USUARIO (Auditoría reactiva de cada alternativa marcada por intento)
CREATE TABLE RESPUESTA_USUARIO (
    id_respuesta SERIAL PRIMARY KEY,
    id_historial INT NOT NULL REFERENCES HISTORIAL_AVANCE(id_historial) ON DELETE CASCADE,
    id_estudiante INT NOT NULL REFERENCES USUARIO(id_usuario) ON DELETE CASCADE,
    id_ejercicio INT NOT NULL REFERENCES EJERCICIO(id_ejercicio) ON DELETE CASCADE,
    id_alternativa INT NOT NULL REFERENCES ALTERNATIVA(id_alternativa) ON DELETE CASCADE,
    es_correcta BOOLEAN NOT NULL,
    fecha_respuesta TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 13. TABLA PROGRESO (Progreso acumulativo del estudiante por contenido temático)
CREATE TABLE PROGRESO (
    id_progreso SERIAL PRIMARY KEY,
    id_estudiante INT NOT NULL REFERENCES USUARIO(id_usuario) ON DELETE CASCADE,
    id_contenido INT NOT NULL REFERENCES CONTENIDO(id_contenido) ON DELETE CASCADE,
    completado BOOLEAN DEFAULT FALSE NOT NULL,
    porcentaje DECIMAL(5,2) DEFAULT 0.00 NOT NULL,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    UNIQUE (id_estudiante, id_contenido)
);

-- 14. TABLA CALENDARIO_ENSAYO (RF-16 — extensión documentada del esquema v3:
--      el informe no modela la persistencia del calendario de ensayos, ver
--      bitácora Fase 4. Cada evento pertenece a UNA institución/sede).
CREATE TABLE CALENDARIO_ENSAYO (
    id_evento SERIAL PRIMARY KEY,
    id_institucion INT NOT NULL REFERENCES INSTITUCION(id_institucion) ON DELETE CASCADE,
    id_usuario_creador INT REFERENCES USUARIO(id_usuario) ON DELETE SET NULL,
    titulo VARCHAR(150) NOT NULL,
    descripcion VARCHAR(2000),
    fecha_evento TIMESTAMP NOT NULL,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- ÍNDICES DE RENDIMIENTO Y OPTIMIZACIÓN
CREATE INDEX idx_usuario_correo ON USUARIO(correo);
CREATE INDEX idx_usuario_rol ON USUARIO(id_rol);
CREATE INDEX idx_usuario_institucion ON USUARIO(id_institucion);
CREATE INDEX idx_usuario_creador ON USUARIO(id_usuario_creador);
CREATE INDEX idx_contenido_eje ON CONTENIDO(id_eje);
CREATE INDEX idx_ejercicio_contenido ON EJERCICIO(id_contenido);
CREATE INDEX idx_alternativa_ejercicio ON ALTERNATIVA(id_ejercicio);
CREATE INDEX idx_historial_estudiante ON HISTORIAL_AVANCE(id_estudiante);
CREATE INDEX idx_progreso_estudiante ON PROGRESO(id_estudiante);
CREATE INDEX idx_calendario_institucion ON CALENDARIO_ENSAYO(id_institucion);
