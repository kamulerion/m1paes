# Anexo H — Verificación técnica (actualizado el 7 de octubre de 2026)

- **Proyecto:** M1PAES · Plataforma de preparación PAES M1
- **Entorno:** Windows · Node.js v24.19.0 · npm 11.17.0 · PostgreSQL local
- **Alcance:** pruebas backend con BD, lint de backend/frontend, build React y auditoría de dependencias.

## Resultados

| Verificación | Resultado |
|---|---|
| `npm run test:coverage` (backend) | **11 suites, 99/99 pruebas aprobadas** |
| Cobertura (Istanbul) | **87,23 % instrucciones · 89,77 % líneas · 96,59 % funciones · 66,39 % ramas** |
| `npm run lint` (backend + frontend) | **0 errores** |
| `npm run build` (frontend, Vite 8.3.3) | **Compilación correcta**, división de código por ruta, sin avisos de tamaño |
| Auditoría frontend al instalar dependencias actualizadas | **0 vulnerabilidades** |
| `npm audit --omit=dev` (backend) | **0 vulnerabilidades de producción** |

Las pruebas se ejecutaron sobre la base local existente sin recrearla. Los casos de progreso se ajustaron para respetar el promedio sobre todos los contenidos del eje, y el reporte institucional ahora incorpora a cada estudiante y contenido al calcular el promedio, asignando cero a quien aún no tiene registro de progreso.

## Dependencias y despliegue

Se actualizaron Vite, `@vitejs/plugin-react`, React Router y KaTeX por los avisos encontrados en la auditoría. El frontend requiere Node.js **20.19 o posterior** para el build.

La recuperación de contraseña en producción usa la API HTTPS de Resend y el enlace `APP_BASE_URL`. Se verificó la configuración y compilación localmente; el envío con credenciales reales, dominio verificado, backups, monitoreo y navegadores externos requiere la infraestructura de destino y sigue pendiente allí.

## Referencia de evidencias anteriores

Las salidas crudas previas en este directorio y las capturas del Anexo G documentan la etapa de interfaz HTML anterior. Se conservan como histórico; no representan el build React actual. Genera capturas nuevas desde la aplicación React antes de usar ese anexo como presentación del producto vigente.
