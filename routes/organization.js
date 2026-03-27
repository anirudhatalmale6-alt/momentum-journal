const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.render('organization/index', { activeNav: 'organization' });
});

router.get('/rooms', (req, res) => {
  const rooms = req.db.prepare(`
    SELECT r.*, d.name as department_name,
    c.first_name, c.last_name
    FROM rooms r
    LEFT JOIN departments d ON r.department_id = d.id
    LEFT JOIN citizens c ON c.room_id = r.id AND c.status = 'active'
    ORDER BY d.name, r.name
  `).all();

  const statusCounts = {
    occupied: rooms.filter(r => r.status === 'occupied').length,
    vacant: rooms.filter(r => r.status === 'vacant').length,
    preparation: rooms.filter(r => r.status === 'preparation').length,
    no_payment: rooms.filter(r => r.status === 'no_payment').length,
  };

  res.render('organization/rooms', { rooms, statusCounts, activeNav: 'organization' });
});

router.post('/rooms/:id', (req, res) => {
  const { status, offers, responsibility, preparation_notes, reservation_notes } = req.body;
  req.db.prepare(`
    UPDATE rooms SET status=?, offers=?, responsibility=?, preparation_notes=?, reservation_notes=?
    WHERE id=?
  `).run(status, offers || null, responsibility || null, preparation_notes || null, reservation_notes || null, req.params.id);
  res.redirect('/organization/rooms');
});

router.get('/contacts', (req, res) => {
  const letter = req.query.letter || '';
  const search = req.query.search || '';
  const category = req.query.category || '';

  let query = 'SELECT * FROM external_contacts WHERE 1=1';
  const params = [];
  if (letter) { query += ' AND name LIKE ?'; params.push(letter + '%'); }
  if (search) { query += ' AND (name LIKE ? OR email LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
  if (category) { query += ' AND category = ?'; params.push(category); }
  query += ' ORDER BY name';

  const contacts = req.db.prepare(query).all(...params);
  const categories = req.db.prepare('SELECT DISTINCT category FROM external_contacts WHERE category IS NOT NULL ORDER BY category').all();

  res.render('organization/contacts', { contacts, categories, letter, search, category, activeNav: 'organization' });
});

router.post('/contacts', (req, res) => {
  const { name, telephone, mobile, email, secure_email, category, notes } = req.body;
  req.db.prepare('INSERT INTO external_contacts (name, telephone, mobile, email, secure_email, category, notes) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(name, telephone || null, mobile || null, email || null, secure_email || null, category || null, notes || null);
  res.redirect('/organization/contacts');
});

router.get('/departments', (req, res) => {
  const departments = req.db.prepare(`
    SELECT d.*,
    (SELECT COUNT(*) FROM rooms WHERE department_id = d.id) as room_count,
    (SELECT COUNT(*) FROM citizens WHERE department_id = d.id AND status = 'active') as citizen_count
    FROM departments d ORDER BY d.name
  `).all();
  res.render('organization/departments', { departments, activeNav: 'organization' });
});

router.post('/departments', (req, res) => {
  const { name, description } = req.body;
  req.db.prepare('INSERT INTO departments (name, description) VALUES (?, ?)').run(name, description || null);
  res.redirect('/organization/departments');
});

router.get('/notifications', (req, res) => {
  const notifications = req.db.prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC').all(req.session.userId);
  res.render('organization/notifications', { notifications, activeNav: 'organization' });
});

router.post('/notifications/:id/read', (req, res) => {
  req.db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?').run(req.params.id, req.session.userId);
  res.redirect('/organization/notifications');
});

router.get('/gdpr', (req, res) => {
  const docs = req.db.prepare("SELECT * FROM organization_docs WHERE category = 'gdpr' ORDER BY created_at DESC").all();
  res.render('organization/gdpr', { docs, activeNav: 'organization' });
});

router.get('/board', (req, res) => {
  const docs = req.db.prepare("SELECT * FROM organization_docs WHERE category = 'board' ORDER BY created_at DESC").all();
  res.render('organization/board', { docs, activeNav: 'organization' });
});

router.get('/important-dates', (req, res) => {
  const docs = req.db.prepare("SELECT * FROM organization_docs WHERE category = 'important_dates' ORDER BY created_at DESC").all();
  res.render('organization/important-dates', { docs, activeNav: 'organization' });
});

module.exports = router;
