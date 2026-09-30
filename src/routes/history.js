const express = require('express');
const { db } = require('../db/db');

const router = express.Router();

router.get('/', (req, res) => {
  const sql = `
    SELECT c.id, c.task_id, c.completed_at, c.note, t.title AS task_title
    FROM completions c
    JOIN tasks t ON t.id = c.task_id
    ORDER BY c.completed_at DESC, c.id DESC
  `;

  const limit = Number(req.query.limit);
  if (Number.isInteger(limit) && limit > 0) {
    return res.json(db.prepare(`${sql} LIMIT ?`).all(limit));
  }

  res.json(db.prepare(sql).all());
});

module.exports = router;
