'use strict';

/**
 * Crea la primera cuenta SUPERADMIN mediante prompts interactivos.
 * Solo se permite si todavía no existe una cuenta SUPERADMIN.
 * Uso: npm run admin:bootstrap
 */
const readline = require('node:readline/promises');
const { stdin, stdout } = require('node:process');
const { query, close } = require('../src/db/pool');
const usuarioRepository = require('../src/repositories/usuario.repository');
const { hashPassword } = require('../src/services/password.service');
const { normalizarCorreo, validarCorreo, validarNombre, validarPassword } = require('../src/utils/validate');

function preguntarOculto(etiqueta) {
  if (!stdin.isTTY || typeof stdin.setRawMode !== 'function') {
    return Promise.reject(new Error('La contraseña debe ingresarse desde una terminal interactiva.'));
  }

  return new Promise((resolve, reject) => {
    let valor = '';
    stdout.write(etiqueta);
    stdin.setRawMode(true);
    stdin.resume();

    function terminar(error) {
      stdin.removeListener('data', alRecibir);
      stdin.setRawMode(false);
      stdin.pause();
      stdout.write('\n');
      if (error) reject(error);
      else resolve(valor);
    }

    function alRecibir(datos) {
      const texto = datos.toString('utf8');
      if (texto.includes('\u0003')) return terminar(new Error('Operación cancelada.'));
      if (texto.includes('\r') || texto.includes('\n')) return terminar();
      for (const caracter of texto) {
        if (caracter === '\u007f' || caracter === '\b') valor = valor.slice(0, -1);
        else if (caracter >= ' ') valor += caracter;
      }
    }

    stdin.on('data', alRecibir);
  });
}

async function main() {
  const { rows } = await query(
    `SELECT COUNT(*)::int AS total FROM USUARIO u
     JOIN ROL r ON r.id_rol = u.id_rol
     WHERE r.nombre_rol = 'SUPERADMIN'`
  );
  if (rows[0].total > 0) {
    throw new Error('Ya existe una cuenta SUPERADMIN. Usa el panel de administración o el procedimiento de recuperación.');
  }

  const rl = readline.createInterface({ input: stdin, output: stdout });
  const nombre = (await rl.question('Nombre del SUPERADMIN: ')).trim();
  const correo = normalizarCorreo(await rl.question('Correo del SUPERADMIN: '));
  rl.close();

  const problemas = [validarNombre(nombre), validarCorreo(correo)].filter(Boolean);
  if (problemas.length) throw new Error(problemas.join('; '));

  const password = await preguntarOculto('Contraseña (mínimo 8 caracteres, no se mostrará): ');
  const confirmacion = await preguntarOculto('Repite la contraseña: ');
  const problemaPassword = validarPassword(password);
  if (problemaPassword) throw new Error(problemaPassword);
  if (password !== confirmacion) throw new Error('Las contraseñas no coinciden.');

  const idRol = await usuarioRepository.idPorNombreRol('SUPERADMIN');
  if (!idRol) throw new Error('No existe el rol SUPERADMIN; aplica db/schema.sql primero.');
  const idUsuario = await usuarioRepository.crear({
    idRol,
    nombre,
    correo,
    passwordHash: await hashPassword(password),
  });
  console.log(`Cuenta SUPERADMIN creada con id ${idUsuario}. Retira cualquier acceso temporal y conserva la contraseña en un gestor seguro.`);
}

main()
  .catch((error) => {
    console.error(`[admin:bootstrap] ${error.message}`);
    process.exitCode = 1;
  })
  .finally(() => close());
