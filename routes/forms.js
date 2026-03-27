const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  const citizens = req.db.prepare(`
    SELECT c.*, r.name as room_name, d.name as department_name,
    (SELECT COUNT(*) FROM forms WHERE citizen_id = c.id) as form_count
    FROM citizens c
    LEFT JOIN rooms r ON c.room_id = r.id
    LEFT JOIN departments d ON c.department_id = d.id
    WHERE c.status = 'active'
    ORDER BY c.last_name, c.first_name
  `).all();

  res.render('forms/list', { citizens, activeNav: 'forms' });
});

router.get('/:citizenId', (req, res) => {
  const citizen = req.db.prepare(`
    SELECT c.*, r.name as room_name FROM citizens c
    LEFT JOIN rooms r ON c.room_id = r.id WHERE c.id = ?
  `).get(req.params.citizenId);
  if (!citizen) return res.redirect((process.env.BASE_PATH || '/journal') + '/forms');

  const forms = req.db.prepare(`
    SELECT f.*, u.full_name as creator_name
    FROM forms f
    LEFT JOIN users u ON f.created_by = u.id
    WHERE f.citizen_id = ?
    ORDER BY f.created_at DESC
  `).all(req.params.citizenId);

  res.render('forms/citizen', { citizen, forms, activeNav: 'forms' });
});

router.post('/:citizenId', (req, res) => {
  const { template_name, data, status } = req.body;
  req.db.prepare('INSERT INTO forms (citizen_id, template_name, data, status, created_by) VALUES (?, ?, ?, ?, ?)')
    .run(req.params.citizenId, template_name, data || '{}', status || 'draft', req.session.userId);
  res.redirect((process.env.BASE_PATH || '/journal') + '/forms/' + req.params.citizenId);
});

module.exports = router;
