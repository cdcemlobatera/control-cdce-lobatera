document.getElementById('formRegistroUsuario').addEventListener('submit', async (e) => {
  e.preventDefault();
  const cedula = document.getElementById('cedula').value.trim();
  const rol = document.getElementById('rol').value;
  const clave = document.getElementById('clave').value;
  const codigoDea = document.getElementById('codigoDea').value.trim();
  const mensaje = document.getElementById('mensajeRegistro');

  mensaje.textContent = '';

  if (!cedula || !rol || clave.length < 6) {
    mensaje.textContent = '⚠️ Todos los campos obligatorios deben estar completos y la clave debe tener al menos 6 caracteres.';
    return;
  }

  try {
    const res = await fetch('/registro-usuario', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cedula, rol, clave, codigo_dea: codigoDea })
    });

    const data = await res.json();
    if (res.ok) {
      Swal.fire('✅ Activación exitosa', data.mensaje, 'success');
      e.target.reset();
    } else {
      Swal.fire('Error', data.error || 'No se pudo activar el acceso', 'error');
    }
  } catch (err) {
    console.error(err);
    Swal.fire('Error', 'Problema inesperado al activar el usuario', 'error');
  }
});