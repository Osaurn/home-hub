const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const { db, UPLOADS_DIR } = require('../db/db');
const { computeTaskCheckpoints } = require('../lib/dueDateLogic');
const { warrantyStatus } = require('../lib/warranty');

const router = express.Router();

const FIELDS = ['icon', 'category', 'location', 'model', 'serial_number', 'purchase_date', 'warranty_expires', 'warranty_notes', 'instructions', 'notes'];

const INLINE_TYPES = new Set(['application/pdf', 'image/png', 'image/jpeg', 'image/gif', 'image/webp']);

function badRequest(message) {
  const err = new Error(message);
  err.status = 400;
  return err;
}

function validateEquipmentBody(body) {
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name) throw badRequest('Nimi vaaditaan');
  const data = { name };
  for (const f of FIELDS) {
    const v = typeof body[f] === 'string' ? body[f].trim() : '';
    data[f] = v || null;
  }
  if (data.purchase_date !== null && !/^\d{4}-\d{2}-\d{2}$/.test(data.purchase_date)) {
    throw badRequest('Virheellinen hankintapäivä');
  }
  if (data.icon !== null && [...data.icon].length > 8) {
    throw badRequest('Virheellinen kuvake');
  }
  if (data.warranty_expires !== null && !/^\d{4}-\d{2}-\d{2}$/.test(data.warranty_expires)) {
    throw badRequest('Virheellinen takuun päättymispäivä');
  }
  return data;
}

