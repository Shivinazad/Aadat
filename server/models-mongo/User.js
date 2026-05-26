const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  },
  password: {
    type: String,
    required: true
  },
  user_level: {
    type: Number,
    default: 1
  },
  user_xp: {
    type: Number,
    default: 0
  },
  communities: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  avatar: {
    type: String,
    default: '👤'
  },
  bio: {
    type: String,
    maxlength: 150,
    default: 'Building habits in public.'
  },
  warnings: {
    type: Number,
    default: 0
  },
  isSuspended: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

userSchema.index({ username: 1 }, { unique: true });
userSchema.index({ email: 1 }, { unique: true });

module.exports = mongoose.model('UserMongo', userSchema);
