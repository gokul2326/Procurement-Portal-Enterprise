const express = require('express');
const router = express.Router();
const Tender = require('../models/Tender');

router.get('/', async (req, res) => {
  try {
    const { state, district, taluk, village } = req.query;
    let query = { status: { $in: ['assigned', 'in-progress', 'completed'] } };

    if (state && state.trim()) query['location.state'] = new RegExp(state.trim(), 'i');
    if (district && district.trim()) query['location.district'] = new RegExp(district.trim(), 'i');
    if (taluk && taluk.trim()) query['location.taluk'] = new RegExp(taluk.trim(), 'i');
    if (village && village.trim()) query['location.village'] = new RegExp(village.trim(), 'i');

    const runningTenders = await Tender.find(query).populate('assignedBidder').sort({ createdAt: -1 });

    const metrics = {
      activeProjects: await Tender.countDocuments({ status: { $in: ['assigned', 'in-progress'] } }),
      completedProjects: await Tender.countDocuments({ status: 'completed' }),
      totalCapital: (await Tender.aggregate([{ $group: { _id: null, total: { $sum: '$budget' } } }]))[0]?.total || 0
    };

    res.render('public-dashboard', { runningTenders, filters: req.query, metrics });
  } catch (err) {
    console.error(err);
    res.render('public-dashboard', { runningTenders: [], filters: req.query, metrics: { activeProjects: 0, completedProjects: 0, totalCapital: 0 } });
  }
});

router.get('/manual', (req, res) => res.render('manual'));

module.exports = router;
