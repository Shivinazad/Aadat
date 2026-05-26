const PostService = require('../services/PostService');
const UserService = require('../services/UserService');
const { HabitMongo, LikeMongo, NotificationMongo, UserMongo, CommentMongo } = require('../models-mongo');
const { emitDataChanged, emitUserDataChanged } = require('../realtime/socketEvents');
const GeminiService = require('../services/GeminiService');

class PostController {
    static async getRecent(req, res) {
        try {
            const limit = parseInt(req.query.limit) || 5;
            const currentUserId = req.user ? req.user.id : null;
            const posts = await PostService.getRecentPosts(limit, currentUserId);
            res.status(200).json(posts);
        } catch (error) {
            console.error('Error in getRecent:', error);
            res.status(500).json({ msg: 'Server error fetching recent posts.' });
        }
    }

    static async getStats(req, res) {
        try {
            const stats = await PostService.getCommunityStats();
            res.status(200).json(stats);
        } catch (error) {
            console.error('Error in getStats:', error);
            res.status(500).json({ msg: 'Server error fetching community stats.' });
        }
    }

    static async getFeed(req, res) {
        try {
            const currentUserId = req.user.id;
            const posts = await PostService.getFeedPosts(currentUserId);
            res.status(200).json(posts);
        } catch (error) {
            console.error('Error in getFeed:', error);
            res.status(500).json({ msg: 'Server error fetching feed posts.' });
        }
    }

    static async getUserPosts(req, res) {
        try {
            const userId = req.params.userId;
            const currentUserId = req.user.id;
            const posts = await PostService.getUserPosts(userId, currentUserId);
            res.status(200).json(posts);
        } catch (error) {
            console.error('Error in getUserPosts:', error);
            res.status(500).json({ msg: 'Server error fetching user posts.' });
        }
    }

    static async create(req, res) {
        try {
            const { habitId } = req.body;
            const content = req.body.content || req.body.caption || '';
            const userId = req.user.id;

            if (!habitId) {
                return res.status(400).json({ msg: 'Habit ID is required.' });
            }

            if (!content.trim()) {
                return res.status(400).json({ msg: 'Content is required.' });
            }

            // AI Content Moderation Check
            const moderation = await GeminiService.moderateContent(content);
            if (moderation.isAbusive) {
                const user = await UserMongo.findById(userId);
                if (user) {
                    user.warnings = (user.warnings || 0) + 1;
                    if (user.warnings >= 3) {
                        user.isSuspended = true;
                        await user.save();
                        return res.status(403).json({ 
                            msg: 'Your account has been suspended due to multiple policy violations.' 
                        });
                    } else {
                        await user.save();
                        return res.status(400).json({ 
                            msg: `Post blocked by AI Moderator: abusive content detected (${moderation.reason}). Warning: You have ${user.warnings} warning(s). Your account will be suspended on 3 warnings.` 
                        });
                    }
                }
            }

            // Extract optional uploaded media
            let mediaUrl = null;
            let mediaType = null;
            if (req.file && req.file.path) {
                mediaUrl = req.file.path;
                const isVideo = req.file.mimetype ? req.file.mimetype.startsWith('video') : false;
                mediaType = isVideo ? 'video' : 'image';
            }

            const newPost = await PostService.createPost(userId, habitId, content, mediaUrl, mediaType);

            // Habit streak logic
            let currentStreak = 0;
            const habit = await HabitMongo.findById(habitId);
            if (habit) {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const lastCheckin = habit.lastCheckinDate ? new Date(habit.lastCheckinDate) : null;
                
                if (lastCheckin) lastCheckin.setHours(0, 0, 0, 0);

                if (!lastCheckin || today > lastCheckin) {
                    const yesterday = new Date(today);
                    yesterday.setDate(yesterday.getDate() - 1);
                    
                    if (lastCheckin && lastCheckin.getTime() === yesterday.getTime()) {
                        habit.currentStreak += 1;
                    } else {
                        habit.currentStreak = 1;
                    }
                    
                    if (habit.currentStreak > habit.longestStreak) {
                        habit.longestStreak = habit.currentStreak;
                    }
                    habit.lastCheckinDate = today;
                    await habit.save();
                }
                currentStreak = habit.currentStreak;
            }

            // Award XP
            await UserService.awardXP(userId, 10);

            // Check achievements
            const AchievementService = require('../services/AchievementService');
            await AchievementService.checkAndUnlock(userId);

            // Realtime events
            emitDataChanged({
                scope: 'posts',
                action: 'created',
                postId: newPost._id,
                habitId,
                userId
            });
            emitUserDataChanged(userId, {
                scope: 'dashboard',
                action: 'checkin-created',
                habitId
            });

            res.status(201).json({ 
                message: 'Post created and habit updated!', 
                post: newPost,
                currentStreak 
            });
        } catch (error) {
            console.error('Error in createPost:', error);
            res.status(500).json({ msg: 'Server error creating post.' });
        }
    }

