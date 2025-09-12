const mongoose = require('mongoose');

const logSchema = new mongoose.Schema({
  monitorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Monitor',
    required: true
  },
  statusCode: Number,
  status: {
    type: String,
    enum: ['up', 'down']
  },
  responseTime: Number, // in ms
  checkedAt: {
    type: Date,
    default: Date.now
  },
  error: String // Optional error info like timeout, DNS failure etc.
});

module.exports = mongoose.model('Log', logSchema);
