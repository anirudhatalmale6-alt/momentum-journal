const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  const citizens = req.db.prepare(`
    SELECT c.*, r.name as room_name, d.name as department_name,
    (SELECT COUNT(*) FROM diary_entries WHERE citizen_id = c.id) as entry_count
    FROM citizens c
    LEFT JOIN rooms r ON c.room_id = r.id
    LEFT JOIN departments d ON c.department_id = d.id
    WHERE c.status = 'active'
    ORDER BY c.last_name, c.first_name
  `).all();

  res.render('diary/list', { citizens, activeNav: 'diary' });
});

router.get('/:citizenId', (req, res) => {
  const citizen = req.db.prepare(`
    SELECT c.*, r.name as room_name FROM citizens c
    LEFT JOIN rooms r ON c.room_id = r.id WHERE c.id = ?
  `).get(req.params.citizenId);
  if (!citizen) return res.redirect('/diary');

  const entries = req.db.prepare(`
    SELECT de.*, u.full_name as author_name
    FROM diary_entries de
    LEFT JOIN users u ON de.author_id = u.id
    WHERE de.citizen_id = ?
    ORDER BY de.created_at DESC
  `).all(req.params.citizenId);

  res.render('diary/entries', { citizen, entries, activeNav: 'diary' });
});

router.post('/:citizenId', (req, res) => {
  const { content, category } = req.body;
  req.db.prepare('INSERT INTO diary_entries (citizen_id, author_id, content, category) VALUES (?, ?, ?, ?)')
    .run(req.params.citizenId, req.session.userId, content, category || 'daily');
  res.redirect('/diary/' + req.params.citizenId);
});

router.post('/:citizenId/:id/edit', (req, res) => {
  const { content, category } = req.body;
  req.db.prepare('UPDATE diary_entries SET content=?, category=?, updated_at=CURRENT_TIMESTAMP WHERE id=? AND citizen_id=?')
    .run(content, category || 'daily', req.params.id, req.params.citizenId);
  res.redirect('/diary/' + req.params.citizenId);
});

router.post('/:citizenId/:id/delete', (req, res) => {
  req.db.prepare('DELETE FROM diary_entries WHERE id = ? AND citizen_id = ?').run(req.params.id, req.params.citizenId);
  res.redirect('/diary/' + req.params.citizenId);
});

module.exports = router;
