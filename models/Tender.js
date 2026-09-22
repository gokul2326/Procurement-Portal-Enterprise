const mongoose = require('mongoose');

const tenderSchema = new mongoose.Schema({
  tenderId: { type: String, unique: true, required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  category: { type: String, required: true }, // Infrastructure, Water, Energy, IT, Transport
  type: { type: String, required: true },     // Open, Limited, Global, Expression of Interest
  budget: { type: Number, required: true },
  location: {
    state: { type: String, required: true },
    district: { type: String, required: true },
    taluk: { type: String, required: true },
    village: { type: String, default: '' }
  },
  status: { 
    type: String, 
    enum: ['new', 'assigned', 'in-progress', 'completed', 'cancelled'], 
    default: 'new' 
  },
  assignedBidder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  bids: [{
    bidderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    bidderName: String,
    bidderEmail: String,
    companyName: String,
    bidAmount: Number,
    proposalNote: String,
    status: { type: String, enum: ['submitted', 'accepted', 'rejected'], default: 'submitted' },
    submittedAt: { type: Date, default: Date.now }
  }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  completedAt: { type: Date }
});

module.exports = mongoose.model('Tender', tenderSchema);
