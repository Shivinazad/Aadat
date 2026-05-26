const mongoose = require('mongoose');

const habitSchema = new mongoose.Schema({
  habitTitle: {
    type: String,
    required: true,
    trim: true
  },
  habitCategory: {
    type: String,
    default: null
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  currentStreak: {
    type: Number,
    default: 0
  },
  longestStreak: {
    type: Number,
    default: 0
  },
  lastCheckinDate: {
    type: Date,
    default: null
  },
  description: {
    type: String,
    default: null
  },
  aiDescription: {
    type: String,
    default: null
  },
  roadmap: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  roadmapProgress: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  targetPercentage: {
    type: Number,
    default: 70
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserMongo',
    required: true
  }
}, {
  timestamps: true
});

habitSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('HabitMongo', habitSchema);
