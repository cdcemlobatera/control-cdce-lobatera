// 📦 MÓDULOS Y CONFIGURACIÓN INICIAL
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path'); // ← Esta es la línea que faltaba
const bcrypt = require('bcryptjs');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;

// 🔗 Supabase
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

// 🔧 Middlewares globales
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

app.use(session({
  secret: 'supersecreto-educativo',
  resave: false,
  saveUninitialized: false
}));


// ─── 🔐 MIDDLEWARES ──────────────────────────────────────────────
app.use(express.json());
app.use(session({
  secret: 'mi-clave-segura',
  resave: false,
  saveUninitialized: true
}));
app.use(express.static(path.join(__dirname, 'public')));

// ─── 🔑 AUTENTICACIÓN Y SESIÓN (USANDO TABLA `personal`) ────────────────
app.post('/login', async (req, res) => {
  const { cedula, clave } = req.body;

  if (!cedula || !clave) {
    return res.status(400).json({ error: 'Datos incompletos' });
  }

  const { data: usuario, error } = await supabase
    .from('personal')
    .select('cedula, clave, rol, estatus, codigo_dea')
    .eq('cedula', cedula)
    .single();

  if (error || !usuario) {
    return res.status(401).json({ error: 'No autorizado' });
  }

  const claveOk = await bcrypt.compare(clave, usuario.clave);
  if (!claveOk) {
    return res.status(401).json({ error: 'Credenciales inválidas' });
  }

  if (usuario.estatus !== 'ACTIVO') {
    return res.status(403).json({ error: 'Usuario inhabilitado' });
  }

  req.session.cedula = usuario.cedula;
  req.session.rol = usuario.rol;
  req.session.codigo_dea = usuario.codigo_dea || null;

  res.json({
    mensaje: 'Acceso correcto',
    rol: usuario.rol,
    redirigirA: '/panel'
  });
});

// 🔒 Cierre de sesión
app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login.html');
  });
});

// 👁️ Verificar sesión activa
app.get('/usuario/activo', (req, res) => {
  res.json({
    cedula: req.session?.cedula || null,
    rol: req.session?.rol || null,
    codigo_dea: req.session?.codigo_dea || null
  });
});

app.post('/registro-usuario', async (req, res) => {
  if (req.session.rol !== 'admin' && req.session.rol !== 'ministerio') {
    return res.status(403).json({ error: 'Acceso restringido para activar usuarios' });
  }

  const { cedula, rol, clave, codigo_dea } = req.body;

  if (!cedula || !rol || !clave || clave.length < 6) {
    return res.status(400).json({ error: 'Datos incompletos o clave inválida' });
  }

  const { data: persona, error } = await supabase
    .from('personal')
    .select('cedula, nombresapellidos')
    .eq('cedula', cedula)
    .single();

  if (error || !persona) {
    return res.status(404).json({ error: 'La cédula no está registrada en el personal institucional' });
  }

  const claveCifrada = await bcrypt.hash(clave, 10);

  const { error: errorUpdate } = await supabase
    .from('personal')
    .update({
      rol,
      clave: claveCifrada,
      estatus: 'ACTIVO',
      codigo_dea: codigo_dea || null
    })
    .eq('cedula', cedula);

  if (errorUpdate) {
    console.error('❌ Error al activar usuario:', errorUpdate);
    return res.status(500).json({ error: 'No se pudo actualizar el acceso' });
  }

  res.status(200).json({ mensaje: `✅ Acceso habilitado para ${persona.nombresapellidos}` });
});

//lote 2

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

// Listar instituciones
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
        .from('personal') // Cambio clave: antes 'raclobatera'
        .select('nombresapellidos, telefono')
        .eq('cedula', inst.ceduladirector)
        .eq('rol', 'director')
        .single();

      return {
        codigodea: inst.codigodea,
        nombreplantel: inst.nombreplantel,
        ceduladirector: inst.ceduladirector,
        status: inst.status,
        nombredirector: director?.nombresapellidos || 'Sin registrar',
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

//lote 3-1

// ─── 🔍 Detalle de institución (con director desde `personal`) ─────────────
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
    .from('personal')
    .select('nombresapellidos, telefono, correo')
    .eq('cedula', institucion.ceduladirector)
    .eq('rol', 'director')
    .single();

  res.json({
    ...institucion,
    nombredirector: director?.nombresapellidos || '',
    telefonodirector: director?.telefono || '',
    correodirector: director?.correo || ''
  });
});

// 🗑️ Eliminar institución
app.delete('/instituciones/:codigodea', async (req, res) => {
  const { codigodea } = req.params;

  const { error } = await supabase
    .from('instituciones')
    .delete()
    .eq('codigodea', codigodea);

  if (error) {
    console.error('❌ Error al eliminar institución:', error);
    return res.status(500).json({ error: 'No se pudo eliminar la institución' });
  }

  res.status(204).send(); // Éxito sin contenido
});

// lote 3-2

// Página principal → redirige al login si no hay sesión
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Ruta protegida para acceder al panel principal
app.get('/panel', (req, res) => {
  if (!req.session || !req.session.rol) {
    return res.sendFile(path.join(__dirname, 'public', 'login.html'));
  }
  res.sendFile(path.join(__dirname, 'public', 'panel.html'));
});

//lote 3-3
app.get('/circuitos/listar', async (req, res) => {
  const { data: circuitos, error: errorCircuitos } = await supabase
    .from('circuitoseducativos')
    .select('codcircuitoedu, nombrecircuito, zona, cedulasupervisor')
    .order('codcircuitoedu', { ascending: true });

  if (errorCircuitos) {
    console.error('❌ Error al cargar circuitos:', errorCircuitos);
    return res.status(500).json({ error: 'Error al obtener circuitos' });
  }

  const resultados = await Promise.all(
    circuitos.map(async circuito => {
      let nombreSupervisor = 'Sin asignar';

      console.log(`🧩 Circuito: ${circuito.codcircuitoedu}, Cédula recibida: "${circuito.cedulasupervisor}"`);

      if (circuito.cedulasupervisor && circuito.cedulasupervisor.trim()) {
        const { data: supervisor, error: errorSupervisor } = await supabase
          .from('personal')
          .select('nombresapellidos, telefono, correo')
          .eq('cedula', circuito.cedulasupervisor.trim())
          .eq('cargo_funcional', 'supervisor')
          .single();

        if (supervisor) {
          nombreSupervisor = {
            nombresapellidos: supervisor.nombresapellidos,
            telefono: supervisor.telefono || 'No registrado',
            correo: supervisor.correo || 'No disponible'
          };
        }
      }

      return {
        codcircuitoedu: circuito.codcircuitoedu,
        nombrecircuito: circuito.nombrecircuito,
        zona: circuito.zona || '',
        supervisor: nombreSupervisor
      };
    })
  );

  res.json(resultados);
});

//lote 4

app.get('/', (req, res) => {
  res.redirect('/login.html');
});

// 🛫 Iniciar servidor
app.listen(PORT, () => {
  console.log(`✅ Servidor escuchando en http://localhost:${PORT}`);
});