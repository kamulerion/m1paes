'use strict';

/**
 * RF-15 — Pruebas unitarias de la segmentación de publicidad (CP-21, nivel U).
 * La regla de negocio vive en `publicidad.service` sin BD ni HTTP:
 * solo la modalidad FREE recibe el catálogo de anuncios CFT/IP.
 */
const { ANUNCIOS, obtenerAnuncios } = require('../src/services/publicidad.service');

describe('publicidad.service (RF-15)', () => {
  test('la modalidad FREE recibe el catálogo de anuncios CFT/IP', () => {
    const anuncios = obtenerAnuncios('FREE');
    expect(anuncios.length).toBeGreaterThanOrEqual(1);
    for (const anuncio of anuncios) {
      expect(Object.keys(anuncio).sort()).toEqual(['id', 'institucion', 'texto', 'titulo']);
      expect(anuncio.id).toMatch(/^[a-z0-9-]+$/);
      expect(anuncio.institucion).toMatch(/CFT|IP/); // centros de formación técnica
    }
  });

  test('la modalidad INSTITUCIONAL no recibe anuncios', () => {
    expect(obtenerAnuncios('INSTITUCIONAL')).toEqual([]);
  });

  test('una cuenta sin modalidad definida tampoco recibe anuncios (defensa)', () => {
    expect(obtenerAnuncios(undefined)).toEqual([]);
    expect(obtenerAnuncios(null)).toEqual([]);
    expect(obtenerAnuncios('PREMIUM')).toEqual([]);
  });

  test('el catálogo es inmutable (no se puede alterar desde un controller)', () => {
    expect(Object.isFrozen(ANUNCIOS)).toBe(true);
    expect(() => {
      'use strict';
      ANUNCIOS.push({ id: 'intruso' });
    }).toThrow(TypeError);
  });
});
