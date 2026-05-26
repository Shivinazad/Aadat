const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  content: {
    type: String,
    required: true,
    trim: true
  },
  postId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PostMongo',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserMongo',
    required: true
  }
}, {
  timestamps: true
});

commentSchema.index({ postId: 1, createdAt: 1 });

module.exports = mongoose.model('CommentMongo', commentSchema);
