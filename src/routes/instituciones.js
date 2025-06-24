const express = require('express');
const router = express.Router();
const supabase = require('../controllers/supabase');

router.get('/', async (_req, res) => {
  const { data, error } = await supabase.from('instituciones').select('*');
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

module.exports = router;
