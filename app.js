const express = require('express');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const bcrypt = require('bcryptjs');
const session = require('express-session');

// 🔐 Middleware de sesión y JSON
app.use(express.json());

app.use(session({
  secret: 'mi-clave-segura', // Cámbiala por una más robusta en producción
  resave: false,
  saveUninitialized: true
}));

// 🌐 Servir archivos estáticos desde /public
app.use(express.static(path.join(__dirname, 'public')));

// 📄 Respuesta directa al ingresar por "/"
// Ruta raíz para mostrar el login
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Acceso al panel según sesión
app.get('/panel', (req, res) => {
  if (!req.session || !req.session.rol) {
    return res.sendFile(path.join(__dirname, 'public', 'login.html'));
  }
  res.sendFile(path.join(__dirname, 'public', 'panel.html'));
});


// 🛠️ Aquí puedes continuar agregando tus otras rutas (login, panel, etc.)

// Login
app.post('/login', async (req, res) => {
  const { cedula, clave } = req.body;

  if (!cedula || !clave) {
    return res.status(400).json({ error: 'Datos incompletos' });
  }

  const { data: usuario, error } = await supabase
    .from('usuarios')
    .select('clave, rol')
    .eq('cedula', cedula)
    .single();

  if (error || !usuario) {
    return res.status(401).json({ error: 'No autorizado' });
  }

  const claveOk = await bcrypt.compare(clave, usuario.clave);
  if (!claveOk) {
    return res.status(401).json({ error: 'Credenciales inválidas' });
  }

  // Guardamos datos en sesión
  req.session.cedula = cedula;
  req.session.rol = usuario.rol;

  res.json({
    mensaje: 'Acceso correcto',
    rol: usuario.rol,
    redirigirA: '/panel'
  });
});

//usuario activo
app.get('/usuario/activo', (req, res) => {
  res.json({
    cedula: req.session?.cedula,
    rol: req.session?.rol
  });
});


// Buscar director por cédula
app.get('/directores/cedula/:cedula', async (req, res) => {
  const { cedula } = req.params;
  const { data, error } = await supabase
    .from('raclobatera')
    .select('nombresapellidosrep, telefono, correo')
    .eq('cedula', cedula)
    .single();

  if (error || !data) return res.status(404).json({ error: 'Director no encontrado' });
  res.json(data);
});

// Buscar directores por nombre
app.get('/directores/buscar', async (req, res) => {
  const search = req.query.q || '';
  const { data, error } = await supabase
    .from('raclobatera')
    .select('cedula, nombresapellidosrep, telefono, correo')
    .ilike('nombresapellidosrep', `%${search}%`)
    .limit(10);

  if (error) return res.status(500).json({ error });
  res.json(data);
});

// Registrar nueva institución
app.post('/instituciones/nueva', async (req, res) => {
  const { codigodea, nombreplantel, ceduladirector, status, registrado } = req.body;

  const { error } = await supabase
    .from('instituciones')
    .insert([{ codigodea, nombreplantel, ceduladirector, status, registrado }]);

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json({ mensaje: 'Institución registrada' });
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});

// Nuevo Usuario
app.post('/usuarios/nuevo', async (req, res) => {
  const { cedula, clave, rol } = req.body;

  if (!cedula || !clave || !rol) {
    return res.status(400).json({ error: 'Campos incompletos' });
  }

  // Verificar si pertenece al personal del Ministerio (tabla raclobatera)
  
  const { data: persona, error: errorPersona } = await supabase
    .from('raclobatera')
    .select('nombresapellidosrep')
    .eq('cedula', cedula)
    .single();

  if (errorPersona || !persona) {
    return res.status(403).json({ error: 'La cédula no pertenece al personal registrado en el RAC Lobatera' });
  }

  // Verificar si ya está registrado como usuario
  
  const { data: existente } = await supabase
    .from('usuarios')
    .select('cedula')
    .eq('cedula', cedula)
    .single();

  if (existente) {
    return res.status(409).json({ error: 'El usuario ya existe' });
  }

  // Encriptar clave y guardar
  const claveEncriptada = await bcrypt.hash(clave, 10);

  const { error: insertError } = await supabase
    .from('usuarios')
    .insert([{ cedula, clave: claveEncriptada, rol }]);

  if (insertError) {
    return res.status(500).json({ error: 'Error al registrar usuario' });
  }

  res.status(201).json({ mensaje: 'Usuario creado exitosamente' });
});

//listar instituciones (tabla)
app.get('/instituciones/listar', async (req, res) => {
  const { data, error } = await supabase
    .from('instituciones')
    .select('codigodea, nombreplantel, ceduladirector, status');

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Ruta protegida para servir el panel
app.get('/panel', (req, res) => {
  if (!req.session || !req.session.rol) {
    return res.sendFile(path.join(__dirname, 'public', 'login.html'));
  }
  res.sendFile(path.join(__dirname, 'public', 'panel.html'));
});

// Ruta raíz para mostrar login
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Obtener datos del usuario activo desde sesión
app.get('/usuario/activo', (req, res) => {
  res.json({
    cedula: req.session?.cedula || null,
    rol: req.session?.rol || null
  });
});

// Cerrar sesión
app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login.html');
  });
});

// Escuchar el puerto al final de todo
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
