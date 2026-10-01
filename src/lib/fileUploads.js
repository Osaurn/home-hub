const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const { UPLOADS_DIR } = require('../db/db');

// PDFs and common images can be previewed in the app; everything else
// (never HTML/SVG, which could run script) is served as a download.
const INLINE_TYPES = new Set(['application/pdf', 'image/png', 'image/jpeg', 'image/gif', 'image/webp']);

// Multer middleware storing files under uploads/<subdir>/<req.params.id>/.
function createUploader(subdir) {
  const storage = multer.diskStorage({
    destination(req, file, cb) {
      const dir = path.join(UPLOADS_DIR, subdir, String(Number(req.params.id)));
      fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename(req, file, cb) {
      const safeName = file.originalname.replace(/[/\\]/g, '_');
      cb(null, `${crypto.randomUUID()}-${safeName}`);
    },
  });
  return multer({ storage, limits: { fileSize: 25 * 1024 * 1024 } });
}

// Path stored in the DB (relative to UPLOADS_DIR) for a just-uploaded file.
function storedPathFor(subdir, ownerId, file) {
  return path.join(subdir, String(ownerId), path.basename(file.path));
}

function removeUploadedFiles(files) {
  for (const f of files || []) fs.rm(f.path, { force: true }, () => {});
}

function removeOwnerFolder(subdir, ownerId) {
  fs.rm(path.join(UPLOADS_DIR, subdir, String(ownerId)), { recursive: true, force: true }, () => {});
}

function removeStoredFile(storedPath) {
  fs.rm(path.join(UPLOADS_DIR, storedPath), { force: true }, () => {});
}

// Sends a row with {stored_path, filename, mime_type}.
function sendStoredFile(res, row) {
  const filePath = path.join(UPLOADS_DIR, row.stored_path);
  const onError = (err) => {
    if (err && !res.headersSent) res.status(404).json({ error: 'Tiedostoa ei löytynyt' });
  };
  if (INLINE_TYPES.has(row.mime_type)) {
    res.type(row.mime_type);
    res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(row.filename)}`);
    res.sendFile(filePath, onError);
  } else {
    res.download(filePath, row.filename, onError);
  }
}

module.exports = { createUploader, storedPathFor, removeUploadedFiles, removeOwnerFolder, removeStoredFile, sendStoredFile, INLINE_TYPES };
