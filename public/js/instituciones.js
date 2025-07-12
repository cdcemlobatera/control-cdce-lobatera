//instituciones.js Lote 1
import { validarCampos } from './utils/validacion.js';
import { crearTablaConFiltros } from './tablasCDCE.js';

const supabase = window.supabase;

function cerrarFormulario() {
  document.getElementById('modalRegistro').style.display = 'none';
}

function editar(codigodea) {
  const inst = window.instituciones?.find(i => i.codigodea === codigodea);
  if (inst) abrirFormulario(inst);
}

function abrirFormulario(institucion = null) {
  const form = document.getElementById('formInstitucion');
  if (!form) return;

  form.querySelectorAll('.mensaje-validacion').forEach(span => span.textContent = '');
  form.querySelectorAll('.resaltado-error').forEach(el => el.classList.remove('resaltado-error'));
  form.reset();

  const modo = institucion ? 'editar' : 'crear';

  document.getElementById('modoFormulario').value = modo;
  document.getElementById('idInstitucionEditar').value = institucion?.codigodea || '';
  document.getElementById('mensajeDEA').textContent = '';
  const titulo = document.getElementById('tituloFormulario');
  if (titulo) titulo.textContent = modo === 'editar' ? '✏️ Editar Institución' : '🏫 Nueva Institución';
  document.getElementById('codigodea').readOnly = (modo === 'editar');

  cargarCircuitos().then(() => {
    const selCircuito = document.getElementById('codcircuitoedu');
    if (selCircuito && !selCircuito.dataset.listenerAsignado) {
      selCircuito.addEventListener('change', mostrarDetalleSupervisor);
      selCircuito.dataset.listenerAsignado = 'true';
    }

    if (institucion) {
      for (const [clave, valor] of Object.entries(institucion)) {
        if (form[clave]) form[clave].value = valor || '';
      }

      if (selCircuito) {
        selCircuito.value = institucion.codcircuitoedu;
        selCircuito.dispatchEvent(new Event('change'));
      }

      mostrarDatosDirector({
        nombresapellidosrep: institucion.nombredirector || '',
        telefono: institucion.telefonodirector || '',
        correo: institucion.correodirector || ''
      });
    } else {
      const detalle = document.getElementById('detalleCircuito');
      if (detalle) detalle.textContent = 'ℹ️ Seleccione un circuito para ver su zona';
    }

    document.getElementById('modalRegistro').style.display = 'block';
    document.getElementById('codigodea').scrollIntoView({ behavior: 'smooth', block: 'start' });
    actualizarVisibilidadBotonEliminar();
    asignarListenerEliminarSiHaceFalta();
  });
}

function actualizarVisibilidadBotonEliminar() {
  const modo = document.getElementById('modoFormulario')?.value;
  const btnEliminar = document.getElementById('btnEliminarInstitucion');
  if (!btnEliminar) return;
  btnEliminar.style.display = modo === 'editar' ? 'inline-block' : 'none';
}

function mostrarDetalleSupervisor() {
  const selCircuito = document.getElementById('codcircuitoedu');
  const dSupervisor = document.getElementById('detalleSupervisor');
  if (!selCircuito || !dSupervisor) return;

  const opcion = selCircuito.options[selCircuito.selectedIndex];
  const supervisorData = opcion?.dataset?.supervisor ? JSON.parse(opcion.dataset.supervisor) : {};

  if (supervisorData.nombresapellidos) {
    dSupervisor.innerHTML = `
      👤 <strong>${supervisorData.nombresapellidos}</strong><br>
      📞 ${supervisorData.telefono}<br>
      📧 <a href="mailto:${supervisorData.correo}">${supervisorData.correo}</a>
    `;
  } else {
    dSupervisor.textContent = '👤 Sin asignar';
  }
}

async function cargarResumen() {
  const refs = {
    instituciones: document.getElementById('totalInstituciones'),
    dependencias: document.getElementById('totalDependencias'),
    niveles: document.getElementById('totalNiveles'),
    directores: document.getElementById('totalDirectores')
  };

  for (const el of Object.values(refs)) el.textContent = '⌛';

  try {
    const res = await fetch('/instituciones/resumen');
    const data = await res.json();

    const animar = (el, final) => {
      let valor = parseInt(el.textContent) || 0;
      const paso = (final - valor) / 20;
      let contador = 0;

      const intervalo = setInterval(() => {
        contador++;
        el.textContent = Math.round(valor + paso * contador);
        if (contador >= 20) {
          el.textContent = final;
          el.classList.add('pop');
          clearInterval(intervalo);
          setTimeout(() => el.classList.remove('pop'), 400);
        }
      }, 20);
    };

    animar(refs.instituciones, data.totalInstituciones ?? 0);
    animar(refs.dependencias, data.totalDependencias ?? 0);
    animar(refs.niveles, data.totalNiveles ?? 0);
    animar(refs.directores, data.totalDirectores ?? 0);
  } catch (err) {
    console.error('❌ Resumen no disponible:', err);
    for (const el of Object.values(refs)) el.textContent = '—';
  }
}

