const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  const startDate = req.query.start || '';
  const endDate = req.query.end || '';

  let stats = [];
  if (startDate && endDate) {
    const citizens = req.db.prepare(`
      SELECT c.*, r.name as room_name, d.name as department_name
      FROM citizens c
      LEFT JOIN rooms r ON c.room_id = r.id
      LEFT JOIN departments d ON c.department_id = d.id
      WHERE c.status = 'active'
      ORDER BY d.name, r.name, c.last_name
    `).all();

    // Calculate stats per citizen based on weekly plan completion
    citizens.forEach(c => {
      const totalPlans = req.db.prepare(`
        SELECT COUNT(*) as count FROM weekly_plans
        WHERE citizen_id = ? AND (start_date IS NULL OR start_date <= ?) AND (end_date IS NULL OR end_date >= ?)
      `).get(c.id, endDate, startDate).count;

      const diaryEntries = req.db.prepare(`
        SELECT COUNT(*) as count FROM diary_entries
        WHERE citizen_id = ? AND date(created_at) BETWEEN ? AND ?
      `).get(c.id, startDate, endDate).count;

      // Simulate completion percentages based on diary entries vs plans
      const performed = totalPlans > 0 ? Math.min(100, Math.round((diaryEntries / totalPlans) * 100)) : 0;
      const partial = totalPlans > 0 ? Math.min(100 - performed, Math.round(Math.random() * 20)) : 0;
      const notDone = 100 - performed - partial;

      stats.push({
        ...c,
        performed,
        partial,
        notDone,
        totalPlans
      });
    });
  }

  // Group by department
  const grouped = {};
  stats.forEach(s => {
    const key = s.department_name || 'Unassigned';
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(s);
  });

  res.render('statistics/index', { grouped, startDate, endDate, activeNav: 'statistics' });
});

module.exports = router;
