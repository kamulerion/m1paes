'use strict';

const config = require('../config');

/**
 * Servicio de correo (RF-03).
 * En desarrollo NO se usa ningún servicio externo (restricción de trabajo
 * 100 % local): el mensaje se registra en la consola del servidor.
 * En producción envía por la API HTTPS de Resend; no depende de puertos SMTP.
 */
async function enviarRecuperacion({ para, token, enlace }) {
  const asunto = 'M1PAES - Recuperacion de contrasena';
  const enlaceCompleto = new URL(enlace, config.appBaseUrl).toString();
  const texto = [
    'Recibimos una solicitud para restablecer tu contrasena.',
    'Si no fuiste tu, ignora este mensaje.',
    '',
    `Token: ${token}`,
    `O abre directamente: ${enlaceCompleto}`,
    '',
    'Valido durante 30 minutos.',
  ].join('\n');

  if (config.env !== 'production') {
    console.log(`[mailer:dev] para=${para}`);
    console.log(`[mailer:dev] asunto="${asunto}"`);
    console.log(`[mailer:dev]\n${texto}`);
    return;
  }

  const respuesta = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.mail.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: config.mail.from,
      to: [para],
      subject: asunto,
      text: texto,
    }),
  });

  if (!respuesta.ok) {
    console.error(`[mailer:resend] envío rechazado (HTTP ${respuesta.status})`);
    throw new Error('No se pudo enviar el correo de recuperación');
  }
}

module.exports = { enviarRecuperacion };
