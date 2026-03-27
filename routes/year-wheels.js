const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  const citizens = req.db.prepare(`
    SELECT c.*, r.name as room_name, d.name as department_name
    FROM citizens c
    LEFT JOIN rooms r ON c.room_id = r.id
    LEFT JOIN departments d ON c.department_id = d.id
    WHERE c.status = 'active'
    ORDER BY c.last_name, c.first_name
  `).all();
  res.render('year-wheels/list', { citizens, activeNav: 'year-wheels' });
});

router.get('/:citizenId', (req, res) => {
  const citizen = req.db.prepare(`
    SELECT c.*, r.name as room_name FROM citizens c
    LEFT JOIN rooms r ON c.room_id = r.id WHERE c.id = ?
  `).get(req.params.citizenId);
  if (!citizen) return res.redirect((process.env.BASE_PATH || '/journal') + '/year-wheels');

  const year = parseInt(req.query.year) || new Date().getFullYear();
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  const wheels = req.db.prepare('SELECT * FROM year_wheels WHERE citizen_id = ? AND year = ? ORDER BY month').all(req.params.citizenId, year);
  const wheelMap = {};
  wheels.forEach(w => { wheelMap[w.month] = w; });

  res.render('year-wheels/citizen', { citizen, year, months, wheelMap, activeNav: 'year-wheels' });
});

router.post('/:citizenId', (req, res) => {
  const { year, month, content, status } = req.body;
  const existing = req.db.prepare('SELECT id FROM year_wheels WHERE citizen_id = ? AND year = ? AND month = ?')
    .get(req.params.citizenId, year, month);

  if (existing) {
    req.db.prepare('UPDATE year_wheels SET content = ?, status = ? WHERE id = ?')
      .run(content || '', status || 'pending', existing.id);
  } else {
    req.db.prepare('INSERT INTO year_wheels (citizen_id, year, month, content, status) VALUES (?, ?, ?, ?, ?)')
      .run(req.params.citizenId, year, month, content || '', status || 'pending');
  }
  res.redirect((process.env.BASE_PATH || '/journal') + '/year-wheels/' + req.params.citizenId + '?year=' + year);
});

module.exports = router;
