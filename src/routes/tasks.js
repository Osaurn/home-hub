const express = require('express');
const fs = require('fs');
const path = require('path');
const { db, UPLOADS_DIR } = require('../db/db');
const { computeTaskCheckpoints } = require('../lib/dueDateLogic');
const { getTagsForTask, syncTaskTags } = require('../lib/tagHelpers');

const router = express.Router();

function validateTaskBody(body) {
  const { title, recurrence_type } = body;
  if (!title || !title.trim()) {
    const err = new Error('Otsikko vaaditaan');
    err.status = 400;
    throw err;
  }
  if (!['quarterly', 'monthly', 'interval'].includes(recurrence_type)) {
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
      months: null,
      interval_min_years: null,
      interval_max_years: null,
      interval_first_due: null,
    };
  }

  if (recurrence_type === 'monthly') {
    const months = Array.isArray(body.months) ? body.months : [];
    const valid = months.every((m) => Number.isInteger(m) && m >= 1 && m <= 12);
    if (months.length === 0 || !valid) {
      const err = new Error('Valitse vähintään yksi kuukausi');
      err.status = 400;
      throw err;
    }
    return {
      title: title.trim(),
      instructions: body.instructions || null,
      recurrence_type,
      quarters: null,
      months: JSON.stringify([...new Set(months)].sort((a, b) => a - b)),
      interval_min_years: null,
      interval_max_years: null,
      interval_first_due: null,
    };
  }

  const min = Number(body.interval_min_years);
  const max = Number(body.interval_max_years);
  if (!Number.isInteger(min) || !Number.isInteger(max) || min < 1 || max < min) {
    const err = new Error('Virheellinen väli vuosina');
    err.status = 400;
    throw err;
  }
  const firstDue = body.interval_first_due || null;
  if (firstDue !== null && !/^\d{4}-\d{2}-\d{2}$/.test(firstDue)) {
    const err = new Error('Virheellinen ensimmäinen eräpäivä');
    err.status = 400;
    throw err;
  }
  return {
    title: title.trim(),
    instructions: body.instructions || null,
    recurrence_type,
    quarters: null,
    months: null,
    interval_min_years: min,
    interval_max_years: max,
    interval_first_due: firstDue,
  };
}

function serializeTask(task) {
  return {
    ...task,
    quarters: task.quarters ? JSON.parse(task.quarters) : null,
    months: task.months ? JSON.parse(task.months) : null,
  };
}

router.get('/', (req, res) => {
  const tasks = db.prepare('SELECT * FROM tasks ORDER BY title COLLATE NOCASE').all();
  res.json(tasks.map((t) => ({ ...serializeTask(t), tags: getTagsForTask(db, t.id) })));
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
  const tags = getTagsForTask(db, task.id);
  const checkpoints = computeTaskCheckpoints(task, completions);

  res.json({ ...serializeTask(task), completions, attachments, tags, checkpoints });
});

router.post('/', (req, res) => {
  const data = validateTaskBody(req.body);
  const result = db
    .prepare(
      `INSERT INTO tasks (title, instructions, recurrence_type, quarters, months, interval_min_years, interval_max_years, interval_first_due)
       VALUES (@title, @instructions, @recurrence_type, @quarters, @months, @interval_min_years, @interval_max_years, @interval_first_due)`
    )
    .run(data);
  const tagIds = (Array.isArray(req.body.tag_ids) ? req.body.tag_ids : []).map(Number);
  syncTaskTags(db, result.lastInsertRowid, tagIds);

  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ ...serializeTask(task), tags: getTagsForTask(db, task.id) });
});

router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Tehtävää ei löytynyt' });

  const data = validateTaskBody(req.body);
  db.prepare(
    `UPDATE tasks SET title = @title, instructions = @instructions, recurrence_type = @recurrence_type,
       quarters = @quarters, months = @months, interval_min_years = @interval_min_years, interval_max_years = @interval_max_years,
       interval_first_due = @interval_first_due
     WHERE id = @id`
  ).run({ ...data, id: req.params.id });

  const tagIds = (Array.isArray(req.body.tag_ids) ? req.body.tag_ids : []).map(Number);
  syncTaskTags(db, req.params.id, tagIds);

  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  res.json({ ...serializeTask(task), tags: getTagsForTask(db, task.id) });
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
