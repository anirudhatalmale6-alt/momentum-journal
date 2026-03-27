const express = require('express');
const router = express.Router();
const { format, addDays, startOfWeek, addWeeks, subWeeks, parseISO, addMonths, subMonths } = require('date-fns');

router.get('/', (req, res) => {
  let currentDate;
  if (req.query.date) {
    currentDate = parseISO(req.query.date);
  } else {
    currentDate = new Date();
  }

  if (req.query.nav === 'prev-week') currentDate = subWeeks(currentDate, 1);
  if (req.query.nav === 'next-week') currentDate = addWeeks(currentDate, 1);
  if (req.query.nav === 'prev-month') currentDate = subMonths(currentDate, 1);
  if (req.query.nav === 'next-month') currentDate = addMonths(currentDate, 1);

  // Start of week (Monday)
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const days = [];
  for (let i = 0; i < 7; i++) {
    const day = addDays(weekStart, i);
    days.push({
      date: format(day, 'yyyy-MM-dd'),
      label: format(day, 'EEEE'),
      shortDate: format(day, 'dd/MM')
    });
  }

  const weekStartStr = format(weekStart, 'yyyy-MM-dd');
  const weekEndStr = format(addDays(weekStart, 6), 'yyyy-MM-dd');

  const events = req.db.prepare(`
    SELECT ce.*, c.first_name, c.last_name, u.full_name as creator_name
    FROM calendar_events ce
    LEFT JOIN citizens c ON ce.citizen_id = c.id
    LEFT JOIN users u ON ce.created_by = u.id
    WHERE date(ce.start_datetime) BETWEEN ? AND ?
    ORDER BY ce.start_datetime
  `).all(weekStartStr, weekEndStr);

  // Group events by day and type
  const eventsByDay = {};
  days.forEach(d => { eventsByDay[d.date] = { appointments: [], activities: [], ad_hoc: [] }; });
  events.forEach(e => {
    const dayKey = e.start_datetime.substring(0, 10);
    if (eventsByDay[dayKey]) {
      eventsByDay[dayKey][e.event_type === 'appointment' ? 'appointments' : e.event_type === 'activity' ? 'activities' : 'ad_hoc'].push(e);
    }
  });

  const citizens = req.db.prepare("SELECT id, first_name, last_name FROM citizens WHERE status = 'active' ORDER BY last_name").all();

  res.render('calendar/week', {
    days,
    eventsByDay,
    currentDate: format(currentDate, 'yyyy-MM-dd'),
    weekStart: weekStartStr,
    weekEnd: weekEndStr,
    citizens,
    activeNav: 'calendar'
  });
});

router.post('/', (req, res) => {
  const { citizen_id, title, description, event_type, start_datetime, end_datetime, is_private, color } = req.body;
  req.db.prepare(`
    INSERT INTO calendar_events (citizen_id, title, description, event_type, start_datetime, end_datetime, is_private, color, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    citizen_id || null, title, description || null, event_type || 'appointment',
    start_datetime, end_datetime || null, is_private ? 1 : 0, color || '#4CAF50', req.session.userId
  );
  const dateParam = start_datetime ? start_datetime.substring(0, 10) : '';
  res.redirect('/calendar?date=' + dateParam);
});

router.post('/:id/delete', (req, res) => {
  req.db.prepare('DELETE FROM calendar_events WHERE id = ?').run(req.params.id);
  res.redirect('/calendar' + (req.query.date ? '?date=' + req.query.date : ''));
});

module.exports = router;
