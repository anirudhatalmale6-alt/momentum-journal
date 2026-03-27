const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  const departmentId = req.query.department || null;
  const search = req.query.search || '';
  const tab = req.query.tab || 'daily';

  const departments = req.db.prepare('SELECT * FROM departments').all();

  let citizens;
  if (departmentId) {
    if (search) {
      citizens = req.db.prepare(`
        SELECT c.*, r.name as room_name, d.name as department_name
        FROM citizens c
        LEFT JOIN rooms r ON c.room_id = r.id
        LEFT JOIN departments d ON c.department_id = d.id
        WHERE c.department_id = ? AND c.status = 'active'
        AND (c.first_name LIKE ? OR c.last_name LIKE ?)
        ORDER BY c.last_name, c.first_name
      `).all(departmentId, `%${search}%`, `%${search}%`);
    } else {
      citizens = req.db.prepare(`
        SELECT c.*, r.name as room_name, d.name as department_name
        FROM citizens c
        LEFT JOIN rooms r ON c.room_id = r.id
        LEFT JOIN departments d ON c.department_id = d.id
        WHERE c.department_id = ? AND c.status = 'active'
        ORDER BY c.last_name, c.first_name
      `).all(departmentId);
    }
  } else {
    citizens = req.db.prepare(`
      SELECT c.*, r.name as room_name, d.name as department_name
      FROM citizens c
      LEFT JOIN rooms r ON c.room_id = r.id
      LEFT JOIN departments d ON c.department_id = d.id
      WHERE c.status = 'active'
      ORDER BY c.last_name, c.first_name
    `).all();
  }

  // Get upcoming birthdays
  const birthdays = req.db.prepare(`
    SELECT * FROM birthdays LIMIT 5
  `).all();

  res.render('frontpage', {
    departments,
    citizens,
    selectedDepartment: departmentId,
    search,
    tab,
    birthdays,
    activeNav: 'frontpage'
  });
});

module.exports = router;
