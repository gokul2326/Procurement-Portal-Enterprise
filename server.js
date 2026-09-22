const express = require('express');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const flash = require('connect-flash');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
require('dotenv').config();

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(session({
  secret: process.env.SESSION_SECRET || 'tender_session_key',
  resave: false,
  saveUninitialized: false
}));
app.use(flash());

app.use(async (req, res, next) => {
  res.locals.success = req.flash('success');
  res.locals.error = req.flash('error');
  res.locals.info = req.flash('info');
  res.locals.currentUser = null;

  const token = req.cookies.token;
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'tender_jwt_secret');
      const user = await User.findById(decoded.id).select('-password');
      if (user) {
        req.user = user;
        res.locals.currentUser = user;
      }
    } catch (e) {
      res.clearCookie('token');
    }
  }
  next();
});

// Mount Routes
app.use('/', require('./routes/publicRoutes'));
app.use('/', require('./routes/authRoutes'));
app.use('/', require('./routes/tenderRoutes'));

// Seed Super Admin Government Official
async function seedDefaultOfficial() {
  try {
    const officialExists = await User.findOne({ email: 'admin@gov.in' });
    if (!officialExists) {
      const hashedPassword = await bcrypt.hash('Admin@123', 10);
      await User.create({
        name: 'Chief Procurement Director',
        email: 'admin@gov.in',
        password: hashedPassword,
        role: 'official',
        isApproved: true,
        companyDetails: {
          companyName: 'Ministry of Infrastructure & Public Works',
          registrationNumber: 'GOV-IN-001'
        }
      });
      console.log('Default Official seeded: admin@gov.in / Admin@123');
    }
  } catch (err) {
    console.error('Seeding error:', err);
  }
}

const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/procurement_portal';

mongoose.connect(MONGO_URI)
  .then(async () => {
    console.log('MongoDB connected successfully');
    await seedDefaultOfficial();
    app.listen(PORT, () => console.log(`Enterprise Portal running on http://localhost:${PORT}`));
  })
  .catch(err => console.error('MongoDB connection error:', err));
