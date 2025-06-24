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

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

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
