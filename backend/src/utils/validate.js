'use strict';

const { AppError } = require('./AppError');

/**
 * Validación de entrada (sin dependencias externas — ADR-001).
 * Cada función devuelve el mensaje de problema o null si el dato es válido.
 */

const RE_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Normaliza el correo (minúsculas y sin espacios) para comparar/almacenar. */
function normalizarCorreo(valor) {
  return String(valor ?? '').trim().toLowerCase();
}

function validarCorreo(correo) {
  if (!correo) return 'el correo es obligatorio';
  if (correo.length > 150) return 'el correo no puede superar 150 caracteres';
  if (!RE_CORREO.test(correo)) return 'el formato del correo no es válido';
  return null;
}

function validarPassword(password) {
  if (typeof password !== 'string' || password.length === 0) {
    return 'la contraseña es obligatoria';
  }
  if (password.length < 8) return 'la contraseña debe tener al menos 8 caracteres';
  if (password.length > 128) return 'la contraseña no puede superar 128 caracteres';
  return null;
}

function validarNombre(nombre) {
  if (typeof nombre !== 'string' || nombre.trim().length === 0) {
    return 'el nombre es obligatorio';
  }
  if (nombre.trim().length < 2) return 'el nombre debe tener al menos 2 caracteres';
  if (nombre.trim().length > 100) return 'el nombre no puede superar 100 caracteres';
  return null;
}

/** Texto obligatorio con longitud máxima (mensajes parametrizados). */
function validarObligatorio(valor, etiqueta, maximo = 1000, minimo = 1) {
  const texto = typeof valor === 'string' ? valor.trim() : '';
  if (texto.length < minimo) return `${etiqueta} es obligatorio`;
  if (texto.length > maximo) return `${etiqueta} no puede superar ${maximo} caracteres`;
  return null;
}

/** Entero dentro de un rango (para cantidades y límites del informe). */
function validarEntero(valor, etiqueta, minimo, maximo) {
  if (!Number.isInteger(valor)) return `${etiqueta} debe ser un número entero`;
  if (valor < minimo) return `${etiqueta} debe ser al menos ${minimo}`;
  if (valor > maximo) return `${etiqueta} no puede superar ${maximo}`;
  return null;
}

/** URL opcional (http/https) con longitud máxima. */
function validarUrlOpcional(valor, etiqueta, maximo = 255) {
  if (valor === undefined || valor === null || valor === '') return null;
  if (typeof valor !== 'string' || valor.length > maximo) {
    return `${etiqueta} no puede superar ${maximo} caracteres`;
  }
  if (!/^https?:\/\/\S+$/i.test(valor)) return `${etiqueta} debe ser una URL http(s) válida`;
  return null;
}

/** Dificultad del ejercicio (CHECK del esquema). */
function validarDificultad(valor) {
  if (valor === undefined) return null;
  if (!['FACIL', 'MEDIA', 'DIFICIL'].includes(valor)) {
    return 'la dificultad debe ser FACIL, MEDIA o DIFICIL';
  }
  return null;
}

/**
 * Reglas de negocio del RF-09 / CP-12: entre 4 y 5 alternativas y
 * exactamente una marcada como correcta.
 */
function validarAlternativas(alternativas) {
  if (!Array.isArray(alternativas)) return 'las alternativas deben ser una lista';
  if (alternativas.length < 4 || alternativas.length > 5) {
    return 'el ejercicio debe tener entre 4 y 5 alternativas';
  }
  let correctas = 0;
  for (const alternativa of alternativas) {
    if (!alternativa || typeof alternativa.texto !== 'string' || !alternativa.texto.trim()) {
      return 'cada alternativa debe tener texto';
    }
    if (alternativa.texto.trim().length > 500) return 'una alternativa supera los 500 caracteres';
    if (alternativa.es_correcta) correctas += 1;
  }
  if (correctas !== 1) return 'exactamente una alternativa debe ser la correcta';
  return null;
}

/** Fecha y hora obligatorias en formato ISO 8601 (calendario, RF-16). */
function validarFechaHora(valor, etiqueta) {
  if (typeof valor !== 'string' || !valor.trim()) return `${etiqueta} es obligatoria`;
  if (Number.isNaN(Date.parse(valor))) {
    return `${etiqueta} debe ser una fecha y hora válidas (formato ISO 8601)`;
  }
  return null;
}

/** Si hay problemas, lanza un AppError 400 con todos ellos (menajes ida y vuelta). */
function lanzarSiInvalido(errores) {
  const campos = errores.filter(Boolean);
  if (campos.length > 0) {
    throw new AppError(400, 'Datos inválidos', { campos });
  }
}

/** Convierte un :id de ruta a entero positivo o lanza un AppError 400. */
function idDeRuta(valor) {
  const id = Number(valor);
  if (!Number.isInteger(id) || id <= 0) throw new AppError(400, 'Identificador inválido');
  return id;
}

module.exports = {
  normalizarCorreo,
  validarCorreo,
  validarPassword,
  validarNombre,
  validarObligatorio,
  validarEntero,
  validarUrlOpcional,
  validarDificultad,
  validarAlternativas,
  validarFechaHora,
  lanzarSiInvalido,
  idDeRuta,
};