async function cargarCircuitos() {
  try {
    const res = await fetch('/circuitos/listar');
    if (!res.ok) throw new Error(await res.text());

    const datos = await res.json();
    const select = document.getElementById('codcircuitoedu');
    if (!select) return;

    select.innerHTML = '<option value="">Seleccione un circuito</option>';

    datos.forEach(c => {
      const option = document.createElement('option');
      option.value = c.codcircuitoedu;
      option.textContent = `${c.codcircuitoedu} — ${c.nombrecircuito}`;
      option.dataset.zona = c.zona || '';
      option.dataset.supervisor = JSON.stringify(c.supervisor || {});
      select.appendChild(option);
    });

    if (!select.dataset.listenerAsignado) {
      select.dataset.listenerAsignado = 'true';
      select.addEventListener('change', () => {
        const opcion = select.options[select.selectedIndex];
        const zona = opcion?.dataset?.zona || '';
        const dZona = document.getElementById('detalleCircuito');
        if (dZona) dZona.textContent = zona ? `🗺️ Zona: ${zona}` : '';

        mostrarDetalleSupervisor();
      });
    }
  } catch (err) {
    console.error('❌ Error al cargar circuitos:', err);
    const select = document.getElementById('codcircuitoedu');
    if (select) select.innerHTML = '<option value="">Error al cargar</option>';
  }
}

//Lote 2

function asignarListenerEliminarSiHaceFalta() {
  const btnEliminar = document.getElementById('btnEliminarInstitucion');
  if (btnEliminar && !btnEliminar.dataset.listenerAsignado) {
    btnEliminar.dataset.listenerAsignado = 'true';
    btnEliminar.addEventListener('click', () => {
      const codigodea = document.getElementById('codigodea').value.trim();
      if (codigodea) eliminarInstitucion(codigodea);
    });
  }
}

function validarDEA() {
  const codigo = document.getElementById('codigodea').value.trim();
  const mensaje = document.getElementById('mensajeDEA');
  if (!codigo) return mensaje.textContent = '';

  fetch('/instituciones/listar')
    .then(res => res.json())
    .then(lista => {
      const existe = lista.some(inst => inst.codigodea === codigo);
      mensaje.textContent = existe ? '⚠️ Este Código DEA ya está registrado.' : '';
    })
    .catch(err => {
      mensaje.textContent = '❌ Error al validar Código DEA.';
      console.error(err);
    });
}

// 🔹 Función reutilizable para mostrar campos del director

function mostrarDatosDirector(director) {
  document.getElementById('nombredirector').value = director?.nombresapellidosrep || '';
  document.getElementById('telefonodirector').value = director?.telefono || '';
  document.getElementById('correodirector').value = director?.correo || '';
}

// 🔹 DIRECTOR: Buscar y sugerir

async function sugerirDirector() {
  const texto = document.getElementById('ceduladirector').value.trim();
  const datalist = document.getElementById('listaDirectores');

  try {
    const res = await fetch(`/directores/buscar?q=${texto}`);
    const data = await res.json();

    // 👇 Protección contra errores de formato
    if (!Array.isArray(data)) {
      datalist.innerHTML = '';
      return;
    }

    datalist.innerHTML = '';
    data.forEach(director => {
      const option = document.createElement('option');
      option.value = director.cedula;
      option.label = director.nombresapellidosrep;
      datalist.appendChild(option);
    });
  } catch (e) {
    console.error('Error en sugerencia de directores:', e);
    datalist.innerHTML = '';
  }
}

async function buscarDirector() {
  const cedula = document.getElementById('ceduladirector').value.trim();
  if (!cedula) return;

  try {
    const res = await fetch(`/directores/cedula/${cedula}`);
    const data = await res.json();
    mostrarDatosDirector(data);
  } catch {
    mostrarDatosDirector({});
  }
}

