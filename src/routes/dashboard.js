const express = require('express');
const { db } = require('../db/db');
const { computeTaskCheckpoints, getQuarter, toISODate } = require('../lib/dueDateLogic');
const { getTagsForTask } = require('../lib/tagHelpers');

const router = express.Router();

const QUARTER_MONTHS = { 1: [1, 2, 3], 2: [4, 5, 6], 3: [7, 8, 9], 4: [10, 11, 12] };

function loadCompletionsByTask() {
  const completionsByTask = new Map();
  for (const c of db.prepare('SELECT * FROM completions').all()) {
    if (!completionsByTask.has(c.task_id)) completionsByTask.set(c.task_id, []);
    completionsByTask.get(c.task_id).push(c);
  }
  return completionsByTask;
}

router.get('/', (req, res) => {
  const now = new Date();
  const tasks = db.prepare('SELECT * FROM tasks').all();
  const completionsByTask = loadCompletionsByTask();

  const dueTasks = [];
  const overdueTasks = [];

  for (const task of tasks) {
    const completions = completionsByTask.get(task.id) || [];
    const checkpoints = computeTaskCheckpoints(task, completions, now);
    for (const checkpoint of checkpoints) {
      const entry = { taskId: task.id, title: task.title, checkpoint, tags: getTagsForTask(db, task.id) };
      if (checkpoint.status === 'due') dueTasks.push(entry);
      else if (checkpoint.status === 'overdue') overdueTasks.push(entry);
    }
  }

  res.json({
    today: toISODate(now),
    currentQuarter: getQuarter(now),
    dueTasks,
    overdueTasks,
  });
});

router.get('/quarters/:q', (req, res) => {
  const q = Number(req.params.q);
  if (!Number.isInteger(q) || q < 1 || q > 4) {
    return res.status(400).json({ error: 'Virheellinen vuosineljännes' });
  }

  const now = new Date();
  const tasks = db.prepare("SELECT * FROM tasks WHERE recurrence_type IN ('quarterly', 'monthly')").all();
  const completionsByTask = loadCompletionsByTask();
  const monthsInQuarter = QUARTER_MONTHS[q];

  const result = [];
  for (const task of tasks) {
    const completions = completionsByTask.get(task.id) || [];
    const checkpoints = computeTaskCheckpoints(task, completions, now);
    for (const checkpoint of checkpoints) {
      const matches =
        (checkpoint.type === 'quarterly' && checkpoint.quarter === q) ||
        (checkpoint.type === 'monthly' && monthsInQuarter.includes(checkpoint.month));
      if (!matches) continue;
      result.push({
        taskId: task.id,
        title: task.title,
        instructions: task.instructions,
        checkpoint,
        tags: getTagsForTask(db, task.id),
      });
    }
  }

  res.json({ quarter: q, year: now.getFullYear(), tasks: result });
});

module.exports = router;
