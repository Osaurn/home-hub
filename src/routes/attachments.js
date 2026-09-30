const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const { db, UPLOADS_DIR } = require('../db/db');

const router = express.Router();

const storage = multer.diskStorage({
  destination(req, file, cb) {
    const taskDir = path.join(UPLOADS_DIR, req.params.id);
    fs.mkdirSync(taskDir, { recursive: true });
    cb(null, taskDir);
  },
  filename(req, file, cb) {
    const safeName = file.originalname.replace(/[/\\]/g, '_');
    cb(null, `${crypto.randomUUID()}-${safeName}`);
  },
});

const upload = multer({ storage, limits: { fileSize: 25 * 1024 * 1024 } });

router.post('/tasks/:id/attachments', upload.array('files', 10), (req, res) => {
  const task = db.prepare('SELECT id FROM tasks WHERE id = ?').get(req.params.id);
  if (!task) return res.status(404).json({ error: 'Tehtävää ei löytynyt' });

  const insert = db.prepare(
    `INSERT INTO attachments (task_id, filename, stored_path, mime_type, size_bytes)
     VALUES (?, ?, ?, ?, ?)`
  );

  const attachments = (req.files || []).map((file) => {
    const storedPath = path.join(req.params.id, path.basename(file.path));
    const result = insert.run(task.id, file.originalname, storedPath, file.mimetype, file.size);
    return db.prepare('SELECT * FROM attachments WHERE id = ?').get(result.lastInsertRowid);
  });

  res.status(201).json(attachments);
});

router.get('/attachments/:id', (req, res) => {
  const att = db.prepare('SELECT * FROM attachments WHERE id = ?').get(req.params.id);
  if (!att) return res.status(404).json({ error: 'Liitettä ei löytynyt' });

  const filePath = path.join(UPLOADS_DIR, att.stored_path);
  res.download(filePath, att.filename, (err) => {
    if (err && !res.headersSent) res.status(404).json({ error: 'Tiedostoa ei löytynyt' });
  });
});

router.delete('/attachments/:id', (req, res) => {
  const att = db.prepare('SELECT * FROM attachments WHERE id = ?').get(req.params.id);
  if (!att) return res.status(404).json({ error: 'Liitettä ei löytynyt' });

  db.prepare('DELETE FROM attachments WHERE id = ?').run(att.id);
  fs.rm(path.join(UPLOADS_DIR, att.stored_path), { force: true }, () => {});

  res.status(204).end();
});

module.exports = router;
