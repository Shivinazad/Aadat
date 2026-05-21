const { PostMongo, HabitMongo, UserMongo, LikeMongo } = require('../models-mongo');

class PostService {
    static async getRecentPosts(limit, currentUserId) {
        const posts = await PostMongo.find()
            .sort({ createdAt: -1 })
            .limit(limit)
            .populate('userId', 'id username')
            .populate('habitId', 'id habitTitle');

        return await Promise.all(posts.map(async (post) => {
            const postObj = post.toObject();
            postObj.likeCount = await LikeMongo.countDocuments({ postId: post._id });
            postObj.isLikedByCurrentUser = currentUserId 
                ? await LikeMongo.exists({ postId: post._id, userId: currentUserId }).then(exists => !!exists)
                : false;
            return postObj;
        }));
    }

    static async getFeedPosts(currentUserId) {
        const posts = await PostMongo.find()
            .sort({ createdAt: -1 })
            .populate('userId', 'id username avatar')
            .populate('habitId', 'id habitTitle');

        return await Promise.all(posts.map(async (post) => {
            const postObj = post.toObject();
            postObj.likeCount = await LikeMongo.countDocuments({ postId: post._id });
            postObj.isLikedByCurrentUser = currentUserId 
                ? await LikeMongo.exists({ postId: post._id, userId: currentUserId }).then(exists => !!exists)
                : false;
            return postObj;
        }));
    }

    static async getUserPosts(userId, currentUserId) {
        const posts = await PostMongo.find({ userId })
            .sort({ createdAt: -1 })
            .populate('userId', 'id username avatar')
            .populate('habitId', 'id habitTitle');

        return await Promise.all(posts.map(async (post) => {
            const postObj = post.toObject();
            postObj.likeCount = await LikeMongo.countDocuments({ postId: post._id });
            postObj.isLikedByCurrentUser = currentUserId 
                ? await LikeMongo.exists({ postId: post._id, userId: currentUserId }).then(exists => !!exists)
                : false;
            return postObj;
        }));
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
