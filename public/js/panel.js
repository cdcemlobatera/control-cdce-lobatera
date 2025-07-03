// 🔐 Verifica al usuario en sesión y carga el panel correspondiente por rol
fetch('/usuario/activo')
  .then(res => res.json())
  .then(({ rol }) => {
    const contenido = document.getElementById('contenido-rol');

    if (!rol) {
      location.href = '/login.html';
      return;
    }

    if (rol === 'admin' || rol === 'ministerio') {
      contenido.innerHTML = `
        <h2>Bienvenido, Administrador</h2>
        <ul>
          <li><a href="instituciones.html">🏫 Gestionar instituciones</a></li>
          <li><a href="registro-usuario.html">👤 Registrar usuarios</a></li>
          <li>📊 Reportes generales</li>
          <li>🧑‍💼 Gestión de personal (próximamente)</li>
        </ul>
      `;
    } else if (rol === 'director') {
      contenido.innerHTML = `
        <h2>Panel del Director</h2>
        <ul>
          <li><a href="instituciones.html">🏫 Ver mi institución</a></li>
          <li>📄 Registrar matrícula</li>
          <li>📬 Comunicaciones</li>
          <li>🧑‍💼 Personal asignado (próximamente)</li>
        </ul>
      `;
    } else if (rol === 'docente') {
      contenido.innerHTML = `
        <h2>Panel del Docente</h2>
        <ul>
          <li>📘 Mi sección asignada</li>
          <li>📝 Registro de asistencia</li>
          <li>📁 Documentos</li>
        </ul>
      `;
    } else {
      contenido.innerHTML = `
        <h2>Área administrativa</h2>
        <ul>
          <li><a href="instituciones.html">🏫 Institución asignada</a></li>
          <li>📁 Documentos disponibles</li>
        </ul>
      `;
    }
  })
  .catch(err => {
    console.error('❌ Error al verificar usuario activo:', err);
    location.href = '/login.html';
  });

// 🚪 Cierre de sesión
document.getElementById('cerrarSesion').addEventListener('click', () => {
  fetch('/logout').then(() => location.href = '/login.html');
});