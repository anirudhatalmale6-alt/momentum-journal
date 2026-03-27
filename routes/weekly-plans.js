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

  res.render('weekly-plans/list', { citizens, activeNav: 'weekly-plans' });
});

router.get('/:citizenId', (req, res) => {
  const citizen = req.db.prepare(`
    SELECT c.*, r.name as room_name FROM citizens c
    LEFT JOIN rooms r ON c.room_id = r.id
    WHERE c.id = ?
  `).get(req.params.citizenId);

  if (!citizen) return res.redirect('/weekly-plans');

  const plans = req.db.prepare(`
    SELECT wp.*, u.full_name as creator_name
    FROM weekly_plans wp
    LEFT JOIN users u ON wp.created_by = u.id
    WHERE wp.citizen_id = ?
    ORDER BY wp.day_of_week, wp.time
  `).all(req.params.citizenId);

  // Group by day
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const schedule = {};
  days.forEach((day, i) => { schedule[i] = []; });
  plans.forEach(p => { schedule[p.day_of_week].push(p); });

  res.render('weekly-plans/schedule', { citizen, schedule, days, activeNav: 'weekly-plans' });
});

router.post('/:citizenId', (req, res) => {
  const { day_of_week, time, activity, plan, work_function, start_date, end_date, plan_id } = req.body;
  if (plan_id) {
    req.db.prepare(`
      UPDATE weekly_plans SET day_of_week=?, time=?, activity=?, plan=?, work_function=?, start_date=?, end_date=?
      WHERE id=? AND citizen_id=?
    `).run(day_of_week, time, activity, plan, work_function, start_date || null, end_date || null, plan_id, req.params.citizenId);
  } else {
    req.db.prepare(`
      INSERT INTO weekly_plans (citizen_id, day_of_week, time, activity, plan, work_function, start_date, end_date, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(req.params.citizenId, day_of_week, time, activity, plan, work_function, start_date || null, end_date || null, req.session.userId);
  }
  res.redirect('/weekly-plans/' + req.params.citizenId);
});

router.post('/:citizenId/:id/delete', (req, res) => {
  req.db.prepare('DELETE FROM weekly_plans WHERE id = ? AND citizen_id = ?').run(req.params.id, req.params.citizenId);
  res.redirect('/weekly-plans/' + req.params.citizenId);
});

module.exports = router;
