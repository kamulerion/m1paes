# ADR-004: Despliegue y operación

- **Estado:** configuración local preparada para un piloto Render + Neon + Resend; `m1paes.online` está comprado, pero no se han creado cuentas ni configurado DNS.
- **Fecha:** 2026-10-07.
- **Relacionado:** ADR-001 (stack), ADR-002 (PostgreSQL), ADR-003 (autenticación), RNF-02/04/06.

## Decisiones

- La aplicación se publica como un único origen HTTPS: Render termina TLS y reenvía al proceso Express, que sirve `frontend/dist` y `/api/*`.
- En Render, Express escucha en `0.0.0.0` y en el puerto asignado por `PORT`; `TRUST_PROXY=1` habilita la lectura de protocolo e IP detrás del proxy.
- Los límites básicos de login y recuperación viven en memoria por proceso y se reinician al reiniciar el servicio. Son adecuados solo para un piloto corto de una instancia; para público real hacen falta límites distribuidos y monitoreo de abuso.
- PostgreSQL administrado en Neon usa TLS y un pooler; `db:reset` es solo desarrollo y se niega a operar en producción.
- La recuperación de contraseña usa la API HTTPS de Resend porque el nivel gratuito de Render bloquea SMTP saliente en los puertos estándar. La clave y el remitente verificado se inyectan al proceso.
- El arranque en producción falla si falta el secreto JWT, la clave API de Resend, el remitente, la URL HTTPS pública, las credenciales de base de datos o el build del frontend.

## Variables de producción

Ver `backend/.env.example` y `render.yaml`. Los secretos no se almacenan en Git ni se copian al artefacto. Genera `JWT_SECRET` con `crypto.randomBytes(48).toString('hex')`; no reutilices una clave entre entornos.

Para Render Free, no se dispone de consola interactiva del servicio. Aplica `db/schema.sql` solo a la base Neon vacía y ejecuta el alta inicial del SUPERADMIN desde una terminal local privada, conectada temporalmente a Neon. No guardes la URL con contraseña en Git, capturas ni mensajes. El esquema comienza con `DROP SCHEMA ... CASCADE`: ejecutarlo sobre una base con datos los elimina.

## Verificaciones que requieren infraestructura real

- DNS, TLS y redirección HTTP a HTTPS.
- Envío y recepción de recuperación de contraseña a través de Resend.
- Restricciones de red, mínimo privilegio en PostgreSQL, backup y restauración.
- Limitación de intentos usando la IP real detrás del proxy.
- Disponibilidad ≥ 99,5 %, alertas y tasa de errores 5xx.
- Compatibilidad verificada en Firefox, Edge y Safari además de Chromium.
- Privacidad, términos, responsable de datos y soporte publicados antes de habilitar registro público.

Render Free duerme el servicio tras 15 minutos sin tráfico, puede tardar alrededor de un minuto en despertar, y Render indica que sus instancias gratuitas no se deben usar para aplicaciones de producción. Este despliegue sirve solo para una demostración de una semana con datos ficticios o no sensibles. No está listo para datos reales de estudiantes. El repositorio por sí solo no puede cerrar los controles operativos de esta lista.