// Manuals live under uploads/equipment/<id>/ so they never collide with
// the numeric per-task attachment folders.
const storage = multer.diskStorage({
  destination(req, file, cb) {
    const dir = path.join(UPLOADS_DIR, 'equipment', String(Number(req.params.id)));
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename(req, file, cb) {
    const safeName = file.originalname.replace(/[/\\]/g, '_');
    cb(null, `${crypto.randomUUID()}-${safeName}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 25 * 1024 * 1024 } });

function withWarranty(e) {
  return { ...e, warranty: warrantyStatus(e.warranty_expires) };
}

function loadTasksWithCheckpoints(equipmentId) {
  const tasks = db.prepare('SELECT * FROM tasks WHERE equipment_id = ? ORDER BY title COLLATE NOCASE').all(equipmentId);
  return tasks.map((task) => {
    const completions = db.prepare('SELECT * FROM completions WHERE task_id = ?').all(task.id);
    return {
      ...task,
      quarters: task.quarters ? JSON.parse(task.quarters) : null,
      months: task.months ? JSON.parse(task.months) : null,
      checkpoints: computeTaskCheckpoints(task, completions),
    };
  });
}

router.get('/equipment', (req, res) => {
  const rows = db.prepare('SELECT * FROM equipment ORDER BY name COLLATE NOCASE').all();
  const manualCounts = new Map(
    db
      .prepare('SELECT equipment_id, COUNT(*) AS n FROM equipment_manuals GROUP BY equipment_id')
      .all()
      .map((r) => [r.equipment_id, r.n])
  );
  res.json(
    rows.map((e) => {
      const tasks = loadTasksWithCheckpoints(e.id);
      const statuses = tasks.flatMap((t) => t.checkpoints.map((c) => c.status));
      return {
        ...withWarranty(e),
        manual_count: manualCounts.get(e.id) || 0,
        task_count: tasks.length,
        overdue_count: statuses.filter((s) => s === 'overdue').length,
        due_count: statuses.filter((s) => s === 'due').length,
      };
    })
  );
});

router.post('/equipment', (req, res) => {
  const data = validateEquipmentBody(req.body);
  const result = db
    .prepare(
      `INSERT INTO equipment (name, icon, category, location, model, serial_number, purchase_date, warranty_expires, warranty_notes, instructions, notes)
       VALUES (@name, @icon, @category, @location, @model, @serial_number, @purchase_date, @warranty_expires, @warranty_notes, @instructions, @notes)`
    )
    .run(data);
  res.status(201).json(db.prepare('SELECT * FROM equipment WHERE id = ?').get(result.lastInsertRowid));
});

router.get('/equipment/:id', (req, res) => {
  const equipment = db.prepare('SELECT * FROM equipment WHERE id = ?').get(req.params.id);
  if (!equipment) return res.status(404).json({ error: 'Laitetta ei löytynyt' });

  const manuals = db
    .prepare('SELECT * FROM equipment_manuals WHERE equipment_id = ? ORDER BY uploaded_at DESC, id DESC')
    .all(equipment.id);
  const tasks = loadTasksWithCheckpoints(equipment.id);
  const history = db
    .prepare(
      `SELECT c.id, c.task_id, c.completed_at, c.note, t.title AS task_title
       FROM completions c JOIN tasks t ON t.id = c.task_id
       WHERE t.equipment_id = ?
       ORDER BY c.completed_at DESC, c.id DESC`
    )
    .all(equipment.id);

  res.json({ ...withWarranty(equipment), manuals, tasks, history });
});

router.put('/equipment/:id', (req, res) => {
  const existing = db.prepare('SELECT id FROM equipment WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Laitetta ei löytynyt' });

  const data = validateEquipmentBody(req.body);
  db.prepare(
    `UPDATE equipment SET name = @name, icon = @icon, category = @category, location = @location, model = @model,
       serial_number = @serial_number, purchase_date = @purchase_date,
       warranty_expires = @warranty_expires, warranty_notes = @warranty_notes, instructions = @instructions, notes = @notes
     WHERE id = @id`
  ).run({ ...data, id: existing.id });
  res.json(db.prepare('SELECT * FROM equipment WHERE id = ?').get(existing.id));
});

router.delete('/equipment/:id', (req, res) => {
  const equipment = db.prepare('SELECT id FROM equipment WHERE id = ?').get(req.params.id);
  if (!equipment) return res.status(404).json({ error: 'Laitetta ei löytynyt' });

  db.prepare('DELETE FROM equipment WHERE id = ?').run(equipment.id);
  // Manual rows are gone via cascade; remove the whole manuals folder.
  fs.rm(path.join(UPLOADS_DIR, 'equipment', String(equipment.id)), { recursive: true, force: true }, () => {});
  res.status(204).end();
});

router.post('/equipment/:id/manuals', upload.array('files', 10), (req, res) => {
  const equipment = db.prepare('SELECT id FROM equipment WHERE id = ?').get(req.params.id);
  if (!equipment) {
    for (const f of req.files || []) fs.rm(f.path, { force: true }, () => {});
    return res.status(404).json({ error: 'Laitetta ei löytynyt' });
  }

  const insert = db.prepare(
    `INSERT INTO equipment_manuals (equipment_id, filename, stored_path, mime_type, size_bytes)
     VALUES (?, ?, ?, ?, ?)`
  );
  const manuals = (req.files || []).map((file) => {
    const storedPath = path.join('equipment', String(equipment.id), path.basename(file.path));
    const result = insert.run(equipment.id, file.originalname, storedPath, file.mimetype, file.size);
    return db.prepare('SELECT * FROM equipment_manuals WHERE id = ?').get(result.lastInsertRowid);
  });
  res.status(201).json(manuals);
});

router.get('/manuals/:id', (req, res) => {
  const manual = db.prepare('SELECT * FROM equipment_manuals WHERE id = ?').get(req.params.id);
  if (!manual) return res.status(404).json({ error: 'Ohjetta ei löytynyt' });

  const filePath = path.join(UPLOADS_DIR, manual.stored_path);
  const onError = (err) => {
    if (err && !res.headersSent) res.status(404).json({ error: 'Tiedostoa ei löytynyt' });
  };
  // PDFs and common images are served inline so they can be previewed in
  // the app; everything else (never HTML/SVG) downloads.
  if (INLINE_TYPES.has(manual.mime_type)) {
    res.type(manual.mime_type);
    res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(manual.filename)}`);
    res.sendFile(filePath, onError);
  } else {
    res.download(filePath, manual.filename, onError);
  }
});

router.delete('/manuals/:id', (req, res) => {
  const manual = db.prepare('SELECT * FROM equipment_manuals WHERE id = ?').get(req.params.id);
  if (!manual) return res.status(404).json({ error: 'Ohjetta ei löytynyt' });

  db.prepare('DELETE FROM equipment_manuals WHERE id = ?').run(manual.id);
  fs.rm(path.join(UPLOADS_DIR, manual.stored_path), { force: true }, () => {});
  res.status(204).end();
});

module.exports = router;
