const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  const search = req.query.search || '';
  let citizens;
  if (search) {
    citizens = req.db.prepare(`
      SELECT c.*, r.name as room_name, d.name as department_name
      FROM citizens c
      LEFT JOIN rooms r ON c.room_id = r.id
      LEFT JOIN departments d ON c.department_id = d.id
      WHERE c.first_name LIKE ? OR c.last_name LIKE ?
      ORDER BY c.last_name, c.first_name
    `).all(`%${search}%`, `%${search}%`);
  } else {
    citizens = req.db.prepare(`
      SELECT c.*, r.name as room_name, d.name as department_name
      FROM citizens c
      LEFT JOIN rooms r ON c.room_id = r.id
      LEFT JOIN departments d ON c.department_id = d.id
      ORDER BY c.last_name, c.first_name
    `).all();
  }

  res.render('citizens/list', { citizens, search, activeNav: 'citizens' });
});

router.get('/new', (req, res) => {
  const departments = req.db.prepare('SELECT * FROM departments').all();
  const rooms = req.db.prepare('SELECT * FROM rooms WHERE status = ?').all('vacant');
  res.render('citizens/new', { departments, rooms, activeNav: 'citizens' });
});

router.post('/', (req, res) => {
  const { first_name, last_name, date_of_birth, room_id, department_id, admission_date, notes } = req.body;
  req.db.prepare(`
    INSERT INTO citizens (first_name, last_name, date_of_birth, room_id, department_id, admission_date, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(first_name, last_name, date_of_birth || null, room_id || null, department_id || null, admission_date || null, notes || null);

  if (room_id) {
    req.db.prepare("UPDATE rooms SET status = 'occupied' WHERE id = ?").run(room_id);
  }
  res.redirect('/citizens');
});

router.get('/:id', (req, res) => {
  const citizen = req.db.prepare(`
    SELECT c.*, r.name as room_name, d.name as department_name
    FROM citizens c
    LEFT JOIN rooms r ON c.room_id = r.id
    LEFT JOIN departments d ON c.department_id = d.id
    WHERE c.id = ?
  `).get(req.params.id);

  if (!citizen) return res.redirect('/citizens');

  const plans = req.db.prepare('SELECT * FROM plans WHERE citizen_id = ?').all(req.params.id);
  const recentDiary = req.db.prepare(`
    SELECT de.*, u.full_name as author_name
    FROM diary_entries de
    LEFT JOIN users u ON de.author_id = u.id
    WHERE de.citizen_id = ?
    ORDER BY de.created_at DESC LIMIT 5
  `).all(req.params.id);

  res.render('citizens/profile', { citizen, plans, recentDiary, activeNav: 'citizens' });
});

router.post('/:id', (req, res) => {
  const { first_name, last_name, date_of_birth, room_id, department_id, admission_date, notes, status } = req.body;
  req.db.prepare(`
    UPDATE citizens SET first_name=?, last_name=?, date_of_birth=?, room_id=?, department_id=?, admission_date=?, notes=?, status=?
    WHERE id=?
  `).run(first_name, last_name, date_of_birth || null, room_id || null, department_id || null, admission_date || null, notes || null, status || 'active', req.params.id);
  res.redirect('/citizens/' + req.params.id);
});

router.post('/:id/photo', (req, res, next) => {
  const upload = req.app.locals.uploadPhoto;
  upload.single('photo')(req, res, (err) => {
    if (err) return res.redirect('/citizens/' + req.params.id);
    if (req.file) {
      req.db.prepare('UPDATE citizens SET photo_path = ? WHERE id = ?').run('/uploads/photos/' + req.file.filename, req.params.id);
    }
    res.redirect('/citizens/' + req.params.id);
  });
});

module.exports = router;
