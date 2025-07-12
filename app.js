//app.js Lote 1
// 📦 MÓDULOS Y CONFIGURACIÓN INICIAL
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');
const bcrypt = require('bcryptjs');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;

// 🔗 Supabase
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

// 🔧 Middlewares globales
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret: 'supersecreto-educativo',
  resave: false,
  saveUninitialized: false
}));

// ─── 🔐 AUTENTICACIÓN Y SESIÓN ────────────────────────────────

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

app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login.html');
  });
});

app.get('/usuario/activo', (req, res) => {
  res.json({
    cedula: req.session?.cedula || null,
    rol: req.session?.rol || null,
    codigo_dea: req.session?.codigo_dea || null
  });
});

app.post('/registro-usuario', async (req, res) => {
  if (!['admin', 'ministerio'].includes(req.session.rol)) {
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

//Lote 2

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

// Listar instituciones para validación y tabla dinámica
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
        .from('personal')
        .select('nombresapellidos, telefono, correo')
        .eq('cedula', inst.ceduladirector)
        .eq('rol', 'director')
        .single();

      return {
        codigodea: inst.codigodea,
        nombreplantel: inst.nombreplantel,
        ceduladirector: inst.ceduladirector,
        status: inst.status,
        nombredirector: director?.nombresapellidos || 'Sin registrar',
        telefonodirector: director?.telefono || 'No disponible',
        correodirector: director?.correo || ''
      };
    })
  );

  res.json(resultados);
});

// 🔢 Resumen estadístico para tarjetas animadas
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

//Lote A3

// 🔍 Detalle de institución individual con datos del director
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

// 🗑️ Eliminar institución por código DEA
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

  res.status(204).send();
});

// 🔐 Ruta protegida para acceder al panel principal
app.get('/panel', (req, res) => {
  if (!req.session || !req.session.rol) {
    return res.sendFile(path.join(__dirname, 'public', 'login.html'));
  }
  res.sendFile(path.join(__dirname, 'public', 'panel.html'));
});

// 🧭 Carga de circuitos con supervisor asociado
app.get('/circuitos/listar', async (req, res) => {
  const { data: circuitos, error: errorCircuitos } = await supabase
    .from('circuitoseducativos')
    .select('codcircuitoedu, nombrecircuito, zona, cedulasupervisor')
    .order('codcircuitoedu', { ascending: true });

  if (errorCircuitos) {
    console.error('❌ Error al obtener circuitos:', errorCircuitos);
    return res.status(500).json({ error: 'Error al obtener circuitos' });
  }

  const resultados = await Promise.all(
    circuitos.map(async circuito => {
      let supervisorData = {};

      if (circuito.cedulasupervisor?.trim()) {
        const { data: supervisor } = await supabase
          .from('personal')
          .select('nombresapellidos, telefono, correo')
          .eq('cedula', circuito.cedulasupervisor.trim())
          .eq('cargo_funcional', 'supervisor')
          .single();

        if (supervisor) {
          supervisorData = {
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
        supervisor: supervisorData
      };
    })
  );

  res.json(resultados);
});

// Lote 4

// 🔎 Buscar director por cédula (V12642865, sin importar mayúsculas)
// 🔍 Función sugerida para búsqueda parcial y selección de directores
async function buscarDirectoresSugeridos(texto) {
  const lista = document.getElementById('listaSugerenciasDirector');
  lista.innerHTML = '';

  if (!texto || texto.trim().length < 3) return;

  try {
    const res = await fetch(`/directores/buscar?q=${texto.trim()}`);
    const data = await res.json();

    if (!Array.isArray(data)) return;

    const yaVistos = new Set();

    data.forEach(director => {
      if (yaVistos.has(director.cedula)) return;
      yaVistos.add(director.cedula);

      const item = document.createElement('li');
      item.textContent = `${director.nombresapellidos} (${director.cedula})`;
      item.style.cursor = 'pointer';

      item.onclick = () => {
        const campoCedula = document.getElementById('ceduladirector');
        campoCedula.value = director.cedula;

        const modo = document.getElementById('modoFormulario')?.value || 'crear';
        if (modo === 'crear') {
          mostrarDatosDirector(director);
          document.getElementById('mensajeDirector').textContent = '✔ Director precargado desde búsqueda visual.';
        } else {
          campoCedula.dispatchEvent(new Event('blur')); // activa backend en edición
        }

        lista.innerHTML = '';
      };

      lista.appendChild(item);
    });

    if (lista.childElementCount === 0) {
      const noResults = document.createElement('li');
      noResults.textContent = 'No se encontraron coincidencias';
      lista.appendChild(noResults);
    }
  } catch (e) {
    console.error('❌ Error en buscarDirectoresSugeridos:', e);
  }
}

// 🧠 Búsqueda directa por cédula (usado en modo edición)
async function buscarDirector() {
  const cedula = document.getElementById('ceduladirector').value.trim();
  if (!cedula) return;

  try {
    const res = await fetch(`/directores/cedula/${cedula}`);
    const data = await res.json();

    if (data?.cedula && data?.nombresapellidosrep) {
      mostrarDatosDirector(data);
      document.getElementById('mensajeDirector').textContent = '✔ Director cargado correctamente desde base institucional.';
    } else {
      mostrarDatosDirector({});
      document.getElementById('mensajeDirector').textContent = '❌ No se encontró director con esa cédula.';
    }
  } catch (e) {
    console.error('❌ Error al buscar director:', e);
    mostrarDatosDirector({});
    document.getElementById('mensajeDirector').textContent = '❌ Error al conectar con base de datos.';
  }
}

if (!PORT) {
  console.warn('⚠️ La variable de entorno PORT no está definida. Usando 10000 por defecto.');
}

// 🌐 Redirección al login desde raíz
app.get('/', (req, res) => {
  res.redirect('/login.html');
});

// 🛫 Iniciar servidor
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Servidor escuchando en http://0.0.0.0:${PORT}`);
});