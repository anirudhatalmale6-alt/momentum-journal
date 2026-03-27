const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');

router.get('/login', (req, res) => {
  res.render('auth/login', { error: null, user: null });
});

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  const user = req.db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.render('auth/login', { error: 'Invalid username or password', user: null });
  }
  req.session.userId = user.id;
  req.session.username = user.username;
  req.session.fullName = user.full_name;
  req.session.role = user.role;
  res.redirect('/');
});

router.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
});

module.exports = router;
