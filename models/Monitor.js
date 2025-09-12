const mongoose = require('mongoose');

const monitorSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  url: { type: String, required: true },
  name: String,
  checkInterval: { type: Number, default: 5 }, // in minutes
  isActive: { type: Boolean, default: true },
  lastChecked: Date,
  createdAt: { type: Date, default: Date.now }
});

// Prevent duplicate URLs per user
monitorSchema.index({ userId: 1, url: 1 }, { unique: true });

module.exports = mongoose.model('Monitor', monitorSchema);