async function buscarDirectoresSugeridos(texto) {
  const lista = document.getElementById('listaSugerenciasDirector');
  lista.innerHTML = '';

  if (!texto || texto.trim().length < 3) return;

  try {
    const res = await fetch(`/directores/buscar?q=${texto.trim()}`);
    const data = await res.json();

    if (!Array.isArray(data)) return;

    data.forEach(director => {
      const item = document.createElement('li');
      item.textContent = `${director.nombresapellidos} (${director.cedula})`;
      item.onclick = () => {
        document.getElementById('ceduladirector').value = director.cedula;
        buscarDirector(); // ← rellena nombre, teléfono y correo
        lista.innerHTML = '';
      };
      lista.appendChild(item);
    });

    if (data.length === 0) {
      const noResults = document.createElement('li');
      noResults.textContent = 'No se encontraron coincidencias';
      lista.appendChild(noResults);
    }
  } catch (e) {
    console.error('❌ Error en buscarDirectoresSugeridos:', e);
  }
}

// 🪄 Exponer al HTML si usas type="module"
window.buscarDirectoresSugeridos = buscarDirectoresSugeridos;

function limpiarSugerencias() {
  document.getElementById('listaSugerenciasDirector').innerHTML = '';
}

// Lote 3

document.getElementById('formInstitucion').addEventListener('submit', async function (e) {
  e.preventDefault();
  const form = e.target;

  const camposObligatorios = [
    { id: 'codigodea', mensaje: '⚠️ El código DEA es obligatorio.', span: 'mensajeDEA' },
    { id: 'nombreplantel', mensaje: '⚠️ El nombre del plantel es obligatorio.', span: 'mensajeNombre' },
    { id: 'ceduladirector', mensaje: '⚠️ La cédula del director es obligatoria.', span: 'mensajeDirector' },
    { id: 'codigodep', mensaje: '⚠️ Código de dependencia requerido.', span: 'mensajeCodDependencia' },
    { id: 'dependencia', mensaje: '⚠️ Debes seleccionar una dependencia.', span: 'mensajeDependencia' },
    { id: 'niveledu', mensaje: '⚠️ El nivel educativo es obligatorio.', span: 'mensajeNivel' },
    { id: 'turno', mensaje: '⚠️ Debes seleccionar un turno.', span: 'mensajeturno' },
    { id: 'parroquia', mensaje: '⚠️ Selecciona una parroquia.', span: 'mensajeParroquia' },
    { id: 'status', mensaje: '⚠️ El estatus de la institución es obligatorio.', span: 'mensajeStatus' },
    { id: 'codcircuitoedu', mensaje: '⚠️ Debes seleccionar un circuito educativo.', span: 'mensajeCircuito' }
  ];

  if (!validarCampos(camposObligatorios)) return;

  const modo = document.getElementById('modoFormulario').value;
  const idEditar = document.getElementById('idInstitucionEditar').value;

  const endpoint = modo === 'editar' ? `/instituciones/${idEditar}` : '/instituciones/nueva';
  const metodo = modo === 'editar' ? 'PATCH' : 'POST';

  const datos = {
    codigodea: form.codigodea.value.trim(),
    nombreplantel: form.nombreplantel.value.trim(),
    codigodep: form.codigodep.value.trim(),
    dependencia: form.dependencia.value,
    niveledu: form.niveledu.value,
    parroquia: form.parroquia.value,
    ceduladirector: form.ceduladirector.value.trim(),
    status: form.status.value,
    registrado: modo === 'editar' ? form.registrado?.value || new Date().toISOString() : new Date().toISOString(),
    codcircuitoedu: form.codcircuitoedu.value,
    codestadistico: form.codestadistico.value.trim(),
    codcenvot: form.codcenvot.value.trim(),
    nombrecenvot: form.nombrecenvot.value.trim(),
    turno: form.turno.value,
    eponimoanterior: form.eponimoanterior.value
  };

  try {
    const res = await fetch(endpoint, {
      method: metodo,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datos)
    });

    if (res.ok) {
      alert(modo === 'editar' ? '✅ Institución modificada con éxito' : '✅ Institución registrada con éxito');
      cerrarFormulario();
      await cargarResumen();
      location.reload();
    } else {
      const errorTexto = await res.text();
      alert(`❌ Error al guardar: ${errorTexto}`);
      console.error(errorTexto);
    }
  } catch (err) {
    alert(`🚨 Error inesperado: ${err.message}`);
    console.error(err);
  }
}

);

async function cargarCircuitosFiltro() {
  const filtro = document.getElementById('filtroCircuito');
  if (!filtro) return;

  const { data: circuitos, error } = await supabase
    .from('circuitoseducativos')
    .select('codcircuitoedu, nombrecircuito')
    .order('nombrecircuito', { ascending: true });

  if (error) {
    console.error('❌ Error al cargar circuitos para filtro:', error.message);
    return;
  }

  filtro.innerHTML = '<option value="">Todos los circuitos</option>';

  for (const circuito of circuitos) {
    const opt = document.createElement('option');
    opt.value = circuito.codcircuitoedu;
    opt.textContent = circuito.nombrecircuito;
    filtro.appendChild(opt);
  }
}

