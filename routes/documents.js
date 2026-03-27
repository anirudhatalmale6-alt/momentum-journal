const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

router.get('/', (req, res) => {
  const citizens = req.db.prepare(`
    SELECT c.*, r.name as room_name, d.name as department_name,
    (SELECT COUNT(*) FROM documents WHERE citizen_id = c.id) as doc_count
    FROM citizens c
    LEFT JOIN rooms r ON c.room_id = r.id
    LEFT JOIN departments d ON c.department_id = d.id
    WHERE c.status = 'active'
    ORDER BY c.last_name, c.first_name
  `).all();

  // Calculate total storage used
  const totalSize = req.db.prepare('SELECT COALESCE(SUM(file_size), 0) as total FROM documents').get().total;
  const usedMB = (totalSize / (1024 * 1024)).toFixed(1);
  const maxMB = 1000;

  res.render('documents/list', { citizens, usedMB, maxMB, activeNav: 'documents' });
});

router.get('/:citizenId', (req, res) => {
  const citizen = req.db.prepare(`
    SELECT c.*, r.name as room_name FROM citizens c
    LEFT JOIN rooms r ON c.room_id = r.id WHERE c.id = ?
  `).get(req.params.citizenId);
  if (!citizen) return res.redirect('/documents');

  const documents = req.db.prepare(`
    SELECT d.*, u.full_name as uploader_name
    FROM documents d
    LEFT JOIN users u ON d.uploaded_by = u.id
    WHERE d.citizen_id = ?
    ORDER BY d.created_at DESC
  `).all(req.params.citizenId);

  const totalSize = req.db.prepare('SELECT COALESCE(SUM(file_size), 0) as total FROM documents').get().total;
  const usedMB = (totalSize / (1024 * 1024)).toFixed(1);

  res.render('documents/citizen', { citizen, documents, usedMB, maxMB: 1000, activeNav: 'documents' });
});

router.post('/:citizenId/upload', (req, res, next) => {
  const upload = req.app.locals.uploadDoc;
  upload.single('document')(req, res, (err) => {
    if (err) return res.redirect('/documents/' + req.params.citizenId);
    if (req.file) {
      req.db.prepare(`
        INSERT INTO documents (citizen_id, filename, original_name, file_type, file_size, document_type, uploaded_by)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        req.params.citizenId, req.file.filename, req.file.originalname,
        path.extname(req.file.originalname).toLowerCase(), req.file.size,
        req.body.document_type || 'general', req.session.userId
      );
    }
    res.redirect('/documents/' + req.params.citizenId);
  });
});

router.get('/:citizenId/:id/download', (req, res) => {
  const doc = req.db.prepare('SELECT * FROM documents WHERE id = ? AND citizen_id = ?').get(req.params.id, req.params.citizenId);
  if (!doc) return res.redirect('/documents/' + req.params.citizenId);
  const filePath = path.join(__dirname, '..', 'public', 'uploads', 'documents', doc.filename);
  res.download(filePath, doc.original_name);
});

router.post('/:citizenId/:id/delete', (req, res) => {
  const doc = req.db.prepare('SELECT * FROM documents WHERE id = ? AND citizen_id = ?').get(req.params.id, req.params.citizenId);
  if (doc) {
    const filePath = path.join(__dirname, '..', 'public', 'uploads', 'documents', doc.filename);
    try { fs.unlinkSync(filePath); } catch (e) { /* file may not exist */ }
    req.db.prepare('DELETE FROM documents WHERE id = ?').run(req.params.id);
  }
  res.redirect('/documents/' + req.params.citizenId);
});

module.exports = router;
