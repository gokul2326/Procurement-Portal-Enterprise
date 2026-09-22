const express = require('express');
const router = express.Router();
const Tender = require('../models/Tender');
const User = require('../models/User');
const PDFDocument = require('pdfkit');
const { verifyToken, checkRole } = require('../middleware/auth');

// ==========================================
// GOVERNMENT OFFICIAL DASHBOARD & MANAGEMENT
// ==========================================
router.get('/govt/dashboard', verifyToken, checkRole(['official']), async (req, res) => {
  try {
    const pendingUsers = await User.find({ isApproved: false });
    const approvedBidders = await User.find({ role: 'bidder', isApproved: true });
    
    // Status Filter for Government Tenders
    const filterStatus = req.query.status || 'all';
    let query = {};
    if (filterStatus !== 'all') {
      query.status = filterStatus;
    }

    const tenders = await Tender.find(query).populate('assignedBidder').sort({ createdAt: -1 });

    // Aggregate statistics
    const stats = {
      totalTenders: await Tender.countDocuments(),
      newTenders: await Tender.countDocuments({ status: 'new' }),
      assignedTenders: await Tender.countDocuments({ status: 'assigned' }),
      inProgressTenders: await Tender.countDocuments({ status: 'in-progress' }),
      completedTenders: await Tender.countDocuments({ status: 'completed' }),
      pendingApprovals: pendingUsers.length
    };

    res.render('govt-dashboard', { 
      pendingUsers, 
      approvedBidders, 
      tenders, 
      stats, 
      currentFilter: filterStatus 
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error loading Government Control Console');
  }
});

router.post('/govt/approve-user/:id', verifyToken, checkRole(['official']), async (req, res) => {
  await User.findByIdAndUpdate(req.params.id, { isApproved: true });
  req.flash('success', 'User account approved and authorized for tender operations.');
  res.redirect('/govt/dashboard');
});

router.post('/govt/reject-user/:id', verifyToken, checkRole(['official']), async (req, res) => {
  await User.findByIdAndDelete(req.params.id);
  req.flash('info', 'User registration rejected and removed.');
  res.redirect('/govt/dashboard');
});

router.post('/govt/tenders/add', verifyToken, checkRole(['official']), async (req, res) => {
  try {
    const { title, description, category, type, budget, state, district, taluk, village } = req.body;
    const tenderId = 'TND-' + Math.floor(100000 + Math.random() * 900000);

    await Tender.create({
      tenderId,
      title,
      description,
      category,
      type,
      budget: Number(budget),
      location: { state, district, taluk, village },
      createdBy: req.user._id,
      status: 'new'
    });

    req.flash('success', `Tender ${tenderId} published successfully.`);
    res.redirect('/govt/dashboard');
  } catch (err) {
    req.flash('error', 'Failed to publish tender.');
    res.redirect('/govt/dashboard');
  }
});

router.post('/govt/tenders/:id/status', verifyToken, checkRole(['official']), async (req, res) => {
  try {
    const { status } = req.body;
    const updateData = { status };
    if (status === 'completed') {
      updateData.completedAt = new Date();
    }
    await Tender.findByIdAndUpdate(req.params.id, updateData);
    req.flash('success', `Tender status updated to ${status.toUpperCase()}.`);
    res.redirect('/govt/dashboard');
  } catch (err) {
    req.flash('error', 'Failed to update tender work status.');
    res.redirect('/govt/dashboard');
  }
});

router.post('/govt/tenders/:id/assign', verifyToken, checkRole(['official']), async (req, res) => {
  try {
    const { bidderId } = req.body;
    const tender = await Tender.findById(req.params.id);

    // Mark winner in bids subdocument
    tender.assignedBidder = bidderId;
    tender.status = 'assigned';
    tender.bids.forEach(b => {
      if (b.bidderId.toString() === bidderId.toString()) {
        b.status = 'accepted';
      } else {
        b.status = 'rejected';
      }
    });

    await tender.save();
    req.flash('success', 'Contract awarded and assigned successfully.');
    res.redirect('/govt/dashboard');
  } catch (err) {
    req.flash('error', 'Failed to award contract.');
    res.redirect('/govt/dashboard');
  }
});

router.post('/govt/tenders/:id/delete', verifyToken, checkRole(['official']), async (req, res) => {
  await Tender.findByIdAndDelete(req.params.id);
  req.flash('success', 'Tender deleted permanently.');
  res.redirect('/govt/dashboard');
});

// ==========================================
// BIDDER DASHBOARD & COMPLETE BIDDING HISTORY
// ==========================================
router.get('/bidder/dashboard', verifyToken, checkRole(['bidder']), async (req, res) => {
  try {
    const { state, category, type, search } = req.query;
    let query = { status: { $in: ['new', 'active'] } };

    if (state) query['location.state'] = new RegExp(state.trim(), 'i');
    if (category) query.category = category;
    if (type) query.type = type;
    if (search) {
      query.$or = [
        { title: new RegExp(search.trim(), 'i') },
        { description: new RegExp(search.trim(), 'i') },
        { tenderId: new RegExp(search.trim(), 'i') }
      ];
    }

    const availableTenders = await Tender.find(query).sort({ createdAt: -1 });

    // Find ALL tenders where this bidder submitted a bid (Bid History)
    const bidHistoryTenders = await Tender.find({ 'bids.bidderId': req.user._id }).populate('assignedBidder').sort({ 'bids.submittedAt': -1 });

    // Filter won / awarded contracts
    const wonTenders = await Tender.find({ assignedBidder: req.user._id }).sort({ createdAt: -1 });

    // Bidder Analytics
    const bidderStats = {
      bidsSubmitted: bidHistoryTenders.length,
      contractsWon: wonTenders.length,
      winRate: bidHistoryTenders.length > 0 ? Math.round((wonTenders.length / bidHistoryTenders.length) * 100) : 0,
      totalValueWon: wonTenders.reduce((acc, curr) => acc + curr.budget, 0)
    };

    res.render('bidder-dashboard', {
      user: req.user,
      availableTenders,
      bidHistoryTenders,
      wonTenders,
      bidderStats,
      filters: req.query
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error loading Bidder Portal');
  }
});

router.post('/bidder/tenders/:id/bid', verifyToken, checkRole(['bidder']), async (req, res) => {
  try {
    const { bidAmount, proposalNote } = req.body;
    const tender = await Tender.findById(req.params.id);

    if (!tender || (tender.status !== 'new' && tender.status !== 'active')) {
      req.flash('error', 'This tender is closed for bidding.');
      return res.redirect('/bidder/dashboard');
    }

    const existing = tender.bids.find(b => b.bidderId.toString() === req.user._id.toString());
    if (existing) {
      req.flash('error', 'You have already submitted a bid for this tender reference.');
      return res.redirect('/bidder/dashboard');
    }

    tender.bids.push({
      bidderId: req.user._id,
      bidderName: req.user.name,
      bidderEmail: req.user.email,
      companyName: req.user.companyDetails.companyName || req.user.name,
      bidAmount: Number(bidAmount),
      proposalNote: proposalNote || '',
      status: 'submitted',
      submittedAt: new Date()
    });

    await tender.save();
    req.flash('success', 'Your bid has been submitted and registered in the audit trail.');
    res.redirect('/bidder/dashboard');
  } catch (err) {
    req.flash('error', 'Failed to submit bid.');
    res.redirect('/bidder/dashboard');
  }
});

// PDF Contract Download
router.get('/tenders/:id/contract-download', verifyToken, async (req, res) => {
  try {
    const tender = await Tender.findById(req.params.id).populate('assignedBidder');
    if (!tender || !['assigned', 'in-progress', 'completed'].includes(tender.status)) {
      return res.status(404).send('Contract document is not available for this tender.');
    }

    const isWinner = tender.assignedBidder && tender.assignedBidder._id.toString() === req.user._id.toString();
    const isGovt = req.user.role === 'official';
    if (!isWinner && !isGovt) {
      return res.status(403).send('Unauthorized to access this contract agreement.');
    }

    const doc = new PDFDocument({ margin: 50 });
    res.setHeader('Content-disposition', `attachment; filename="Contract_${tender.tenderId}.pdf"`);
    res.setHeader('Content-type', 'application/pdf');

    doc.rect(20, 20, 572, 752).stroke('#0f172a');
    doc.fillColor('#1e3a8a').fontSize(20).text('OFFICIAL E-PROCUREMENT CONTRACT AGREEMENT', { align: 'center', bold: true });
    doc.moveDown(0.5);
    doc.fontSize(10).fillColor('#64748b').text('Government of India • National Infrastructure Transparency Portal', { align: 'center' });
    doc.moveDown(1.5);

    doc.fillColor('#0f172a').fontSize(13).text('TENDER & STATUTORY PARTICULARS', { underline: true });
    doc.moveDown(0.6);
    doc.fontSize(10).fillColor('#334155');
    doc.text(`Tender Reference ID: ${tender.tenderId}`);
    doc.text(`Project Title: ${tender.title}`);
    doc.text(`Category / Type: ${tender.category} | ${tender.type}`);
    doc.text(`Approved Sanction Budget: INR ${tender.budget.toLocaleString('en-IN')}`);
    doc.text(`Execution Location: ${tender.location.village ? tender.location.village + ', ' : ''}${tender.location.taluk}, ${tender.location.district}, ${tender.location.state}`);
    doc.text(`Project Execution Status: ${tender.status.toUpperCase()}`);
    doc.moveDown(1);

    doc.fillColor('#0f172a').fontSize(13).text('AWARDED CONTRACTOR DETAILS', { underline: true });
    doc.moveDown(0.6);
    doc.fontSize(10).fillColor('#334155');
    doc.text(`Authorized Contractor: ${tender.assignedBidder.name}`);
    doc.text(`Enterprise Entity: ${tender.assignedBidder.companyDetails.companyName || 'N/A'}`);
    doc.text(`Registration / GST No: ${tender.assignedBidder.companyDetails.registrationNumber || 'N/A'}`);
    doc.text(`Email Address: ${tender.assignedBidder.email}`);
    doc.moveDown(1);

    doc.fillColor('#0f172a').fontSize(11).text('SCOPE OF WORK & LEGAL MANDATE:');
    doc.fontSize(9).fillColor('#475569').text(tender.description, { align: 'justify' });
    doc.moveDown(2);

    doc.fontSize(10).fillColor('#166534').text('DIGITALLY CERTIFIED & RATIFIED BY CHIEF PROCUREMENT AUTHORITY', { bold: true });
    doc.fillColor('#64748b').fontSize(8).text(`Timestamp of Generation: ${new Date().toUTCString()}`);

    doc.end();
    doc.pipe(res);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error generating contract document.');
  }
});

module.exports = router;
