const mongoose = require('mongoose');

const donationSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  quantity: { type: Number, required: true },
  expiryDate: { type: Date },
  pickupAddress: { type: String },
  contactInfo: { type: String },
  donor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  claimedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status: { type: String, enum: ['available', 'claimed', 'completed'], default: 'available' },
}, { timestamps: true });

module.exports = mongoose.model('Donation', donationSchema);
