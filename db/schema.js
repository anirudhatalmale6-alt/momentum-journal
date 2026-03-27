const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'momentum.db');

function initializeDatabase() {
  const db = new Database(DB_PATH);

  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'staff' CHECK(role IN ('admin','staff')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS departments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT
    );

    CREATE TABLE IF NOT EXISTS rooms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      department_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      status TEXT DEFAULT 'vacant' CHECK(status IN ('occupied','vacant','preparation','no_payment')),
      offers TEXT,
      responsibility TEXT,
      preparation_notes TEXT,
      reservation_notes TEXT,
      FOREIGN KEY (department_id) REFERENCES departments(id)
    );

    CREATE TABLE IF NOT EXISTS citizens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      photo_path TEXT,
      room_id INTEGER,
      department_id INTEGER,
      date_of_birth TEXT,
      admission_date TEXT,
      notes TEXT,
      status TEXT DEFAULT 'active' CHECK(status IN ('active','inactive')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (room_id) REFERENCES rooms(id),
      FOREIGN KEY (department_id) REFERENCES departments(id)
    );

    CREATE TABLE IF NOT EXISTS weekly_plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      citizen_id INTEGER NOT NULL,
      day_of_week INTEGER NOT NULL CHECK(day_of_week BETWEEN 0 AND 6),
      time TEXT,
      activity TEXT,
      plan TEXT,
      work_function TEXT,
      start_date TEXT,
      end_date TEXT,
      created_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (citizen_id) REFERENCES citizens(id),
      FOREIGN KEY (created_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      citizen_id INTEGER NOT NULL,
      template_id INTEGER,
      name TEXT NOT NULL,
      type TEXT CHECK(type IN ('residence','health','safety')),
      status TEXT DEFAULT 'active' CHECK(status IN ('active','completed')),
      content TEXT DEFAULT '{}',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (citizen_id) REFERENCES citizens(id),
      FOREIGN KEY (template_id) REFERENCES plan_templates(id)
    );

    CREATE TABLE IF NOT EXISTS plan_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT CHECK(type IN ('residence','health','safety')),
      settings TEXT DEFAULT 'standard' CHECK(settings IN ('standard','specific')),
      content TEXT DEFAULT '{}',
      method_library_id INTEGER
    );

    CREATE TABLE IF NOT EXISTS diary_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      citizen_id INTEGER NOT NULL,
      author_id INTEGER,
      content TEXT NOT NULL,
      category TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (citizen_id) REFERENCES citizens(id),
      FOREIGN KEY (author_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS calendar_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      citizen_id INTEGER,
      title TEXT NOT NULL,
      description TEXT,
      event_type TEXT DEFAULT 'appointment' CHECK(event_type IN ('appointment','activity','ad_hoc')),
      start_datetime TEXT NOT NULL,
      end_datetime TEXT,
      is_private INTEGER DEFAULT 0,
      color TEXT,
      created_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (citizen_id) REFERENCES citizens(id),
      FOREIGN KEY (created_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      citizen_id INTEGER NOT NULL,
      filename TEXT NOT NULL,
      original_name TEXT NOT NULL,
      file_type TEXT,
      file_size INTEGER DEFAULT 0,
      document_type TEXT,
      uploaded_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (citizen_id) REFERENCES citizens(id),
      FOREIGN KEY (uploaded_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS external_contacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      telephone TEXT,
      mobile TEXT,
      email TEXT,
      secure_email TEXT,
      category TEXT,
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS forms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      citizen_id INTEGER NOT NULL,
      template_name TEXT NOT NULL,
      data TEXT DEFAULT '{}',
      status TEXT DEFAULT 'draft',
      created_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (citizen_id) REFERENCES citizens(id),
      FOREIGN KEY (created_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS organization_docs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT CHECK(category IN ('gdpr','board','important_dates')),
      title TEXT NOT NULL,
      content TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      message TEXT NOT NULL,
      is_read INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS year_wheels (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      citizen_id INTEGER NOT NULL,
      year INTEGER NOT NULL,
      month INTEGER NOT NULL CHECK(month BETWEEN 1 AND 12),
      content TEXT,
      status TEXT DEFAULT 'pending',
      FOREIGN KEY (citizen_id) REFERENCES citizens(id)
    );

    CREATE VIEW IF NOT EXISTS birthdays AS
      SELECT id, first_name, last_name, date_of_birth,
        CAST(strftime('%m', date_of_birth) AS INTEGER) AS birth_month,
        CAST(strftime('%d', date_of_birth) AS INTEGER) AS birth_day
      FROM citizens
      WHERE date_of_birth IS NOT NULL AND status = 'active'
      ORDER BY birth_month, birth_day;
  `);

  // Seed data
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  if (userCount === 0) {
    seedData(db);
  }

  return db;
}

function seedData(db) {
  // Admin user
  const hash = bcrypt.hashSync('admin123', 10);
  db.prepare('INSERT INTO users (username, password_hash, full_name, role) VALUES (?, ?, ?, ?)').run('admin', hash, 'Administrator', 'admin');

  const staffHash = bcrypt.hashSync('staff123', 10);
  db.prepare('INSERT INTO users (username, password_hash, full_name, role) VALUES (?, ?, ?, ?)').run('mlarsen', staffHash, 'Mette Larsen', 'staff');
  db.prepare('INSERT INTO users (username, password_hash, full_name, role) VALUES (?, ?, ?, ?)').run('jnielsen', staffHash, 'Jonas Nielsen', 'staff');

  // Departments
  db.prepare('INSERT INTO departments (id, name, description) VALUES (?, ?, ?)').run(1, 'House Momentum B164', 'Main building at Borgergade 164');
  db.prepare('INSERT INTO departments (id, name, description) VALUES (?, ?, ?)').run(2, 'House Momentum H8', 'Branch at Halmtorvet 8');

  // Rooms - H8
  const rooms = [
    [1, 2, 'H8 Second A', 'vacant', null, null],
    [2, 2, 'H8 Second B', 'occupied', null, null],
    [3, 2, 'H8 Second C', 'occupied', null, null],
    [4, 2, 'H8 Second D', 'vacant', null, null],
    [5, 2, 'H8 First A', 'occupied', null, null],
    [6, 2, 'H8 First B', 'occupied', null, null],
    [7, 2, 'H8 Living room A', 'preparation', null, null],
    [8, 2, 'H8 Living room B', 'no_payment', null, null],
    [9, 1, 'B164 Room 1', 'occupied', null, null],
    [10, 1, 'B164 Room 2', 'occupied', null, null],
    [11, 1, 'B164 Room 3', 'occupied', null, null],
    [12, 1, 'B164 Room 4', 'vacant', null, null],
  ];
  const insertRoom = db.prepare('INSERT INTO rooms (id, department_id, name, status, offers, responsibility) VALUES (?, ?, ?, ?, ?, ?)');
  rooms.forEach(r => insertRoom.run(...r));

  // Citizens
  const citizens = [
    [1, 'Anders', 'Christensen', null, 2, 2, '1985-03-15', '2025-01-10', null, 'active'],
    [2, 'Fatima', 'Al-Hassan', null, 3, 2, '1990-07-22', '2025-02-05', null, 'active'],
    [3, 'Lars', 'Petersen', null, 5, 2, '1978-11-30', '2024-11-15', null, 'active'],
    [4, 'Maria', 'Kowalski', null, 6, 2, '1992-05-08', '2025-03-01', null, 'active'],
    [5, 'Nikolaj', 'Jensen', null, 9, 1, '1988-09-12', '2024-12-20', null, 'active'],
    [6, 'Sofie', 'Andersen', null, 10, 1, '1995-01-25', '2025-01-28', null, 'active'],
    [7, 'Mohammed', 'Ibrahim', null, 11, 1, '1982-06-17', '2024-10-05', null, 'active'],
    [8, 'Emma', 'Rasmussen', null, null, 2, '1997-12-03', '2025-03-10', null, 'active'],
    [9, 'Piotr', 'Nowak', null, null, 1, '1975-04-20', '2024-09-01', null, 'inactive'],
    [10, 'Amina', 'Yusuf', null, null, 2, '1993-08-14', '2025-02-15', null, 'active'],
  ];
  const insertCitizen = db.prepare('INSERT INTO citizens (id, first_name, last_name, photo_path, room_id, department_id, date_of_birth, admission_date, notes, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
  citizens.forEach(c => insertCitizen.run(...c));

  // Update occupied rooms
  db.prepare("UPDATE rooms SET status = 'occupied' WHERE id IN (2,3,5,6,9,10,11)").run();

  // Weekly plan entries
  const weeklyPlans = [
    [1, 1, '09:00', 'Morning meeting', 'Daily routine', 'Social support', '2025-01-10', null, 1],
    [1, 3, '14:00', 'Job counseling', 'Employment plan', 'Career guidance', '2025-01-10', null, 1],
    [2, 1, '10:00', 'Danish class', 'Language training', 'Education', '2025-02-05', null, 1],
    [2, 4, '13:00', 'Social activity', 'Integration', 'Community building', '2025-02-05', null, 1],
    [3, 2, '11:00', 'Health checkup', 'Health plan', 'Health monitoring', '2024-11-15', null, 2],
    [5, 0, '08:30', 'Breakfast duty', 'Daily routine', 'Kitchen support', '2024-12-20', null, 1],
    [5, 5, '15:00', 'Group therapy', 'Recovery plan', 'Mental health', '2024-12-20', null, 2],
    [6, 1, '09:30', 'Art workshop', 'Creative therapy', 'Self-expression', '2025-01-28', null, 3],
  ];
  const insertWP = db.prepare('INSERT INTO weekly_plans (citizen_id, day_of_week, time, activity, plan, work_function, start_date, end_date, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
  weeklyPlans.forEach(w => insertWP.run(...w));

  // Diary entries
  const diaryEntries = [
    [1, 1, 'Anders attended the morning meeting and participated actively. He expressed interest in finding part-time work.', 'daily'],
    [1, 2, 'Follow-up on job application. Anders completed his CV with help from staff.', 'employment'],
    [2, 1, 'Fatima made good progress in Danish class today. She can now hold basic conversations.', 'education'],
    [3, 2, 'Lars had his monthly health check. Blood pressure is within normal range. Continue current medication.', 'health'],
    [5, 1, 'Nikolaj volunteered for kitchen duty and prepared breakfast for the house. Very positive attitude.', 'daily'],
    [6, 3, 'Sofie completed her first art piece in the workshop. She seems more relaxed and engaged.', 'therapy'],
    [7, 1, 'Mohammed met with his mentor today. They discussed his housing plan for the next 6 months.', 'planning'],
  ];
  const insertDiary = db.prepare('INSERT INTO diary_entries (citizen_id, author_id, content, category) VALUES (?, ?, ?, ?)');
  diaryEntries.forEach(d => insertDiary.run(...d));

  // Calendar events
  const calendarEvents = [
    [1, 'Morning meeting', 'Daily check-in with residents', 'appointment', '2026-03-27 09:00', '2026-03-27 09:30', 0, '#4CAF50', 1],
    [2, 'Danish language class', 'Level A2 group session', 'activity', '2026-03-27 10:00', '2026-03-27 11:30', 0, '#2196F3', 1],
    [null, 'Staff meeting', 'Weekly team meeting', 'appointment', '2026-03-28 14:00', '2026-03-28 15:00', 1, '#f44336', 1],
    [3, 'Doctor appointment', 'Annual health screening', 'appointment', '2026-03-29 11:00', '2026-03-29 12:00', 0, '#FF9800', 2],
    [5, 'Group therapy', 'Recovery support group', 'activity', '2026-03-27 15:00', '2026-03-27 16:30', 0, '#4CAF50', 2],
    [null, 'House cleaning', 'Common areas cleaning day', 'ad_hoc', '2026-03-30 09:00', '2026-03-30 12:00', 0, '#9C27B0', 1],
  ];
  const insertEvent = db.prepare('INSERT INTO calendar_events (citizen_id, title, description, event_type, start_datetime, end_datetime, is_private, color, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
  calendarEvents.forEach(e => insertEvent.run(...e));

  // Plan templates
  db.prepare("INSERT INTO plan_templates (name, type, settings, content) VALUES (?, ?, ?, ?)").run('Residence Plan', 'residence', 'standard', JSON.stringify({ sections: ['Goals', 'Actions', 'Timeline', 'Review'] }));
  db.prepare("INSERT INTO plan_templates (name, type, settings, content) VALUES (?, ?, ?, ?)").run('Health Plan', 'health', 'standard', JSON.stringify({ sections: ['Health Status', 'Medication', 'Appointments', 'Goals'] }));
  db.prepare("INSERT INTO plan_templates (name, type, settings, content) VALUES (?, ?, ?, ?)").run('Safety Assessment', 'safety', 'specific', JSON.stringify({ sections: ['Risk Factors', 'Safety Measures', 'Emergency Contacts', 'Action Plan'] }));
  db.prepare("INSERT INTO plan_templates (name, type, settings, content) VALUES (?, ?, ?, ?)").run('Quality Model', 'residence', 'specific', JSON.stringify({ sections: ['Quality Indicators', 'Measurements', 'Improvements'] }));

  // Plans
  db.prepare("INSERT INTO plans (citizen_id, template_id, name, type, status, content) VALUES (?, ?, ?, ?, ?, ?)").run(1, 1, 'Residence Plan', 'residence', 'active', JSON.stringify({ goals: 'Find stable employment', actions: 'Weekly job counseling' }));
  db.prepare("INSERT INTO plans (citizen_id, template_id, name, type, status, content) VALUES (?, ?, ?, ?, ?, ?)").run(2, 1, 'Residence Plan', 'residence', 'active', JSON.stringify({ goals: 'Complete Danish language course', actions: 'Attend classes 3x/week' }));
  db.prepare("INSERT INTO plans (citizen_id, template_id, name, type, status, content) VALUES (?, ?, ?, ?, ?, ?)").run(3, 2, 'Health Plan', 'health', 'active', JSON.stringify({ status: 'Stable', medication: 'Blood pressure medication' }));
  db.prepare("INSERT INTO plans (citizen_id, template_id, name, type, status, content) VALUES (?, ?, ?, ?, ?, ?)").run(5, 3, 'Safety Assessment', 'safety', 'active', JSON.stringify({ risk_factors: 'Low', measures: 'Regular check-ins' }));

  // External contacts
  const contacts = [
    ['Dr. Henrik Madsen', '33 12 45 67', '20 34 56 78', 'hmadsen@sundhed.dk', 'hmadsen@secure.sundhed.dk', 'Healthcare', 'General practitioner'],
    ['Copenhagen Municipality', '33 66 33 66', null, 'info@kk.dk', null, 'Government', 'Social services contact'],
    ['Anne Bergstrom', '33 98 76 54', '21 43 65 87', 'abergstrom@shelter.dk', null, 'Partner Organization', 'Shelter coordinator'],
    ['Legal Aid Copenhagen', '33 15 20 20', null, 'info@legalaid.dk', null, 'Legal', 'Free legal assistance'],
  ];
  const insertContact = db.prepare('INSERT INTO external_contacts (name, telephone, mobile, email, secure_email, category, notes) VALUES (?, ?, ?, ?, ?, ?, ?)');
  contacts.forEach(c => insertContact.run(...c));

  // Notifications
  db.prepare("INSERT INTO notifications (user_id, message) VALUES (?, ?)").run(1, 'Welcome to Momentum Journal! System is ready.');
  db.prepare("INSERT INTO notifications (user_id, message) VALUES (?, ?)").run(1, 'New citizen Amina Yusuf has been registered.');
  db.prepare("INSERT INTO notifications (user_id, message) VALUES (?, ?)").run(1, 'Room H8 Living room A is now in preparation status.');

  // Organization docs
  db.prepare("INSERT INTO organization_docs (category, title, content) VALUES (?, ?, ?)").run('gdpr', 'Data Processing Policy', 'All personal data is processed in accordance with GDPR regulations...');
  db.prepare("INSERT INTO organization_docs (category, title, content) VALUES (?, ?, ?)").run('board', 'Board Meeting Minutes - March 2026', 'Attendees: ...');
  db.prepare("INSERT INTO organization_docs (category, title, content) VALUES (?, ?, ?)").run('important_dates', 'Annual General Meeting', 'Date: June 15, 2026');
}

module.exports = { initializeDatabase, DB_PATH };
