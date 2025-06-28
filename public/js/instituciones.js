// 🔹 UTILIDADES GENERALES
function abrirFormulario() {
  document.getElementById('modalRegistro').style.display = 'block';
}

function cerrarFormulario() {
  document.getElementById('modalRegistro').style.display = 'none';
}

function mostrarFormulario() {
  abrirFormulario();
}

function eliminar(codigodea) {
  alert("Confirmar eliminación de: " + codigodea);
}

// 🔹 VALIDACIÓN DE CÓDIGO DEA
async function validarDEA() {
  const codigo = document.getElementById('codigodea').value.trim();
  const mensaje = document.getElementById('mensajeDEA');
  if (!codigo) return mensaje.textContent = '';

  const res = await fetch(`/instituciones/listar`);
  if (!res.ok) return mensaje.textContent = 'Error al validar Código DEA.';

  const lista = await res.json();
  const existe = lista.some(inst => inst.codigodea === codigo);
  mensaje.textContent = existe ? '⚠️ Este Código DEA ya está registrado.' : '';
}

// 🔹 BÚSQUEDA Y SUGERENCIAS DE DIRECTOR
async function buscarDirector() {
  const cedula = document.getElementById('ceduladirector').value.trim();
  if (!cedula) return;

  const res = await fetch(`/directores/cedula/${cedula}`);
  const data = res.ok ? await res.json() : null;

  document.getElementById('nombredirector').value = data?.nombresapellidosrep || '';
  document.getElementById('telefonodirector').value = data?.telefono || '';
  document.getElementById('correodirector').value = data?.correo || '';
}

async function sugerirDirector() {
  const input = document.getElementById('ceduladirector');
  const texto = input.value.trim();
  const datalist = document.getElementById('listaDirectores');
  if (texto.length < 3) return datalist.innerHTML = '';

  const res = await fetch(`/directores/buscar?q=${encodeURIComponent(texto)}`);
  const data = await res.json();

  datalist.innerHTML = '';
  data.forEach(d => {
    const option = document.createElement('option');
    option.value = d.cedula;
    datalist.appendChild(option);
  });
}

// 🔹 RESUMEN ESTADÍSTICO
// 🔹 Mostrar resumen con validación, animación y fallback
async function cargarResumen() {
  
  const indicadores = {
    instituciones: document.getElementById('totalInstituciones'),
    dependencias: document.getElementById('totalDependencias'),
    niveles: document.getElementById('totalNiveles'),
    directores: document.getElementById('totalDirectores')
  };

  // ❗ Validar existencia de elementos en el DOM
  if (!Object.values(indicadores).every(el => el)) {
    console.warn('⚠️ Algunos elementos del resumen no existen en el DOM aún.');
    return;
  }

  // ⏳ Mostrar animación de carga
  for (let campo in indicadores) {
    indicadores[campo].textContent = '⌛';
  }

  try {
    const urlResumen = 'https://ubiquitous-umbrella-r4xw497w9v6qhpgr4-3000.app.github.dev/instituciones/resumen';
    console.log('🌐 Solicitando resumen desde:', urlResumen);
    const res = await fetch(urlResumen);


    console.log('🔍 Ejecutando cargarResumen');

    if (!res.ok) throw new Error('Error al obtener resumen');

    const data = await res.json();
    console.log('📊 Resumen recibido:', data);

    // 🎯 Función para animar los números (de 0 al valor final)
    const animarContador = (elemento, valorFinal) => {
      let actual = 0;
      const paso = Math.ceil(valorFinal / 25);
      const intervalo = setInterval(() => {
        actual += paso;
        if (actual >= valorFinal) {
          elemento.textContent = valorFinal;
          clearInterval(intervalo);

          // ✨ Rebote visual al llegar al número final
          elemento.classList.add('pop');
          setTimeout(() => elemento.classList.remove('pop'), 400);
        } else {
          elemento.textContent = actual;
        }
      }, 20);
    };

    // ⏫ Ejecutar animaciones
    animarContador(indicadores.instituciones, data.totalInstituciones ?? 0);
    animarContador(indicadores.dependencias, data.totalDependencias ?? 0);
    animarContador(indicadores.niveles, data.totalNiveles ?? 0);
    animarContador(indicadores.directores, data.totalDirectores ?? 0);

    console.log('🌐 Solicitando resumen desde:', `${baseURL}/instituciones/resumen`);

  } 
  
  catch (error) {
    console.error('❌ Resumen no disponible:', error);
    for (let campo in indicadores) {
      indicadores[campo].textContent = '—';
    }

    //const aviso = document.getElementById('mensajeResumen');
    //if (aviso) aviso.textContent = '⚠️ No se pudo obtener el resumen institucional.';
  }
}

