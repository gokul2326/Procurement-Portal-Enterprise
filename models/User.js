const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { 
    type: String, 
    enum: ['official', 'bidder'], 
    default: 'bidder' 
  },
  companyDetails: {
    companyName: { type: String, default: '' },
    registrationNumber: { type: String, default: '' },
    category: { type: String, default: '' },
    previousWorks: { type: String, default: '' }
  },
  isApproved: { 
    type: Boolean, 
    default: false 
  },
  profilePic: { type: String, default: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150' },
  preferredLanguage: { type: String, default: 'en' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);
