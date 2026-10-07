'use strict';

/**
 * RF-10 — Parametrización de simulacros (CP-13).
 * Formato oficial por defecto: 65 preguntas / 140 minutos. Además permite
 * componer las preguntas en orden (1..n) con la lista doble del panel.
 */
panelListo.then((listo) => {
  if (!listo) return;

  const mensaje = document.getElementById('sim-mensaje');
  const formulario = document.getElementById('form-simulacro');
  const campoId = document.getElementById('sim-id');
  const boton = document.getElementById('sim-boton');
  const botonCancelar = document.getElementById('sim-cancelar');
  const tbody = document.querySelector('#tabla-simulacros tbody');

  // Panel de composición
  const panelComp = document.getElementById('panel-composicion');
  const msgComp = document.getElementById('comp-mensaje');
  const listaDisponibles = document.getElementById('comp-disponibles');
  const listaOrden = document.getElementById('comp-orden');

  let simulacros = [];
  let disponibles = []; // ejercicios del banco
  let comp = { simulacro: null, orden: [] };

  async function cargar() {
    const datos = await api.get('/api/admin/simulacros');
    simulacros = datos.simulacros;
    tbody.innerHTML = simulacros
      .map(
        (s) => `
        <tr>
          <td>${s.id_simulacro}</td>
          <td>${esc(s.nombre)}</td>
          <td>${s.cantidad_preguntas}</td>
          <td>${s.tiempo_limite_minutos} min</td>
          <td>${s.preguntas}</td>
          <td>${fechaCorta(s.fecha_creacion)}</td>
          <td class="acciones">
            <button type="button" data-accion="parametrizar" data-id="${s.id_simulacro}">Parametrizar</button>
            <button type="button" data-accion="componer" data-id="${s.id_simulacro}">Componer</button>
          </td>
        </tr>`
      )
      .join('');
  }

  function limpiarFormulario() {
    formulario.reset();
    campoId.value = '';
    document.getElementById('sim-cantidad').value = '65';
    document.getElementById('sim-tiempo').value = '140';
    boton.textContent = 'Crear simulacro';
    botonCancelar.classList.add('oculto');
    mostrarMensaje(mensaje, '');
  }

  formulario.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    mostrarMensaje(mensaje, '');
    const nombre = document.getElementById('sim-nombre').value.trim();
    const cantidad = Number(document.getElementById('sim-cantidad').value);
    const tiempo = Number(document.getElementById('sim-tiempo').value);
    if (!nombre) return mostrarMensaje(mensaje, 'El nombre es obligatorio.');

    try {
      const esEdicion = Boolean(campoId.value);
      if (esEdicion) {
        await api.put(`/api/admin/simulacros/${campoId.value}`, {
          nombre,
          cantidad_preguntas: cantidad,
          tiempo_limite_minutos: tiempo,
        });
      } else {
        await api.post('/api/admin/simulacros', {
          nombre,
          cantidad_preguntas: cantidad,
          tiempo_limite_minutos: tiempo,
        });
      }
      limpiarFormulario();
      mostrarMensaje(
        mensaje,
        esEdicion
          ? 'Simulacro reparametrizado.'
          : 'Simulacro creado (formato PAES si usas 65/140).',
        'exito'
      );
      await cargar();
    } catch (error) {
      mostrarMensaje(mensaje, error.message);
    }
  });

  botonCancelar.addEventListener('click', limpiarFormulario);

  tbody.addEventListener('click', async (evento) => {
    const botonFila = evento.target.closest('button[data-accion]');
    if (!botonFila) return;
    const simulacro = simulacros.find((s) => s.id_simulacro === Number(botonFila.dataset.id));
    if (!simulacro) return;

    try {
      if (botonFila.dataset.accion === 'parametrizar') {
        campoId.value = simulacro.id_simulacro;
        document.getElementById('sim-nombre').value = simulacro.nombre;
        document.getElementById('sim-cantidad').value = String(simulacro.cantidad_preguntas);
        document.getElementById('sim-tiempo').value = String(simulacro.tiempo_limite_minutos);
        boton.textContent = 'Guardar cambios';
        botonCancelar.classList.remove('oculto');
        mostrarMensaje(mensaje, `Editando «${simulacro.nombre}».`, 'exito');
        document.getElementById('sim-nombre').focus();
        return;
      }

      if (botonFila.dataset.accion === 'componer') {
        await abrirComposicion(simulacro);
      }
    } catch (error) {
      mostrarMensaje(mensaje, error.message);
    }
  });

  // --- Composición de preguntas (lista doble) ---

  async function abrirComposicion(simulacro) {
    const [actuales, banco] = await Promise.all([
      api.get(`/api/admin/simulacros/${simulacro.id_simulacro}/preguntas`),
      api.get('/api/admin/ejercicios'),
    ]);
    comp = { simulacro, orden: actuales.preguntas.map((p) => p.id_ejercicio) };
    disponibles = banco.ejercicios;
    panelComp.classList.remove('oculto');
    document.getElementById('comp-titulo').textContent =
      `Composición de «${simulacro.nombre}» — ${simulacro.cantidad_preguntas} preguntas / ${simulacro.tiempo_limite_minutos} min`;
    mostrarMensaje(msgComp, '');
    pintarComposicion();
    panelComp.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function textoEjercicio(id) {
    const ejercicio = disponibles.find((e) => e.id_ejercicio === id);
    if (!ejercicio) return `Ejercicio #${id}`;
    const texto = ejercicio.enunciado.length > 70
      ? `${ejercicio.enunciado.slice(0, 70)}…`
      : ejercicio.enunciado;
    return `#${id} · ${texto}`;
  }

  function pintarComposicion() {
    const enUso = new Set(comp.orden);

    listaDisponibles.innerHTML = disponibles
      .filter((e) => !enUso.has(e.id_ejercicio))
      .map(
        (e) => `
        <li>
          <span class="texto-item">${esc(textoEjercicio(e.id_ejercicio))}</span>
          <button type="button" data-accion="agregar" data-id="${e.id_ejercicio}"
                  aria-label="Agregar ejercicio ${e.id_ejercicio} a la composición">＋</button>
        </li>`
      )
      .join('') || '<li><span class="texto-item">Sin ejercicios disponibles.</span></li>';

    listaOrden.innerHTML = comp.orden
      .map((id, i) => `
        <li>
          <span class="etiqueta">${i + 1}.</span>
          <span class="texto-item">${esc(textoEjercicio(id))}</span>
          <button type="button" data-accion="subir" data-id="${id}" ${i === 0 ? 'disabled' : ''}
                  aria-label="Subir el ejercicio ${id}">↑</button>
          <button type="button" data-accion="bajar" data-id="${id}" ${i === comp.orden.length - 1 ? 'disabled' : ''}
                  aria-label="Bajar el ejercicio ${id}">↓</button>
          <button type="button" class="peligro" data-accion="quitar" data-id="${id}"
                  aria-label="Quitar el ejercicio ${id}">✕</button>
        </li>`)
      .join('') || '<li><span class="texto-item">Sin preguntas: usa «＋» para agregar.</span></li>';
  }

  listaDisponibles.addEventListener('click', (evento) => {
    const botonAgregar = evento.target.closest('button[data-accion="agregar"]');
    if (!botonAgregar) return;
    if (comp.orden.length >= comp.simulacro.cantidad_preguntas) {
      return mostrarMensaje(msgComp, `Límite alcanzado: ${comp.simulacro.cantidad_preguntas} preguntas.`);
    }
    comp.orden.push(Number(botonAgregar.dataset.id));
    mostrarMensaje(msgComp, '');
    pintarComposicion();
  });

  listaOrden.addEventListener('click', (evento) => {
    const botonFila = evento.target.closest('button[data-accion]');
    if (!botonFila) return;
    const id = Number(botonFila.dataset.id);
    const indice = comp.orden.indexOf(id);
    if (indice < 0) return;

    if (botonFila.dataset.accion === 'quitar') comp.orden.splice(indice, 1);
    if (botonFila.dataset.accion === 'subir' && indice > 0) {
      [comp.orden[indice - 1], comp.orden[indice]] = [comp.orden[indice], comp.orden[indice - 1]];
    }
    if (botonFila.dataset.accion === 'bajar' && indice < comp.orden.length - 1) {
      [comp.orden[indice + 1], comp.orden[indice]] = [comp.orden[indice], comp.orden[indice + 1]];
    }
    pintarComposicion();
  });

  document.getElementById('comp-guardar').addEventListener('click', async () => {
    try {
      const datos = await api.put(`/api/admin/simulacros/${comp.simulacro.id_simulacro}/preguntas`, {
        id_ejercicios: comp.orden,
      });
      mostrarMensaje(msgComp, datos.mensaje, 'exito');
      await cargar();
    } catch (error) {
      mostrarMensaje(msgComp, error.message);
    }
  });

  document.getElementById('comp-cerrar').addEventListener('click', () => {
    panelComp.classList.add('oculto');
    comp = { simulacro: null, orden: [] };
  });

  document.addEventListener('seccion-activada', (evento) => {
    if (evento.detail === 'simulacros') cargar().catch(() => {});
  });

  cargar().catch((error) => mostrarMensaje(mensaje, error.message));
});