// 🔹 CARGA DE DATOS PARA EDICIÓN
function cargarInstitucionParaEditar(inst) {
  // 1. Asegurar que el formulario esté visible ANTES de usar los inputs
  mostrarFormulario(); // ✅ Activa el modal para que el DOM esté listo

  // 2. Modo edición activado
  document.getElementById('modoFormulario').value = 'editar';
  document.getElementById('idInstitucionEditar').value = inst.codigodea;

  // 3. Campo DEA: solo lectura
  const campoDEA = document.getElementById('codigodea');
  campoDEA.value = inst.codigodea || '';
  campoDEA.readOnly = true; // 🔒 evitar cambios

  // 4. Campos editables
  document.getElementById('nombreplantel').value = inst.nombreplantel || '';
  document.getElementById('codigodep').value = inst.codigodep || '';
  document.getElementById('dependencia').value = inst.dependencia || '';
  document.getElementById('niveledu').value = inst.niveledu || '';
  document.getElementById('parroquia').value = inst.parroquia || '';
  document.getElementById('ceduladirector').value = inst.ceduladirector || '';
  document.getElementById('status').value = inst.status || '';

  // 5. Forzar la carga de datos del director desde raclobatera
  buscarDirector(); // 🔁 trae nombres, teléfono y correo referencial
}

window.editar = async function (codigodea) {
  try {
    const res = await fetch(`/instituciones/${codigodea}`);
    if (!res.ok) throw new Error("No se pudo cargar la institución");
    const institucion = await res.json();
    cargarInstitucionParaEditar(institucion);
  } catch (err) {
    console.error("❌ Error al editar institución:", err);
    alert("🚨 No se pudo cargar la institución.");
  }
};

// 🔹 CARGA DEL LISTADO EN LA TABLA
async function cargarInstituciones() {
  const res = await fetch('/instituciones/listar');
  const data = await res.json();
  const cuerpo = document.getElementById('tablaInstituciones');

  if (!data || data.length === 0) {
    cuerpo.innerHTML = '<tr><td colspan="6">No hay instituciones registradas.</td></tr>';
    return;
  }

  cuerpo.innerHTML = '';
  data.forEach(inst => {
    const fila = document.createElement('tr');
    fila.innerHTML = `
      <td>${inst.codigodea}</td>
      <td>${inst.nombreplantel}</td>
      <td>${inst.nombredirector}</td>
      <td>${inst.telefono}</td>
      <td>${inst.status}</td>
      <td></td>
    `;

    const btnEditar = document.createElement('button');
    btnEditar.textContent = '✏️';
    btnEditar.addEventListener('click', () => editar(inst.codigodea));

    const btnEliminar = document.createElement('button');
    btnEliminar.textContent = '🗑️';
    btnEliminar.addEventListener('click', () => eliminar(inst.codigodea));

    const celda = fila.querySelector('td:last-child');
    celda.appendChild(btnEditar);
    celda.appendChild(btnEliminar);

    cuerpo.appendChild(fila);
  });
}

// 🔹 ENVÍO DEL FORMULARIO
document.getElementById('formInstitucion').addEventListener('submit', async function (e) {
  e.preventDefault();
  const form = e.target;

  const modo = document.getElementById('modoFormulario').value;
  const idEditar = document.getElementById('idInstitucionEditar').value;

  const endpoint = modo === 'editar'
    ? `/instituciones/${idEditar}`
    : '/instituciones/nueva';

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
    registrado: new Date().toISOString()
  };

  try {
    const res = await fetch(endpoint, {
      method: metodo,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datos)
    });

    if (res.ok) {
      alert(modo === 'editar'
        ? '✅ Institución modificada con éxito'
        : '✅ Institución registrada con éxito');
      cerrarFormulario();
      form.reset();
      document.getElementById('mensajeDEA').textContent = '';
      document.getElementById('modoFormulario').value = 'crear';
      document.getElementById('idInstitucionEditar').value = '';
      await cargarInstituciones();
    } else {
      const errorTexto = await res.text();
      alert(`❌ Error al guardar: ${errorTexto}`);
      console.error(errorTexto);
    }
  } catch (err) {
    alert(`🚨 Error inesperado: ${err.message}`);
    console.error(err);
  }
});

// 🔓 EXPONER FUNCIONES USADAS EN EL HTML
window.validarDEA = validarDEA;
window.buscarDirector = buscarDirector;
window.sugerirDirector = sugerirDirector;
window.abrirFormulario = abrirFormulario;
window.cerrarFormulario = cerrarFormulario;

// 🔹 INICIO AUTOMÁTICO
window.addEventListener('DOMContentLoaded', () => {
  cargarResumen();
  cargarInstituciones();
});