// ─── 📦 DEPENDENCIAS Y CONFIGURACIÓN ─────────────────────────────
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

// ─── 🔐 MIDDLEWARES ──────────────────────────────────────────────
app.use(express.json());
app.use(session({
  secret: 'mi-clave-segura',
  resave: false,
  saveUninitialized: true
}));
app.use(express.static(path.join(__dirname, 'public')));

// ─── 🔑 AUTENTICACIÓN Y SESIÓN ──────────────────────────────────
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

  req.session.cedula = cedula;
  req.session.rol = usuario.rol;

  res.json({
    mensaje: 'Acceso correcto',
    rol: usuario.rol,
    redirigirA: '/panel'
  });
});

app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login.html');
  });
});

app.get('/usuario/activo', (req, res) => {
  res.json({
    cedula: req.session?.cedula || null,
    rol: req.session?.rol || null
  });
});

// ─── 👤 DIRECTORES: RAC LOBATERA ────────────────────────────────
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

// ─── 🏫 INSTITUCIONES ────────────────────────────────────────────

// Crear nueva institución
app.post('/instituciones/nueva', async (req, res) => {
  try {
    const datos = req.body;
    const { data, error } = await supabase
      .from('instituciones')
      .insert([datos]);

    if (error) {
      console.error('❌ Supabase insert error:', error);
      return res.status(500).send(error.message);
    }

    res.status(200).json({ mensaje: 'Registro exitoso', data });
  } catch (e) {
    console.error('❌ Error general:', e);
    res.status(500).send('Error inesperado en el servidor.');
  }
});

// Editar institución existente
app.patch('/instituciones/:codigodea', async (req, res) => {
  const { codigodea } = req.params;
  const datos = req.body;

  const { error } = await supabase
    .from('instituciones')
    .update(datos)
    .eq('codigodea', codigodea);

  if (error) {
    console.error('❌ Error al editar institución:', error);
    return res.status(500).json({ error: 'Error al actualizar institución' });
  }

  res.status(200).json({ mensaje: 'Institución actualizada exitosamente' });
});

// Listar instituciones (para la tabla)
app.get('/instituciones/listar', async (req, res) => {
  const { data: instituciones, error: errorInstituciones } = await supabase
    .from('instituciones')
    .select('codigodea, nombreplantel, ceduladirector, status');

  if (errorInstituciones) {
    return res.status(500).json({ error: 'Error al cargar instituciones' });
  }

  const resultados = await Promise.all(
    instituciones.map(async inst => {
      const { data: director } = await supabase
        .from('raclobatera')
        .select('nombresapellidosrep, telefono')
        .eq('cedula', inst.ceduladirector)
        .single();

      return {
        codigodea: inst.codigodea,
        nombreplantel: inst.nombreplantel,
        ceduladirector: inst.ceduladirector,
        status: inst.status,
        nombredirector: director?.nombresapellidosrep || 'Sin registrar',
        telefono: director?.telefono || 'No disponible'
      };
    })
  );

  res.json(resultados);
});

// 🔢 Resumen estadístico de instituciones
app.get('/instituciones/resumen', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('instituciones')
      .select('dependencia, niveledu, ceduladirector, codigodea');

    if (error) {
      console.error('❌ Error al obtener resumen:', error);
      return res.status(500).json({ error: error.message });
    }

    const totalInstituciones = data.length;
    const dependencias = new Set(data.map(i => i.dependencia).filter(Boolean));
    const niveles = new Set(data.map(i => i.niveledu).filter(Boolean));
    const directores = new Set(data.map(i => i.ceduladirector).filter(Boolean));

    console.log('🎒 Registros obtenidos:', data.length, data[0]);

    res.json({
      totalInstituciones,
      totalDependencias: dependencias.size,
      totalNiveles: niveles.size,
      totalDirectores: directores.size     
    });
  } catch (e) {
    console.error('❌ Error inesperado en resumen:', e);
    res.status(500).json({ error: 'Error inesperado al generar resumen' });
  }

});


// Detalle de institución (editar)
app.get('/instituciones/:id', async (req, res) => {
  const { data: institucion, error } = await supabase
    .from('instituciones')
    .select('*')
    .eq('codigodea', req.params.id)
    .single();

  if (error || !institucion) {
    return res.status(404).json({ error: 'Institución no encontrada' });
  }

  const { data: director } = await supabase
    .from('raclobatera')
    .select('nombresapellidosrep, telefono, correo')
    .eq('cedula', institucion.ceduladirector)
    .single();

  res.json({
    ...institucion,
    nombredirector: director?.nombresapellidosrep || '',
    telefonodirector: director?.telefono || '',
    correodirector: director?.correo || ''
  });
});

// Página principal → login
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Ruta protegida para acceder al panel
app.get('/panel', (req, res) => {
  if (!req.session || !req.session.rol) {
    return res.sendFile(path.join(__dirname, 'public', 'login.html'));
  }
  res.sendFile(path.join(__dirname, 'public', 'panel.html'));
});

const server = app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});

server.on('error', err => {
  if (err.code === 'EADDRINUSE') {
    console.error(`⚠️ El puerto ${PORT} ya está en uso. Render aún no ha liberado el anterior.`);
    process.exit(1);
  } else {
    console.error('❌ Error al iniciar el servidor:', err);
  }
});