// Lote 4

// 🔹 CARGA Y RENDER DE TABLA DINÁMICA

document.addEventListener('DOMContentLoaded', async () => {
  await cargarResumen();
  await cargarCircuitosFiltro();

  let instituciones = [];
  const { data, error } = await supabase.from('instituciones').select('*');
  if (error) {
    console.error('❌ Error al cargar instituciones:', error.message);
  } else {
    instituciones = data;
    window.instituciones = instituciones;
  }

  for (const inst of instituciones) {
    const { data: director } = await supabase
      .from('raclobatera')
      .select('nombresapellidosrep, telefono, correo')
      .eq('cedula', inst.ceduladirector)
      .single();

    inst.nombredirector = director?.nombresapellidosrep || '—';
    inst.telefonodirector = director?.telefono || '—';
    inst.correodirector = director?.correo || '';
  }

  crearTablaConFiltros({
    idTabla: 'tablaInstituciones',
    datos: instituciones,
    columnas: [
      { key: 'codigodea', title: 'Código DEA' },
      { key: 'nombreplantel', title: 'Nombre del Plantel' },
      { key: 'nombredirector', title: 'Director' },
      { key: 'telefonodirector', title: 'Teléfono' },
      { key: 'turno', title: 'Turno', visible: false },
      { key: 'dependencia', title: 'Dependencia', visible: false },
      { key: 'niveledu', title: 'Nivel', visible: false },
      { key: 'codcircuitoedu', title: 'Circuito', visible: false },
      {
        key: 'acciones',
        title: 'Acciones',
        orderable: false,
        searchable: false,
        defaultContent: '',
        render: (data, type, row) => {
          return `
            <button title="Editar" onclick="editar('${row.codigodea}')" class="boton-editar">✏️</button>
            <button title="Eliminar" onclick="eliminarInstitucion('${row.codigodea}')" class="boton-eliminar">🗑️</button>
          `;
        },
      },
    ],
    filtros: [
      { idSelect: 'filtroTurno', columnaIndex: 4 },
      { idSelect: 'filtroDependencia', columnaIndex: 5 },
      { idSelect: 'filtroNivel', columnaIndex: 6 },
      { idSelect: 'filtroCircuito', columnaIndex: 7 }
    ]
  });

  document.getElementById('cargandoTabla').style.display = 'none';
});

// Lote 5

// 🔹 FUNCIONES EXPUESTAS AL CONTEXTO GLOBAL

window.abrirFormulario = abrirFormulario;
window.validarDEA = validarDEA;
window.buscarDirector = buscarDirector;
window.sugerirDirector = sugerirDirector;
window.mostrarDatosDirector = mostrarDatosDirector;
window.cerrarFormulario = cerrarFormulario;
window.editar = editar;
window.cargarCircuitos = cargarCircuitos;
window.cargarResumen = cargarResumen;
window.mostrarDetalleSupervisor = mostrarDetalleSupervisor;
window.cargarCircuitosFiltro = cargarCircuitosFiltro;

// 🔹 FUNCIÓN GLOBAL PARA ELIMINAR INSTITUCIÓN

window.eliminarInstitucion = async function (codigodea) {
  const { isConfirmed } = await Swal.fire({
    title: '¿Eliminar institución?',
    text: `Esto eliminará permanentemente el registro con DEA: ${codigodea}`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Sí, eliminar',
    cancelButtonText: 'Cancelar'
  });

  if (!isConfirmed) return;

  try {
    const res = await fetch(`/instituciones/${codigodea}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('No se pudo eliminar');

    await Swal.fire('✅ Eliminado', 'La institución fue eliminada exitosamente.', 'success');
    cerrarFormulario?.();
    document.getElementById('formInstitucion')?.reset();
    document.getElementById('modoFormulario').value = 'crear';
    document.getElementById('idInstitucionEditar').value = '';
    document.getElementById('codigodea').readOnly = false;
    document.getElementById('mensajeDEA').textContent = '';
    document.getElementById('detalleSupervisor').textContent = '';
    mostrarDatosDirector({});
    await cargarResumen?.();
    location.reload();
  } catch (err) {
    console.error('❌ Error al eliminar:', err);
    Swal.fire('Error', 'Hubo un problema al eliminar la institución.', 'error');
  }
};