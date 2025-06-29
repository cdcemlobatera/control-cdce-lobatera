// 🔹 UTILIDADES GENERALES

function cerrarFormulario() {
  document.getElementById('modalRegistro').style.display = 'none';
}

function abrirFormulario(institucion = null) {
  const form = document.getElementById('formInstitucion');
  if (!form) {
    console.warn('⚠️ No se encontró el formulario #formInstitucion');
    return;
  }

  form.reset();

  // 🧩 Referencias de elementos críticos
  const campoModo = document.getElementById('modoFormulario');
  const campoEditar = document.getElementById('idInstitucionEditar');
  const campoTitulo = document.getElementById('tituloFormulario');
  const campoMensajeDEA = document.getElementById('mensajeDEA');
  const campoCodigoDEA = document.getElementById('codigodea');

  const modo = institucion ? 'editar' : 'crear';

  if (campoModo) campoModo.value = modo;
  if (campoEditar) campoEditar.value = institucion?.codigodea || '';
  if (campoMensajeDEA) campoMensajeDEA.textContent = '';
  if (campoTitulo) {
    campoTitulo.textContent = modo === 'editar'
      ? '✏️ Editar Institución'
      : '🏫 Nueva Institución';
  }
  if (campoCodigoDEA) campoCodigoDEA.readOnly = (modo === 'editar');

  cargarCircuitos().then(() => {
    // 💡 Asignar valores del objeto institución al formulario
    if (institucion) {
      for (const [clave, valor] of Object.entries(institucion)) {
        if (form[clave]) {
          form[clave].value = valor || '';
        }
      }

      // 🧭 Mostrar zona del circuito y supervisor (al disparar 'change')
      const selectCircuito = document.getElementById('codcircuitoedu');
      selectCircuito.value = institucion.codcircuitoedu;

      // 🔥 Este es el paso clave: simula que el usuario lo seleccionó
      selectCircuito.dispatchEvent(new Event('change'));
    } else {
      // ⚙️ En modo creación: limpiar el detalle por precaución
      setTimeout(() => {
        const detalle = document.getElementById('detalleCircuito');
        if (detalle) {
          detalle.textContent = 'ℹ️ Seleccione un circuito para ver su zona';
        } else {
          console.warn('⚠️ #detalleCircuito aún no disponible tras abrirFormulario()');
        }
      }, 50);
    }

    // 🪟 Abrir el modal visualmente
    const modal = document.getElementById('modalRegistro');
    if (modal) modal.style.display = 'block';

    // 🎯 Foco visual al campo DEA
    setTimeout(() => {
      if (campoCodigoDEA) {
        campoCodigoDEA.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 50);
  });
}

function mostrarFormulario() {
  abrirFormulario();
}

// 🔹 VALIDACIÓN DE CÓDIGO DEA

async function validarDEA() {
  const codigo = document.getElementById('codigodea').value.trim();
  const mensaje = document.getElementById('mensajeDEA');
  if (!codigo) return mensaje.textContent = '';

  try {
    const res = await fetch(`/instituciones/listar`);
    if (!res.ok) throw new Error('Error al validar');

    const lista = await res.json();
    const existe = lista.some(inst => inst.codigodea === codigo);
    mensaje.textContent = existe ? '⚠️ Este Código DEA ya está registrado.' : '';
  } catch (err) {
    mensaje.textContent = '❌ Error al validar Código DEA.';
    console.error(err);
  }
}

// 🔹 BÚSQUEDA Y SUGERENCIAS DE DIRECTOR

async function buscarDirector() {
  const cedula = document.getElementById('ceduladirector').value.trim();
  if (!cedula) return;

  try {
    const res = await fetch(`/directores/cedula/${cedula}`);
    if (!res.ok) throw new Error();

    const data = await res.json();
    document.getElementById('nombredirector').value = data?.nombresapellidosrep || '';
    document.getElementById('telefonodirector').value = data?.telefono || '';
    document.getElementById('correodirector').value = data?.correo || '';
  } catch {
    document.getElementById('nombredirector').value = '';
    document.getElementById('telefonodirector').value = '';
    document.getElementById('correodirector').value = '';
  }
}

async function sugerirDirector() {
  const input = document.getElementById('ceduladirector');
  const texto = input.value.trim();
  const datalist = document.getElementById('listaDirectores');
  if (texto.length < 3) return datalist.innerHTML = '';

  try {
    const res = await fetch(`/directores/buscar?q=${encodeURIComponent(texto)}`);
    const data = await res.json();

    datalist.innerHTML = '';
    data.forEach(d => {
      const option = document.createElement('option');
      option.value = d.cedula;
      datalist.appendChild(option);
    });
  } catch (err) {
    console.error('Error en sugerencia de directores:', err);
  }
}

// 🔹 RESUMEN ESTADÍSTICO
async function cargarResumen() {
  const indicadores = {
    instituciones: document.getElementById('totalInstituciones'),
    dependencias: document.getElementById('totalDependencias'),
    niveles: document.getElementById('totalNiveles'),
    directores: document.getElementById('totalDirectores'),
  };

  if (!Object.values(indicadores).every(el => el)) {
    console.warn('⚠️ Elementos de resumen no encontrados en el DOM.');
    return;
  }

  for (let campo in indicadores) {
    indicadores[campo].textContent = '⌛';
  }

  try {
    //const urlResumen = 'https://ubiquitous-umbrella-r4xw497w9v6qhpgr4-3000.app.github.dev/instituciones/resumen';
    //console.log('🌐 Solicitando resumen desde:', urlResumen);
    //const res = await fetch(urlResumen);

    const urlResumen = 'https://control-cdce-lobatera.onrender.com/instituciones/resumen';
    const res = await fetch(urlResumen, {
          credentials: 'include'
    });


    console.log('🔍 Ejecutando cargarResumen');

    const res = await fetch('/instituciones/resumen');
    if (!res.ok) throw new Error('Error al obtener resumen');
    const data = await res.json();

    const animarContador = (elemento, valorFinal) => {
      const actual = parseInt(elemento.textContent) || 0;
      const diferencia = valorFinal - actual;
      const pasos = Math.abs(diferencia);
      if (pasos === 0) return;

      let progreso = 0;
      const paso = Math.sign(diferencia);
      const intervalo = setInterval(() => {
        progreso++;
        const nuevoValor = actual + paso * progreso;
        elemento.textContent = nuevoValor;
        if (progreso >= pasos) {
          clearInterval(intervalo);
          elemento.classList.add('pop');
          setTimeout(() => elemento.classList.remove('pop'), 400);
        }
      }, 20);
    };

    animarContador(indicadores.instituciones, data.totalInstituciones ?? 0);
    animarContador(indicadores.dependencias, data.totalDependencias ?? 0);
    animarContador(indicadores.niveles, data.totalNiveles ?? 0);
    animarContador(indicadores.directores, data.totalDirectores ?? 0);
  } catch (error) {
    console.error('❌ Resumen no disponible:', error);
    for (let campo in indicadores) {
      indicadores[campo].textContent = '—';
    }
  }
}

// 🔹 CARGA PARA EDICIÓN
function cargarInstitucionParaEditar(inst) {
  abrirFormulario(inst); // ✅ Ya precarga todos los campos y circuito
  buscarDirector();       // 🔁 Refresca los datos de referencia

  const btnEliminar = document.getElementById('btnEliminarInstitucion');
  if (btnEliminar && !btnEliminar.dataset.eliminarAsignado) {
    btnEliminar.dataset.eliminarAsignado = 'true'; // evita múltiples listeners

    btnEliminar.addEventListener('click', async () => {
      const codigodea = document.getElementById('codigodea').value.trim();

      const { isConfirmed } = await Swal.fire({
        title: '¿Eliminar institución?',
        text: `Esto eliminará permanentemente el registro con DEA: ${codigodea}`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar',
      });

      if (!isConfirmed) return;

      try {
        const res = await fetch(`/instituciones/${codigodea}`, {
          method: 'DELETE'
        });

        if (!res.ok) throw new Error('No se pudo eliminar');

        await Swal.fire('✅ Eliminado', 'La institución fue eliminada exitosamente.', 'success');

        cerrarFormulario();
        document.getElementById('formInstitucion').reset();
        document.getElementById('modoFormulario').value = 'crear';
        document.getElementById('idInstitucionEditar').value = '';
        document.getElementById('codigodea').readOnly = false;
        document.getElementById('mensajeDEA').textContent = '';
        document.getElementById('detalleCircuito').textContent = '';

        await cargarInstituciones();
        await cargarResumen();
      } catch (err) {
        console.error('❌ Error al eliminar:', err);
        Swal.fire('Error', 'Hubo un problema al eliminar la institución.', 'error');
      }
    });
  }
}

// 🔓 Exponer como función global
window.editar = async function (codigodea) {
  try {
    const res = await fetch(`/instituciones/${codigodea}`);
    if (!res.ok) throw new Error('No se pudo cargar la institución');
    const institucion = await res.json();
    cargarInstitucionParaEditar(institucion);
  } catch (err) {
    console.error('❌ Error al editar institución:', err);
    alert('🚨 No se pudo cargar la institución.');
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
      <td>${inst.nombredirector || ''}</td>
      <td>${inst.telefono || ''}</td>
      <td>${inst.status}</td>
      <td></td>
    `;

    const btnEditar = document.createElement('button');
    btnEditar.textContent = '✏️';
    btnEditar.title = 'Editar institución';
    btnEditar.addEventListener('click', () => editar(inst.codigodea));

    fila.querySelector('td:last-child').appendChild(btnEditar);
    cuerpo.appendChild(fila);
  });
}

// 🔹 CARGAR CIRCUITOS EN EL SELECTOR
async function cargarCircuitos() {
  const res = await fetch('/circuitos/listar');
  if (!res.ok) {
    console.error('❌ Error al obtener circuitos:', await res.text());
    return;
  }

  const data = await res.json();
  const select = document.getElementById('codcircuitoedu');
  if (!data || !select) {
    console.warn("⚠️ No se pudo cargar circuitos: falta el select o los datos.");
    if (select) select.innerHTML = '<option value="">Error al cargar</option>';
    return;
  }

  select.innerHTML = '<option value="">Seleccione un circuito</option>';
  data.forEach(c => {
    const option = document.createElement('option');
    option.value = c.codcircuitoedu;
    option.textContent = `${c.codcircuitoedu} — ${c.nombrecircuito}`;
    option.dataset.zona = c.zona || '';
    option.dataset.supervisor = c.supervisor || '';
    select.appendChild(option);
  });

  if (!select.dataset.listenerAsignado) {
    select.addEventListener('change', () => {
      const opcion = select.options[select.selectedIndex];
      const zona = opcion?.dataset?.zona?.trim() || '';
      const supervisor = opcion?.dataset?.supervisor?.trim() || '';

      const detalleZona = document.getElementById('detalleCircuito');
      if (detalleZona) {
        detalleZona.textContent = zona ? `🗺️ Zona: ${zona}` : '';
      }

      const detalleSupervisor = document.getElementById('detalleSupervisor');
      if (detalleSupervisor) {
        detalleSupervisor.textContent = supervisor ? `👤 Supervisor: ${supervisor}` : '';
      }
    });
  }
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
    registrado: modo === 'editar'
      ? form.registrado?.value || new Date().toISOString()
      : new Date().toISOString(),

    // Nuevos campos
    codcircuitoedu: form.codcircuitoedu.value,
    codestadistico: form.codestadistico.value.trim(),
    codcenvot: form.codcenvot.value.trim(),
    nombrecenvot: form.nombrecenvot.value.trim()
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
      document.getElementById('codigodea').readOnly = false;
      document.getElementById('detalleCircuito').textContent = '';

      await cargarInstituciones();
      await cargarResumen();
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

// 🔓 EXPONER FUNCIONES
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
