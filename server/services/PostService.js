const { PostMongo, HabitMongo, UserMongo } = require('../models-mongo');

class PostService {
    static async getRecentPosts(limit) {
        return await PostMongo.find()
            .sort({ createdAt: -1 })
            .limit(limit)
            .populate('userId', 'id username')
            .populate('habitId', 'id habitTitle');
    }

    static async getFeedPosts() {
        return await PostMongo.find()
            .sort({ createdAt: -1 })
            .populate('userId', 'id username avatar')
            .populate('habitId', 'id habitTitle');
    }

    static async getUserPosts(userId) {
        return await PostMongo.find({ userId })
            .sort({ createdAt: -1 })
            .populate('userId', 'id username avatar')
            .populate('habitId', 'id habitTitle');
    }

    static async getCommunityStats() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const activeMembers = await HabitMongo.distinct('userId').then((ids) => ids.length);
        const postsToday = await PostMongo.countDocuments({ createdAt: { $gte: today } });
        const usersCheckedInToday = await PostMongo.distinct('userId', { createdAt: { $gte: today } }).then((ids) => ids.length);
        const completionRate = activeMembers > 0
            ? Math.round((usersCheckedInToday / activeMembers) * 100)
            : 0;

        return { activeMembers, postsToday, completionRate };
    }

    static async createPost(userId, habitId, caption, mediaUrl) {
        return await PostMongo.create({
            userId,
            habitId,
            caption,
            mediaUrl
        });
    }

    static async getPostById(postId) {
        return await PostMongo.findById(postId);
    }
}

module.exports = PostService;
