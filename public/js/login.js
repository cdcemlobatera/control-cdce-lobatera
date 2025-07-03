document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const cedula = document.getElementById('cedula').value.trim();
  const clave = document.getElementById('clave').value.trim();
  const mensaje = document.getElementById('mensaje');
  const boton = e.submitter;

  // Limpiar estado previo
  mensaje.textContent = '';
  mensaje.classList.remove('error');
  boton.disabled = true;
  boton.textContent = "Verificando...";

  // Validación de formato de cédula
  if (!/^V\d{7,8}$/.test(cedula.toUpperCase())) {
    mostrarError("⚠️ Formato de cédula inválido. Usa 'V12345678'.", mensaje, boton);
    return;
  }

  // Validación de longitud de clave
  if (clave.length < 6) {
    mostrarError("🔐 La clave debe tener al menos 6 caracteres.", mensaje, boton);
    return;
  }

  try {
    const res = await fetch('/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cedula, clave })
    });

    const data = await res.json();

    if (res.ok) {
      window.location.href = data.redirigirA || '/panel';
    } else {
      mostrarError(data.error || '❌ Cédula o clave incorrecta.', mensaje, boton);
    }
  } catch (err) {
    console.error(err);
    mostrarError('🚨 Error inesperado. Intenta nuevamente.', mensaje, boton);
  }
});

// Función auxiliar para mostrar errores y resetear el botón
function mostrarError(texto, mensajeElem, botonElem) {
  mensajeElem.textContent = texto;
  mensajeElem.classList.add('error');
  botonElem.disabled = false;
  botonElem.textContent = "Ingresar";
  setTimeout(() => mensajeElem.classList.remove('error'), 600);
}