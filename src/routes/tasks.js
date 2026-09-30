const express = require('express');
const fs = require('fs');
const path = require('path');
const { db, UPLOADS_DIR } = require('../db/db');
const { computeTaskCheckpoints } = require('../lib/dueDateLogic');

const router = express.Router();

function validateTaskBody(body) {
  const { title, recurrence_type } = body;
  if (!title || !title.trim()) {
    const err = new Error('Otsikko vaaditaan');
    err.status = 400;
    throw err;
  }
  if (!['quarterly', 'interval'].includes(recurrence_type)) {
    const err = new Error('Virheellinen toistuvuustyyppi');
    err.status = 400;
    throw err;
  }

  if (recurrence_type === 'quarterly') {
    const quarters = Array.isArray(body.quarters) ? body.quarters : [];
    const valid = quarters.every((q) => Number.isInteger(q) && q >= 1 && q <= 4);
    if (quarters.length === 0 || !valid) {
      const err = new Error('Valitse vähintään yksi vuosineljännes');
      err.status = 400;
      throw err;
    }
    return {
      title: title.trim(),
      instructions: body.instructions || null,
      recurrence_type,
      quarters: JSON.stringify([...new Set(quarters)].sort()),
      interval_min_years: null,
      interval_max_years: null,
    };
  }

  const min = Number(body.interval_min_years);
  const max = Number(body.interval_max_years);
  if (!Number.isInteger(min) || !Number.isInteger(max) || min < 1 || max < min) {
    const err = new Error('Virheellinen väli vuosina');
    err.status = 400;
    throw err;
  }
  return {
    title: title.trim(),
    instructions: body.instructions || null,
    recurrence_type,
    quarters: null,
    interval_min_years: min,
    interval_max_years: max,
  };
}

function serializeTask(task) {
  return {
    ...task,
    quarters: task.quarters ? JSON.parse(task.quarters) : null,
  };
}

router.get('/', (req, res) => {
  const tasks = db.prepare('SELECT * FROM tasks ORDER BY title COLLATE NOCASE').all();
  res.json(tasks.map(serializeTask));
});

router.get('/:id', (req, res) => {
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  if (!task) return res.status(404).json({ error: 'Tehtävää ei löytynyt' });

  const completions = db
    .prepare('SELECT * FROM completions WHERE task_id = ? ORDER BY completed_at DESC, id DESC')
    .all(task.id);
  const attachments = db
    .prepare('SELECT * FROM attachments WHERE task_id = ? ORDER BY uploaded_at DESC')
    .all(task.id);
  const checkpoints = computeTaskCheckpoints(task, completions);

  res.json({ ...serializeTask(task), completions, attachments, checkpoints });
});

router.post('/', (req, res) => {
  const data = validateTaskBody(req.body);
  const result = db
    .prepare(
      `INSERT INTO tasks (title, instructions, recurrence_type, quarters, interval_min_years, interval_max_years)
       VALUES (@title, @instructions, @recurrence_type, @quarters, @interval_min_years, @interval_max_years)`
    )
    .run(data);
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(serializeTask(task));
});

router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Tehtävää ei löytynyt' });

  const data = validateTaskBody(req.body);
  db.prepare(
    `UPDATE tasks SET title = @title, instructions = @instructions, recurrence_type = @recurrence_type,
       quarters = @quarters, interval_min_years = @interval_min_years, interval_max_years = @interval_max_years
     WHERE id = @id`
  ).run({ ...data, id: req.params.id });

  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  res.json(serializeTask(task));
});

router.delete('/:id', (req, res) => {
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  if (!task) return res.status(404).json({ error: 'Tehtävää ei löytynyt' });

  const attachments = db.prepare('SELECT * FROM attachments WHERE task_id = ?').all(task.id);
  db.prepare('DELETE FROM tasks WHERE id = ?').run(task.id);

  for (const att of attachments) {
    const filePath = path.join(UPLOADS_DIR, att.stored_path);
    fs.rm(filePath, { force: true }, () => {});
  }

  res.status(204).end();
});

module.exports = router;
