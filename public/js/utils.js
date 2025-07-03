// 🔧 UTILIDADES GENÉRICAS

// Reinicia visual y lógicamente el formulario de instituciones
function reiniciarFormularioInstitucion() {
  const form = document.getElementById('formInstitucion');
  if (!form) return;
  form.reset();

  // Limpieza visual
  const mensajes = ['mensajeDEA', 'mensajeNombre', 'mensajeDirector'];
  mensajes.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = '';
  });

  document.getElementById('modoFormulario').value = 'crear';
  document.getElementById('idInstitucionEditar').value = '';
  document.getElementById('codigodea').readOnly = false;
  document.getElementById('detalleCircuito').textContent = '';
}

// 🧪 Diagnóstico para detectar usos sueltos de 'data'
function auditarVariablesPotencialmenteObsoletas() {
  const scripts = Array.from(document.querySelectorAll('script'))
    .map(s => s.textContent).join('\n');

  const coincidencias = scripts.match(/(?<!const|let|var)\s+data(?![A-Za-z])/g);

  if (coincidencias) {
    console.warn(`⚠️ Se encontraron referencias a "data" posiblemente sin declarar: ${coincidencias.length}`);
  } else {
    console.info('✅ Sin referencias a "data" sin contexto. Todo limpio.');
  }
}

// 🌀 Retardo inteligente para evitar spam de llamadas (debounce)
function debounce(fn, delay = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

// 🌟 Mini efecto para destacar campos (puedes usarlo con validaciones)
function resaltarElemento(id, clase = 'resaltar') {
  const el = document.getElementById(id);
  if (el) {
    el.classList.add(clase);
    setTimeout(() => el.classList.remove(clase), 600);
  }
}

// 📤 Helper para manejo centralizado de errores (opcional para fetch)
function manejarErrorSolicitud(contexto, error) {
  console.error(`❌ Error en ${contexto}:`, error);
  Swal.fire('Error', `Se produjo un problema al procesar ${contexto}.`, 'error');
}