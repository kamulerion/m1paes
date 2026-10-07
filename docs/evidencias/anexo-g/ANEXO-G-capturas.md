# Anexo G — Evidencias del desarrollo del MVP (capturas)

- **Proyecto:** M1PAES · Plataforma Web de Educación Matemática (PAES M1)
- **Estado:** guía pendiente de regenerar para la interfaz React vigente
- **Desarrollo:** API en `http://127.0.0.1:3000` y Vite en `http://127.0.0.1:5173`
- **Formato:** PNG de ventana completa (Windows: `Win + Shift + S` o `Alt + PrtScn`),
  guardar en **esta misma carpeta** con el nombre indicado.

## Datos de demostración

Usa cuentas nuevas y contenido de prueba en un entorno local aislado. No guardes
contraseñas, cookies de sesión ni tokens de recuperación en este archivo, en las
capturas ni en el repositorio. Las credenciales de la versión anterior se
retiraron; si alguna cuenta equivalente existe en un servicio activo, cambia su
contraseña antes de publicarlo.

## Contenido preparado para las capturas

Creado desde el panel de SUPERADMIN (evidencia de rol incluida):

- **Lección:** «Valor absoluto» — eje **Números** (teoría + orden 1).
- **Ejercicio:** «Cual es el resultado de |-7| + |3| ?» —4 alternativas,
  correcta «10», dificultad FACIL, con explicación de solución.

## 3. Lista de capturas (9 puntos del Anexo G del informe)

| # | Archivo | Dónde / pasos | Qué debe verse | Estado |
|---|---------|---------------|----------------|--------|
| 1a | `g1-registro.png` | <http://127.0.0.1:5173/registro> | Formulario «Crea tu cuenta gratis» completo | ⬜ nueva captura React |
| 1b | `g2-registro-exitoso-login.png` | Tras enviar un registro válido | Confirmación y formulario de login React | ⬜ nueva captura React |
| 2 | `g3-pantalla-principal.png` | `/` con sesión de **estudiante** iniciada | Home con nav completa, estado de API y sección de sesión | ⬜ pendiente |
| 3 | `g4-navegacion-ejes.png` | Menú **Contenidos** (`/contenido`) | Los **4 ejes DEMRE**: Números, Álgebra y Funciones, Geometría, Probabilidad y Estadística | ⬜ pendiente |
| 4 | `g5-contenido-leccion.png` | Contenidos → eje **Números** → lección **«Valor absoluto»** | Texto teórico de la lección (visualización de contenidos) | ⬜ pendiente |
| 5 | `g6-ejercicio.png` | Menú **Ejercicios** → elegir la lección «Valor absoluto» | Enunciado «\|-7\| + \|3\|» con sus **4 alternativas** sin responder | ⬜ pendiente |
| 6 | `g7-retroalimentacion.png` | Responder la alternativa **«10»** y enviar | Mensaje de **respuesta correcta** + explicación de solución | ⬜ pendiente |
| 7 | `g8-panel-progreso.png` | Menú **Mi avance** (`/avance`) | Panel de progreso con la actividad registrada (intentos/aciertos) | ⬜ pendiente |
| 8 | `g9-gestion-perfil.png` | Menú de sesión → **Perfil** (`/perfil`) | Datos del usuario, rol/suscripción y formulario «Editar mis datos» | ⬜ pendiente |
| 9 | `g10-funcionalidades-rol.png` | Cerrar sesión → entrar como **SUPERADMIN** → <http://127.0.0.1:5173/admin> | Panel de administración: gestión de ejes, lecciones y ejercicios | ⬜ pendiente |
| opt | `g11-admin-instituciones.png` | Mismo panel, sección **Instituciones** o **Métricas** | Vista adicional de funcionalidades exclusivas del rol (opcional) | ⬜ opcional |

## 4. Verificación final

1. Genera las capturas nuevas sobre el build React y confirma los 10 (u 11) PNG.
2. Revisa cada imagen y elimina tokens, correos personales y otros datos antes de compartirla.
3. No ejecutes `db:reset` contra una base que contenga datos que quieras conservar.
