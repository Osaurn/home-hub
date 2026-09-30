const express = require('express');
const { db } = require('../db/db');
const { toISODate } = require('../lib/dueDateLogic');

const router = express.Router();

router.get('/tasks/:id/completions', (req, res) => {
  const task = db.prepare('SELECT id FROM tasks WHERE id = ?').get(req.params.id);
  if (!task) return res.status(404).json({ error: 'Tehtävää ei löytynyt' });

  const completions = db
    .prepare('SELECT * FROM completions WHERE task_id = ? ORDER BY completed_at DESC, id DESC')
    .all(task.id);
  res.json(completions);
});

router.post('/tasks/:id/complete', (req, res) => {
  const task = db.prepare('SELECT id FROM tasks WHERE id = ?').get(req.params.id);
  if (!task) return res.status(404).json({ error: 'Tehtävää ei löytynyt' });

  const completedAt = req.body.completed_at || toISODate(new Date());
  const note = req.body.note || null;

  const result = db
    .prepare('INSERT INTO completions (task_id, completed_at, note) VALUES (?, ?, ?)')
    .run(task.id, completedAt, note);

  const completion = db.prepare('SELECT * FROM completions WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(completion);
});

router.delete('/completions/:id', (req, res) => {
  const completion = db.prepare('SELECT * FROM completions WHERE id = ?').get(req.params.id);
  if (!completion) return res.status(404).json({ error: 'Merkintää ei löytynyt' });

  db.prepare('DELETE FROM completions WHERE id = ?').run(completion.id);
  res.status(204).end();
});

module.exports = router;
