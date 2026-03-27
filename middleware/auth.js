function requireAuth(req, res, next) {
  if (req.session && req.session.userId) {
    res.locals.user = {
      id: req.session.userId,
      username: req.session.username,
      fullName: req.session.fullName,
      role: req.session.role
    };
    return next();
  }
  res.redirect((process.env.BASE_PATH || '/journal') + '/login');
}

function requireAdmin(req, res, next) {
  if (req.session && req.session.role === 'admin') {
    return next();
  }
  res.status(403).send('Access denied');
}

module.exports = { requireAuth, requireAdmin };
