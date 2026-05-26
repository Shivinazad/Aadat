const mongoose = require('mongoose');

const participantDataSchema = new mongoose.Schema({
  checkins: {
    type: [Date],
    default: []
  },
  currentStreak: {
    type: Number,
    default: 0
  },
  longestStreak: {
    type: Number,
    default: 0
  },
  consistency: {
    type: Number,
    default: 0
  }
}, { _id: false });

const battleSchema = new mongoose.Schema({
  challengerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserMongo',
    required: true
  },
  opponentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserMongo',
    required: true
  },
  habitName: {
    type: String,
    required: true,
    trim: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'active', 'completed', 'rejected'],
    default: 'pending'
  },
  winner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserMongo',
    default: null
  },
  challengerData: {
    type: participantDataSchema,
    default: () => ({})
  },
  opponentData: {
    type: participantDataSchema,
    default: () => ({})
  },
  xpAwarded: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

battleSchema.index({ challengerId: 1, status: 1 });
battleSchema.index({ opponentId: 1, status: 1 });
battleSchema.index({ endDate: 1, status: 1 });
battleSchema.index({ challengerId: 1, habitName: 1, status: 1 });
battleSchema.index({ opponentId: 1, habitName: 1, status: 1 });

module.exports = mongoose.model('BattleMongo', battleSchema);
