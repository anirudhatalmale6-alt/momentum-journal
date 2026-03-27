const express = require('express');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const path = require('path');
const multer = require('multer');
const { initializeDatabase } = require('./db/schema');
const { requireAuth } = require('./middleware/auth');

const app = express();
const PORT = 3003;

// Initialize database
const db = initializeDatabase();
app.locals.db = db;

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Session
app.use(session({
  store: new SQLiteStore({ db: 'sessions.db', dir: path.join(__dirname, 'db') }),
  secret: 'momentum-kbh-secret-2026',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

// File upload config
const photoStorage = multer.diskStorage({
  destination: path.join(__dirname, 'public/uploads/photos'),
  filename: (req, file, cb) => {
    cb(null, 'citizen-' + Date.now() + path.extname(file.originalname));
  }
});
const docStorage = multer.diskStorage({
  destination: path.join(__dirname, 'public/uploads/documents'),
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
app.locals.uploadPhoto = multer({ storage: photoStorage, limits: { fileSize: 5 * 1024 * 1024 } });
app.locals.uploadDoc = multer({ storage: docStorage, limits: { fileSize: 50 * 1024 * 1024 } });

// Make db available in routes
app.use((req, res, next) => {
  req.db = db;
  next();
});

// Routes
const authRoutes = require('./routes/auth');
const frontpageRoutes = require('./routes/frontpage');
const citizensRoutes = require('./routes/citizens');
const weeklyPlansRoutes = require('./routes/weekly-plans');
const plansRoutes = require('./routes/plans');
const diaryRoutes = require('./routes/diary');
const formsRoutes = require('./routes/forms');
const calendarRoutes = require('./routes/calendar');
const documentsRoutes = require('./routes/documents');
const organizationRoutes = require('./routes/organization');
const statisticsRoutes = require('./routes/statistics');
const yearWheelsRoutes = require('./routes/year-wheels');

app.use('/', authRoutes);
app.use('/', requireAuth, frontpageRoutes);
app.use('/citizens', requireAuth, citizensRoutes);
app.use('/weekly-plans', requireAuth, weeklyPlansRoutes);
app.use('/plans', requireAuth, plansRoutes);
app.use('/diary', requireAuth, diaryRoutes);
app.use('/forms', requireAuth, formsRoutes);
app.use('/calendar', requireAuth, calendarRoutes);
app.use('/documents', requireAuth, documentsRoutes);
app.use('/organization', requireAuth, organizationRoutes);
app.use('/statistics', requireAuth, statisticsRoutes);
app.use('/year-wheels', requireAuth, yearWheelsRoutes);

// 404
app.use((req, res) => {
  res.status(404).render('error', { title: 'Page Not Found', message: 'The page you are looking for does not exist.', user: res.locals.user || null });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('error', { title: 'Server Error', message: 'Something went wrong.', user: res.locals.user || null });
});

app.listen(PORT, () => {
  console.log(`Momentum Journal running on http://localhost:${PORT}`);
});

module.exports = app;
