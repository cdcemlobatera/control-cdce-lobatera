const express = require('express');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 10000;

// Middleware
app.use(express.json());
app.use('/instituciones', require('./routes/instituciones'));
app.use(express.static(path.join(__dirname, 'views')));

// Inicia servidor
app.listen(PORT, () => {
  console.log(`✅ Servidor escuchando en el puerto ${PORT}`);
});
