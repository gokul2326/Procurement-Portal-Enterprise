const jwt = require('jsonwebtoken');
const User = require('../models/User');

const verifyToken = async (req, res, next) => {
  const token = req.cookies.token;
  if (!token) {
    req.flash('error', 'Please log in to continue.');
    return res.redirect('/login');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'tender_jwt_secret');
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      res.clearCookie('token');
      req.flash('error', 'Session user not found. Please log in.');
      return res.redirect('/login');
    }
    req.user = user;
    res.locals.currentUser = user;
    next();
  } catch (err) {
    res.clearCookie('token');
    req.flash('error', 'Session expired. Please log in.');
    return res.redirect('/login');
  }
};

const checkRole = (roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      req.flash('error', 'Access restricted to authorized personnel.');
      return res.redirect('/');
    }
    next();
  };
};

module.exports = { verifyToken, checkRole };