    static async like(req, res) {
        try {
            const postId = req.params.id;
            const likerUserId = req.user.id;

            const existingLike = await LikeMongo.findOne({ userId: likerUserId, postId });
            if (existingLike) {
                return res.status(409).json({ msg: 'Already liked.' });
            }

            const post = await PostService.getPostById(postId);
            if (!post) {
                return res.status(404).json({ msg: 'Post not found.' });
            }

            await LikeMongo.create({ userId: likerUserId, postId });
            
            // Award XP to author
            await UserService.awardXP(post.userId, 5);

            // Check achievements for both liker and author
            const AchievementService = require('../services/AchievementService');
            await AchievementService.checkAndUnlock(likerUserId);
            await AchievementService.checkAndUnlock(post.userId);

            // Notifications
            if (likerUserId.toString() !== post.userId.toString()) {
                await NotificationMongo.create({
                    userId: post.userId,
                    senderId: likerUserId,
                    type: 'like',
                    message: 'liked your post',
                    postId,
                    read: false
                });
            }

            emitDataChanged({
                scope: 'likes',
                action: 'created',
                postId,
                userId: likerUserId,
                targetUserId: post.userId
            });

            res.status(200).json({ message: 'Post liked!' });
        } catch (error) {
            console.error('Error in likePost:', error);
            res.status(500).json({ msg: 'Server error liking post.' });
        }
    }

    // Comment Controller Methods
    static async createComment(req, res) {
        try {
            const postId = req.params.id;
            const { content } = req.body;
            const userId = req.user.id;

            if (!content || !content.trim()) {
                return res.status(400).json({ msg: 'Comment content is required.' });
            }

            const post = await PostService.getPostById(postId);
            if (!post) {
                return res.status(404).json({ msg: 'Post not found.' });
            }

            // AI Content Moderation Check for Comment
            const moderation = await GeminiService.moderateContent(content);
            if (moderation.isAbusive) {
                const user = await UserMongo.findById(userId);
                if (user) {
                    user.warnings = (user.warnings || 0) + 1;
                    if (user.warnings >= 3) {
                        user.isSuspended = true;
                        await user.save();
                        return res.status(403).json({ 
                            msg: 'Your account has been suspended due to multiple policy violations.' 
                        });
                    } else {
                        await user.save();
                        return res.status(400).json({ 
                            msg: `Comment blocked by AI Moderator: abusive content detected (${moderation.reason}). Warning: You have ${user.warnings} warning(s). Your account will be suspended on 3 warnings.` 
                        });
                    }
                }
            }

            const newComment = await CommentMongo.create({
                content,
                postId,
                userId
            });

            // Send notification to post author
            if (userId.toString() !== post.userId.toString()) {
                await NotificationMongo.create({
                    userId: post.userId,
                    senderId: userId,
                    type: 'comment',
                    message: 'commented on your post',
                    postId,
                    read: false
                });
            }

            // Realtime event
            emitDataChanged({
                scope: 'posts',
                action: 'comment_created',
                postId,
                userId
            });

            const populatedComment = await CommentMongo.findById(newComment._id)
                .populate('userId', 'id username avatar');

            res.status(201).json(populatedComment);
        } catch (error) {
            console.error('Error in createComment:', error);
            res.status(500).json({ msg: 'Server error creating comment.' });
        }
    }

    static async getComments(req, res) {
        try {
            const postId = req.params.id;
            const comments = await CommentMongo.find({ postId })
                .sort({ createdAt: 1 })
                .populate('userId', 'id username avatar');
            res.status(200).json(comments);
        } catch (error) {
            console.error('Error in getComments:', error);
            res.status(500).json({ msg: 'Server error fetching comments.' });
        }
    }
}

module.exports = PostController;
