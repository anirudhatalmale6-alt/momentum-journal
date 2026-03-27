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

  // Get plans for each citizen
  citizens.forEach(c => {
    c.plans = req.db.prepare('SELECT * FROM plans WHERE citizen_id = ?').all(c.id);
  });

  res.render('plans/list', { citizens, activeNav: 'plans' });
});

router.get('/templates', (req, res) => {
  const templates = req.db.prepare('SELECT * FROM plan_templates ORDER BY name').all();
  res.render('plans/templates', { templates, activeNav: 'plans' });
});

router.post('/templates', (req, res) => {
  const { name, type, settings, content } = req.body;
  req.db.prepare('INSERT INTO plan_templates (name, type, settings, content) VALUES (?, ?, ?, ?)').run(name, type, settings || 'standard', content || '{}');
  res.redirect((process.env.BASE_PATH || '/journal') + '/plans/templates');
});

router.get('/:citizenId', (req, res) => {
  const citizen = req.db.prepare(`
    SELECT c.*, r.name as room_name FROM citizens c
    LEFT JOIN rooms r ON c.room_id = r.id WHERE c.id = ?
  `).get(req.params.citizenId);
  if (!citizen) return res.redirect((process.env.BASE_PATH || '/journal') + '/plans');

  const plans = req.db.prepare(`
    SELECT p.*, pt.name as template_name FROM plans p
    LEFT JOIN plan_templates pt ON p.template_id = pt.id
    WHERE p.citizen_id = ? ORDER BY p.created_at DESC
  `).all(req.params.citizenId);
  const templates = req.db.prepare('SELECT * FROM plan_templates ORDER BY name').all();

  res.render('plans/citizen', { citizen, plans, templates, activeNav: 'plans' });
});

router.post('/:citizenId', (req, res) => {
  const { template_id, name, type, content, plan_id, status } = req.body;
  if (plan_id) {
    req.db.prepare('UPDATE plans SET name=?, type=?, status=?, content=?, updated_at=CURRENT_TIMESTAMP WHERE id=? AND citizen_id=?')
      .run(name, type, status || 'active', content || '{}', plan_id, req.params.citizenId);
  } else {
    req.db.prepare('INSERT INTO plans (citizen_id, template_id, name, type, content) VALUES (?, ?, ?, ?, ?)')
      .run(req.params.citizenId, template_id || null, name, type, content || '{}');
  }
  res.redirect((process.env.BASE_PATH || '/journal') + '/plans/' + req.params.citizenId);
});

module.exports = router;
