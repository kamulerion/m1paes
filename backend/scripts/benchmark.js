'use strict';

/**
 * Benchmark liviano de rutas calientes — RNF-01 (latencia ≤ 2,0 s al 95 %).
 *
 * Uso:
 *   1. Levantar la API:      npm start
 *   2. Ejecutar:             npm run benchmark
 *   Opcional (mide también rutas autenticadas con Argon2 de por medio):
 *      $env:BENCH_CORREO='correo@de.prueba'; $env:BENCH_PASSWORD='...'; npm run benchmark
 *
 * Mide N solicitudes secuenciales por ruta (por defecto 50) con el fetch
 * nativo de Node — sin dependencias externas — y reporta promedio, p50, p95
 * y máximo frente al umbral del informe (sección 13).
 */

const BASE = process.env.BENCH_URL || 'http://127.0.0.1:3000';
const N = Math.max(1, Number(process.env.BENCH_N || 50));
const UMBRAL_MS = 2000; // RNF-01: ≤ 2,0 s (95 %)

/** Ejecuta N mediciones secuenciales de una ruta y calcula percentiles. */
async function medir(etiqueta, ruta, opciones = {}) {
  const tiempos = [];
  const estados = new Set();
  for (let i = 0; i < N; i += 1) {
    const inicio = performance.now();
    const res = await fetch(`${BASE}${ruta}`, opciones);
    await res.arrayBuffer();
    tiempos.push(performance.now() - inicio);
    estados.add(res.status);
  }
  tiempos.sort((a, b) => a - b);
  const pct = (p) => tiempos[Math.min(tiempos.length - 1, Math.floor((p / 100) * tiempos.length))];
  const prom = tiempos.reduce((a, b) => a + b, 0) / tiempos.length;
  return { etiqueta, prom, p50: pct(50), p95: pct(95), max: tiempos[tiempos.length - 1], estados: [...estados].join(',') };
}

/** Login previo para obtener la cookie de sesión (si se pasaron credenciales). */
async function obtenerCookie() {
  const correo = process.env.BENCH_CORREO;
  const password = process.env.BENCH_PASSWORD;
  if (!correo || !password) return null;
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ correo, password }),
  });
  if (!res.ok) throw new Error(`Login de benchmark falló: HTTP ${res.status}`);
  const cookie = (res.headers.get('set-cookie') || '').split(';')[0];
  return cookie || null;
}

(async () => {
  // Verificación previa de que la API responde.
  const salud = await fetch(`${BASE}/api/health`).catch(() => null);
  if (!salud || !salud.ok) {
    console.error(`[benchmark] La API no responde en ${BASE}. Levántala con "npm start".`);
    process.exit(1);
  }

  const cookie = await obtenerCookie();
  const auth = cookie ? { headers: { Cookie: cookie } } : {};

  // El login se mide con credenciales reales cuando están disponibles (la
  // ruta completa con Argon2); sin ellas se usa un correo inexistente y la
  // respuesta será 401/429 según el rate limiting (solo sirve para medir latencia).
  const loginBody = process.env.BENCH_CORREO && process.env.BENCH_PASSWORD
    ? { correo: process.env.BENCH_CORREO, password: process.env.BENCH_PASSWORD }
    : { correo: 'benchmark.no-existe@m1paes.test', password: 'incorrecta_123' };

  const rutas = [
    ['GET /api/health (pública)', '/api/health', {}],
    ['GET /api/health/db (consulta BD)', '/api/health/db', {}],
    ['POST /api/auth/login (Argon2)', '/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(loginBody),
    }],
  ];
  if (cookie) {
    rutas.push(
      ['GET /api/ejes (contenido)', '/api/ejes', auth],
      ['GET /api/progreso (agregados)', '/api/progreso', auth],
      ['GET /api/publicidad (RF-15)', '/api/publicidad', auth]
    );
  }

  console.log(`[benchmark] ${N} solicitudes por ruta contra ${BASE} (${cookie ? 'con sesión' : 'sin sesión'})\n`);
  const resultados = [];
  for (const [etiqueta, ruta, opciones] of rutas) {
    resultados.push(await medir(etiqueta, ruta, opciones));
  }

  console.log('Ruta'.padEnd(38) + 'prom'.padStart(9) + 'p50'.padStart(9) + 'p95'.padStart(9) + 'max'.padStart(9) + '  estados');
  for (const r of resultados) {
    const linea =
      r.etiqueta.padEnd(38) +
      `${r.prom.toFixed(1)}ms`.padStart(9) +
      `${r.p50.toFixed(1)}ms`.padStart(9) +
      `${r.p95.toFixed(1)}ms`.padStart(9) +
      `${r.max.toFixed(1)}ms`.padStart(9) +
      `  ${r.estados}`;
    console.log(linea);
  }

  const peorP95 = Math.max(...resultados.map((r) => r.p95));
  const cumple = peorP95 <= UMBRAL_MS;
  console.log(
    `\n[benchmark] peor p95 = ${peorP95.toFixed(1)} ms — umbral RNF-01 (${UMBRAL_MS} ms): ${cumple ? 'CUMPLE ✅' : 'NO CUMPLE ❌'}`
  );
  process.exit(cumple ? 0 : 1);
})().catch((error) => {
  console.error('[benchmark] error:', error.message);
  process.exit(1);
});
