document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const cedula = document.getElementById('cedula').value.trim();
  const clave = document.getElementById('clave').value.trim();
  const mensaje = document.getElementById('mensaje');

  mensaje.textContent = '';

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
      mensaje.textContent = data.error || '❌ Cédula o clave incorrecta.';
    }
  } catch (err) {
    console.error(err);
    mensaje.textContent = '🚨 Error inesperado. Intenta nuevamente.';
  }
});