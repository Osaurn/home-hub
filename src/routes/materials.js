const express = require('express');
const { db } = require('../db/db');
const {
  createUploader,
  storedPathFor,
  removeUploadedFiles,
  removeOwnerFolder,
  removeStoredFile,
  sendStoredFile,
} = require('../lib/fileUploads');

const router = express.Router();

const TEXT_FIELDS = [
  'icon',
  'category',
  'location',
  'brand',
  'product',
  'color_name',
  'color_code',
  'color_hex',
  'finish',
  'supplier',
  'purchased_at',
  'quantity',
  'notes',
];
const COLUMNS = ['name', ...TEXT_FIELDS];

const upload = createUploader('materials');

function badRequest(message) {
  const err = new Error(message);
  err.status = 400;
  return err;
}

function validateMaterialBody(body) {
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name) throw badRequest('Nimi vaaditaan');
  const data = { name };
  for (const f of TEXT_FIELDS) {
    const v = typeof body[f] === 'string' ? body[f].trim() : '';
    data[f] = v || null;
  }
  if (data.icon !== null && [...data.icon].length > 8) throw badRequest('Virheellinen kuvake');
  if (data.color_hex !== null && !/^#[0-9a-fA-F]{6}$/.test(data.color_hex)) throw badRequest('Virheellinen väri');
  if (data.color_hex !== null) data.color_hex = data.color_hex.toLowerCase();
  if (data.purchased_at !== null && !/^\d{4}-\d{2}-\d{2}$/.test(data.purchased_at)) {
    throw badRequest('Virheellinen hankintapäivä');
  }
  return data;
}

router.get('/materials', (req, res) => {
  const rows = db
    .prepare(
      `SELECT m.*, (SELECT COUNT(*) FROM material_files f WHERE f.material_id = m.id) AS file_count
       FROM materials m ORDER BY m.name COLLATE NOCASE`
    )
    .all();
  res.json(rows);
});

router.post('/materials', (req, res) => {
  const data = validateMaterialBody(req.body);
  const result = db
    .prepare(`INSERT INTO materials (${COLUMNS.join(', ')}) VALUES (${COLUMNS.map((c) => '@' + c).join(', ')})`)
    .run(data);
  res.status(201).json(db.prepare('SELECT * FROM materials WHERE id = ?').get(result.lastInsertRowid));
});

router.get('/materials/:id', (req, res) => {
  const material = db.prepare('SELECT * FROM materials WHERE id = ?').get(req.params.id);
  if (!material) return res.status(404).json({ error: 'Materiaalia ei löytynyt' });
  const files = db
    .prepare('SELECT * FROM material_files WHERE material_id = ? ORDER BY uploaded_at DESC, id DESC')
    .all(material.id);
  res.json({ ...material, files });
});

router.put('/materials/:id', (req, res) => {
  const existing = db.prepare('SELECT id FROM materials WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Materiaalia ei löytynyt' });

  const data = validateMaterialBody(req.body);
  db.prepare(`UPDATE materials SET ${COLUMNS.map((c) => `${c} = @${c}`).join(', ')} WHERE id = @id`).run({
    ...data,
    id: existing.id,
  });
  res.json(db.prepare('SELECT * FROM materials WHERE id = ?').get(existing.id));
});

router.delete('/materials/:id', (req, res) => {
  const material = db.prepare('SELECT id FROM materials WHERE id = ?').get(req.params.id);
  if (!material) return res.status(404).json({ error: 'Materiaalia ei löytynyt' });

  db.prepare('DELETE FROM materials WHERE id = ?').run(material.id);
  removeOwnerFolder('materials', material.id);
  res.status(204).end();
});

router.post('/materials/:id/files', upload.array('files', 10), (req, res) => {
  const material = db.prepare('SELECT id FROM materials WHERE id = ?').get(req.params.id);
  if (!material) {
    removeUploadedFiles(req.files);
    return res.status(404).json({ error: 'Materiaalia ei löytynyt' });
  }

  const insert = db.prepare(
    `INSERT INTO material_files (material_id, filename, stored_path, mime_type, size_bytes)
     VALUES (?, ?, ?, ?, ?)`
  );
  const files = (req.files || []).map((file) => {
    const result = insert.run(
      material.id,
      file.originalname,
      storedPathFor('materials', material.id, file),
      file.mimetype,
      file.size
    );
    return db.prepare('SELECT * FROM material_files WHERE id = ?').get(result.lastInsertRowid);
  });
  res.status(201).json(files);
});

router.get('/material-files/:id', (req, res) => {
  const file = db.prepare('SELECT * FROM material_files WHERE id = ?').get(req.params.id);
  if (!file) return res.status(404).json({ error: 'Tiedostoa ei löytynyt' });
  sendStoredFile(res, file);
});

router.delete('/material-files/:id', (req, res) => {
  const file = db.prepare('SELECT * FROM material_files WHERE id = ?').get(req.params.id);
  if (!file) return res.status(404).json({ error: 'Tiedostoa ei löytynyt' });

  db.prepare('DELETE FROM material_files WHERE id = ?').run(file.id);
  removeStoredFile(file.stored_path);
  res.status(204).end();
});

module.exports = router;
