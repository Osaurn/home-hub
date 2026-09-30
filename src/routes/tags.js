const express = require('express');
const { db } = require('../db/db');

const router = express.Router();

router.get('/', (req, res) => {
  const tags = db.prepare('SELECT * FROM tags ORDER BY name COLLATE NOCASE').all();
  res.json(tags);
});

router.post('/', (req, res) => {
  const name = (req.body.name || '').trim();
  if (!name) {
    return res.status(400).json({ error: 'Tunnisteen nimi vaaditaan' });
  }

  const existing = db.prepare('SELECT * FROM tags WHERE name = ? COLLATE NOCASE').get(name);
  if (existing) {
    return res.status(200).json(existing);
  }

  const result = db.prepare('INSERT INTO tags (name) VALUES (?)').run(name);
  const tag = db.prepare('SELECT * FROM tags WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(tag);
});

router.delete('/:id', (req, res) => {
  const tag = db.prepare('SELECT * FROM tags WHERE id = ?').get(req.params.id);
  if (!tag) return res.status(404).json({ error: 'Tunnistetta ei löytynyt' });

  db.prepare('DELETE FROM tags WHERE id = ?').run(tag.id);
  res.status(204).end();
});

module.exports = router;
