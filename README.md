# M1PAES — Plataforma de preparación para la PAES M1

MVP educativo para preparar Competencia Matemática 1. La aplicación activa usa **React + Vite** para la interfaz, **Node.js + Express** para la API y **PostgreSQL** para los datos. Las páginas HTML anteriores se conservan como referencia en `frontend/legacy-static-prototype/`; Vite y la API no las publican.

## Requisitos

- Node.js 20.19 o posterior (necesario para el build Vite 8) y npm.
- PostgreSQL 15 o posterior.
- Variables locales configuradas en `backend/.env` (parte de `.env.example`).

## Desarrollo local

Desde la carpeta `M1PAES`:

```powershell
Copy-Item backend/.env.example backend/.env
# Completa DB_PASSWORD en backend/.env
cd backend
npm ci
npm run db:reset
npm run dev
```

En otra terminal, instala y levanta Vite:

```powershell
cd frontend
npm ci
npm run dev
```

Abre la URL que informa Vite (normalmente `http://localhost:5173`). El proxy de Vite reenvía `/api` a la API local en el puerto 3000. `db:reset` **elimina y recrea** la base local; está bloqueado cuando `NODE_ENV=production`.

## Construcción y ejecución de producción

La API sirve el build de React desde `frontend/dist`. El servidor falla al iniciar en producción si ese build no existe. En el directorio raíz del proyecto:

```sh
npm ci --prefix frontend
npm run build --prefix frontend
npm ci --prefix backend --omit=dev
```

Configura las variables de producción descritas en `backend/.env.example` y en [`LEERME-DESPLIEGUE.md`](LEERME-DESPLIEGUE.md), aplica `db/schema.sql` **solo a una base nueva o respaldada**, y luego inicia con `npm start --prefix backend`. Usa HTTPS terminado en un proxy inverso; la aplicación escucha en `127.0.0.1` por defecto.

La recuperación de contraseña envía por la API HTTPS de Resend en producción. El arranque requiere `JWT_SECRET`, `APP_BASE_URL` HTTPS, acceso a PostgreSQL y `RESEND_API_KEY`/`EMAIL_FROM`. Para el piloto gratuito, revisa [`render.yaml`](render.yaml) y [`LEERME-DESPLIEGUE.md`](LEERME-DESPLIEGUE.md); verifica base de datos, dominio y remitente antes de habilitar usuarios.

En la base de producción vacía, genera la primera cuenta administradora desde una terminal privada con `npm --prefix backend run admin:bootstrap`. El script pide nombre, correo y contraseña sin mostrarla y se niega a crear otra cuenta inicial si ya existe un SUPERADMIN.

## Comandos del backend

| Comando | Uso |
|---|---|
| `npm run dev` | API con recarga al guardar |
| `npm start` | API normal |
| `npm test` | Pruebas unitarias sin PostgreSQL |
| `npm run test:db` | Pruebas de integración con PostgreSQL |
| `npm run test:coverage` | Suite completa con cobertura |
| `npm run lint` | ESLint del backend y del frontend React |
| `npm run db:reset` | **Destructivo:** recrea la base local y carga el esquema |
| `npm run admin:bootstrap` | Alta interactiva del primer SUPERADMIN (solo una vez) |
| `npm run benchmark` | Mide seis rutas de API |

## Estructura

```text
backend/                 API Express, servicios, repositorios y pruebas
frontend/src/            Aplicación React activa
frontend/public/         Recursos estáticos copiados por Vite (favicon)
frontend/legacy-static-prototype/  Interfaz anterior conservada, no publicada
db/schema.sql            Esquema PostgreSQL y datos semilla
docs/dev/                Requisitos, ADR, plan de pruebas y bitácora
docs/evidencias/         Registros históricos de pruebas y capturas
```

## Estado y límites conocidos

Los resultados locales más recientes están en [`docs/evidencias/ANEXO-H-reporte-pruebas.md`](docs/evidencias/ANEXO-H-reporte-pruebas.md). La disponibilidad, backups, correo real, HTTPS, dominio y pruebas en navegadores de producción solo se pueden cerrar en la infraestructura de destino. Consulta [`LEERME-DESPLIEGUE.md`](LEERME-DESPLIEGUE.md) para la lista de salida.
