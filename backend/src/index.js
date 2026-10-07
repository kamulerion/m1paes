'use strict';

const { createApp } = require('./app');
const config = require('./config');
const { close } = require('./db/pool');

const app = createApp();

const server = app.listen(config.port, config.host, () => {
  console.log(`[m1paes-api] escuchando en http://${config.host}:${config.port} (${config.env})`);
});

/** Apagado ordenado: cierra conexiones entrantes y el pool de PostgreSQL. */
function shutdown(signal) {
  console.log(`[m1paes-api] ${signal} recibido: cerrando...`);
  server.close(async () => {
    try {
      await close();
    } catch (err) {
      console.error('[m1paes-api] error al cerrar el pool:', err.message);
    }
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
