const PostService = require('../services/PostService');
const UserService = require('../services/UserService');
const { HabitMongo, LikeMongo, NotificationMongo, AchievementMongo, UserAchievementMongo } = require('../models-mongo');
const { emitDataChanged, emitUserDataChanged } = require('../realtime/socketEvents');

class PostController {
    static async getRecent(req, res) {
        try {
            const limit = parseInt(req.query.limit) || 5;
            const posts = await PostService.getRecentPosts(limit);
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
            const posts = await PostService.getFeedPosts();
            res.status(200).json(posts);
        } catch (error) {
            console.error('Error in getFeed:', error);
            res.status(500).json({ msg: 'Server error fetching feed posts.' });
        }
    }

    static async getUserPosts(req, res) {
        try {
            const userId = req.params.userId;
            const posts = await PostService.getUserPosts(userId);
            res.status(200).json(posts);
        } catch (error) {
            console.error('Error in getUserPosts:', error);
            res.status(500).json({ msg: 'Server error fetching user posts.' });
        }
    }

    static async create(req, res) {
        try {
            const { habitId, caption, mediaUrl } = req.body;
            const userId = req.user.id;

            if (!habitId) {
                return res.status(400).json({ msg: 'Habit ID is required.' });
            }

            const newPost = await PostService.createPost(userId, habitId, caption, mediaUrl);

            // Habit logic
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
}

module.exports = PostController;
