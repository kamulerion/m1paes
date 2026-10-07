# Preparar y desplegar M1PAES

La aplicación ya tiene una ruta de despliegue definida: React/Vite se compila a `frontend/dist`, Express sirve ese build y las rutas `/api/*`, PostgreSQL almacena los datos y la plataforma publica el servicio por HTTPS. El dominio elegido es **`m1paes.online`**.

## Requisitos de destino

- Node.js 20.19 o posterior, PostgreSQL 15 o posterior y npm.
- Un dominio con HTTPS terminado en Nginx u otro proxy inverso confiable.
- Credenciales de base de datos de mínimo privilegio y un proveedor de correo transaccional configurado.
- Un proceso Node único para mantener coherente el limitador de login en memoria. Para escalar a varios procesos, migrar ese estado a un almacén compartido antes.

### Opción gratuita para piloto: Render + Neon + Resend

Render aloja el proceso Node y sirve el build de React. Neon entrega PostgreSQL
administrado; configura `DATABASE_URL` con la cadena del pooler y TLS que provee
Neon. Resend entrega los correos de recuperación por API HTTPS, ya que Render
bloquea SMTP saliente en el nivel gratuito. `render.yaml` contiene la
configuración base del servicio; las claves y la conexión de base de datos se
cargan en el panel de Render, nunca en Git.

Los niveles gratuitos tienen límites y no son adecuados para prometer servicio
continuo ni guardar datos importantes de estudiantes: Render duerme el servicio
tras 15 minutos sin tráfico y el primer acceso puede tardar alrededor de un
minuto; Neon limita almacenamiento y cómputo mensual; Resend limita el envío
gratuito a 3.000 correos al mes y 100 al día. Usa esta combinación para una
demostración o piloto acotado, con datos no críticos y respaldos externos. Antes
de abrir registros a estudiantes, define privacidad, responsable de datos,
soporte y una estrategia de respaldo y disponibilidad.

## Dominio y DNS

En Render, añade primero `m1paes.online` y `www.m1paes.online` como dominios del
servicio. En Namecheap Advanced DNS, Render indica crear `A @ → 216.24.57.1` y
`CNAME www → <subdominio-del-servicio>.onrender.com`; elimina los registros
`AAAA` del sitio, porque Render no ofrece IPv6 para estos dominios. No cambies
los nameservers. Para verificar el remitente en Resend, agrega los registros
TXT/CNAME que indique su panel; conserva los `MX` si quieres recibir correo en
Namecheap y combina SPF en un único registro si el correo entrante se mantiene.
Render emite y renueva HTTPS automáticamente al verificar el dominio.

En el servicio configura `APP_BASE_URL=https://m1paes.online` y `HOST=0.0.0.0`;
Render proporciona `PORT` y termina TLS delante de la aplicación.

## Preparar el artefacto

Desde la carpeta raíz del proyecto, ejecuta en Linux:

```sh
npm ci --prefix frontend
npm --prefix frontend run build
npm ci --prefix backend --omit=dev
```

El despliegue debe incluir `backend/`, `frontend/dist/` y `db/schema.sql`. No publiques `backend/.env`, `node_modules`, volcados de base de datos ni credenciales. Si se compila en el servidor, instala también las dependencias de frontend antes de arrancar la API.

## Configuración del servidor

Define estas variables en el panel de Render, no en el repositorio:

```text
NODE_ENV=production
HOST=0.0.0.0
TRUST_PROXY=1
APP_BASE_URL=https://m1paes.online
JWT_SECRET=<al menos 64 caracteres aleatorios; generar con crypto.randomBytes(48).toString('hex')>
DATABASE_URL=<cadena de conexión TLS de Neon>
RESEND_API_KEY=<clave secreta de API de Resend>
EMAIL_FROM=M1PAES <no-reply@m1paes.online>
```

Render proporciona el puerto público mediante `PORT`; `HOST=0.0.0.0` permite que su proxy alcance Express. `TRUST_PROXY=1` permite reconocer HTTPS e IP del cliente detrás del proxy de Render. No abras PostgreSQL públicamente ni registres las claves en el repositorio.

El servidor se niega a iniciar en producción cuando falta la configuración obligatoria o el build del frontend. No pongas valores de ejemplo en producción. La cookie de sesión solo es `Secure` bajo HTTPS.

## Base de datos y arranque

Haz una copia de seguridad antes de cualquier cambio. Para una base nueva, crea una base vacía y aplica `db/schema.sql` con `psql`. El script de desarrollo `npm run db:reset` elimina la base y está bloqueado en producción.

En Neon, crea una base vacía y ejecuta `db/schema.sql` una sola vez desde su SQL
Editor. Después de cargar las claves y verificar el dominio remitente:

```sh
npm --prefix backend run admin:bootstrap
npm --prefix backend start
```

Ejecuta `admin:bootstrap` una sola vez, con acceso a la base vacía y desde una
terminal privada. La contraseña se ingresa sin eco; no la pases como argumento ni
la guardes en el repositorio. El script se niega a crear una cuenta inicial si
ya existe un SUPERADMIN.

Conecta un repositorio privado de GitHub a Render para desplegar. La cuenta de servicio de Render ejecuta un único proceso Node. Exporta respaldos de Neon fuera del proveedor con regularidad; el nivel gratuito no equivale a una estrategia de recuperación de producción.

## Lista previa a publicar

- [ ] `m1paes.online` y `www` verificados en Render; HTTPS y redirección a HTTPS comprobados.
- [ ] Puertos de PostgreSQL y Node no expuestos públicamente; usuario de BD de mínimo privilegio.
- [ ] Secretos únicos y reales inyectados por el servidor; `.env` fuera del repositorio.
- [ ] Build React regenerado y versión servida comprobada.
- [ ] Recuperación probada de extremo a extremo con Resend; el remitente está verificado y el enlace usa el dominio HTTPS correcto.
- [ ] Registro, login, logout, recuperación, cambio de contraseña y permisos por rol revisados en el entorno destino.
- [ ] Rate limit comprobado detrás del proxy y se confirma que la IP real no puede falsificarse desde Internet.
- [ ] Backups automáticos y restauración verificada.
- [ ] Monitor de disponibilidad y alertas activos.
- [ ] Flujo principal revisado en Chrome/Chromium, Firefox, Edge y Safari.
- [ ] Política de privacidad, condiciones de uso, responsable de los datos y canal de soporte definidos antes del registro público.

La disponibilidad de producción, respaldos restaurables, el envío real, la revisión de privacidad y las verificaciones de navegadores solo se pueden cerrar en los servicios y dominio definitivos.
