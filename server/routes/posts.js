const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const PostController = require('../controllers/PostController');
const { uploadPostMedia } = require('../config/cloudinary');

// Public routes
router.get('/recent', PostController.getRecent);

// Protected routes
router.get('/stats/community', auth, PostController.getStats);
router.get('/feed', auth, PostController.getFeed);
router.get('/user/:userId', auth, PostController.getUserPosts);
router.post('/', auth, uploadPostMedia.single('media'), PostController.create);
router.post('/:id/like', auth, PostController.like);
router.get('/', auth, PostController.getFeed);

// Comments routes
router.post('/:id/comments', auth, PostController.createComment);
router.get('/:id/comments', auth, PostController.getComments);

module.exports = router;
