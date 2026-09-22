const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { verifyToken } = require('../middleware/auth');

router.get('/login', (req, res) => {
  if (req.user) {
    return req.user.role === 'official' ? res.redirect('/govt/dashboard') : res.redirect('/bidder/dashboard');
  }
  res.render('login');
});

router.get('/register', (req, res) => res.render('register'));

router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, companyName, registrationNumber, category, previousWorks } = req.body;
    const existing = await User.findOne({ email });
    if (existing) {
      req.flash('error', 'An account with this email address already exists.');
      return res.redirect('/register');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      role: role || 'bidder',
      companyDetails: {
        companyName: companyName || '',
        registrationNumber: registrationNumber || '',
        category: category || '',
        previousWorks: previousWorks || ''
      },
      isApproved: false // Strict government authorization workflow
    });

    await newUser.save();
    req.flash('info', 'Registration submitted successfully! Your account will be activated once verified by a Government Official.');
    res.redirect('/login');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Registration failed. Please check your submission.');
    res.redirect('/register');
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      req.flash('error', 'Invalid email or password credentials.');
      return res.redirect('/login');
    }

    if (!user.isApproved) {
      req.flash('error', 'Account is pending approval by a Government Official.');
      return res.redirect('/login');
    }

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET || 'tender_jwt_secret', { expiresIn: '3d' });
    res.cookie('token', token, { httpOnly: true });

    if (user.role === 'official') return res.redirect('/govt/dashboard');
    return res.redirect('/bidder/dashboard');
  } catch (err) {
    console.error(err);
    req.flash('error', 'Authentication error.');
    res.redirect('/login');
  }
});

router.get('/settings', verifyToken, (req, res) => {
  res.render('settings', { user: req.user });
});

router.post('/settings/profile', verifyToken, async (req, res) => {
  try {
    const { profilePic, preferredLanguage, companyName, registrationNumber, previousWorks } = req.body;
    const user = await User.findById(req.user._id);
    if (profilePic) user.profilePic = profilePic;
    if (preferredLanguage) user.preferredLanguage = preferredLanguage;
    if (user.role === 'bidder') {
      user.companyDetails.companyName = companyName || user.companyDetails.companyName;
      user.companyDetails.registrationNumber = registrationNumber || user.companyDetails.registrationNumber;
      user.companyDetails.previousWorks = previousWorks || user.companyDetails.previousWorks;
    }
    await user.save();
    req.flash('success', 'Profile and account details updated.');
    res.redirect('/settings');
  } catch (err) {
    req.flash('error', 'Failed to update profile.');
    res.redirect('/settings');
  }
});

router.post('/settings/password', verifyToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);

    if (!(await bcrypt.compare(currentPassword, user.password))) {
      req.flash('error', 'Current password is not correct.');
      return res.redirect('/settings');
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
    req.flash('success', 'Password changed successfully.');
    res.redirect('/settings');
  } catch (err) {
    req.flash('error', 'Failed to change password.');
    res.redirect('/settings');
  }
});

router.get('/logout', (req, res) => {
  res.clearCookie('token');
  req.flash('info', 'Logged out successfully.');
  res.redirect('/login');
});

module.exports = router;
