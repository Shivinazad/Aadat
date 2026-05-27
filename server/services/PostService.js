const { PostMongo, HabitMongo, UserMongo, LikeMongo, CommentMongo } = require('../models-mongo');

class PostService {
    static async enrichPostDetails(post, currentUserId) {
        const postObj = post.toObject();
        postObj.likeCount = await LikeMongo.countDocuments({ postId: post._id });
        postObj.isLikedByCurrentUser = currentUserId 
            ? await LikeMongo.exists({ postId: post._id, userId: currentUserId }).then(exists => !!exists)
            : false;

        // Fetch comments and populate author avatar/username
        postObj.comments = await CommentMongo.find({ postId: post._id })
            .sort({ createdAt: 1 })
            .populate('userId', 'id username avatar');
        postObj.commentCount = postObj.comments.length;

        return postObj;
    }

    static async getRecentPosts(limit, currentUserId) {
        const posts = await PostMongo.find()
            .sort({ createdAt: -1 })
            .limit(limit)
            .populate('userId', 'id username')
            .populate('habitId', 'id habitTitle habitCategory');

        return await Promise.all(posts.map(post => this.enrichPostDetails(post, currentUserId)));
    }

    static async getFeedPosts(currentUserId, category) {
        let query = {};
        
        if (category && category.toLowerCase() !== 'all') {
            const catLower = category.toLowerCase();
            if (catLower === 'general') {
                query.habitId = null;
            } else {
                const codingRegex = /code|coding|dev|develop|program|tech|dsa|programming|software|web|python|javascript|java\b|rust|c\+\+|html|css/i;
                const learningRegex = /study|studying|learn|learning|read|reading|book|education|french|course|class|math|science|history|exam|prepare/i;
                const runningRegex = /run|running|cardio|walk|walking|jog|jogging|marathon/i;
                const gymRegex = /gym|workout|lift|weights|exercise|fitness|bodybuilding|strength/i;
                const healthRegex = /health|meditat|yoga|sleep|mental|mind|wellness|nutrition|diet|water|hydrate/i;

                let habitQuery = {};

                if (catLower === 'coding') {
                    habitQuery = {
                        $or: [
                            { habitCategory: { $regex: codingRegex } },
                            { habitTitle: { $regex: codingRegex } }
                        ]
                    };
                } else if (catLower === 'learning' || catLower === 'studying') {
                    habitQuery = {
                        $and: [
                            {
                                $or: [
                                    { habitCategory: { $regex: learningRegex } },
                                    { habitTitle: { $regex: learningRegex } }
                                ]
                            },
                            { habitCategory: { $not: codingRegex } },
                            { habitTitle: { $not: codingRegex } }
                        ]
                    };
                } else if (catLower === 'running') {
                    habitQuery = {
                        $or: [
                            { habitCategory: { $regex: runningRegex } },
                            { habitTitle: { $regex: runningRegex } }
                        ]
                    };
                } else if (catLower === 'gym') {
                    habitQuery = {
                        $or: [
                            { habitCategory: { $regex: gymRegex } },
                            { habitTitle: { $regex: gymRegex } }
                        ]
                    };
                } else if (catLower === 'health') {
                    habitQuery = {
                        $or: [
                            { habitCategory: { $regex: healthRegex } },
                            { habitTitle: { $regex: healthRegex } }
                        ]
                    };
                } else {
                    // Fallback to searching the category string on either field
                    habitQuery = {
                        $or: [
                            { habitCategory: { $regex: new RegExp(category, 'i') } },
                            { habitTitle: { $regex: new RegExp(category, 'i') } }
                        ]
                    };
                }

                const matchingHabits = await HabitMongo.find(habitQuery).select('_id');
                const habitIds = matchingHabits.map(h => h._id);
                query.habitId = { $in: habitIds };
            }
        }

        const posts = await PostMongo.find(query)
            .sort({ createdAt: -1 })
            .populate('userId', 'id username avatar')
            .populate('habitId', 'id habitTitle habitCategory');

        return await Promise.all(posts.map(post => this.enrichPostDetails(post, currentUserId)));
    }

    static async getUserPosts(userId, currentUserId) {
        const posts = await PostMongo.find({ userId })
            .sort({ createdAt: -1 })
            .populate('userId', 'id username avatar')
            .populate('habitId', 'id habitTitle habitCategory');

        return await Promise.all(posts.map(post => this.enrichPostDetails(post, currentUserId)));
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

    static async createPost(userId, habitId, content, mediaUrl, mediaType) {
        return await PostMongo.create({
            userId,
            habitId,
            content,
            mediaUrl,
            mediaType
        });
    }

    static async getPostById(postId) {
        return await PostMongo.findById(postId);
    }
}

module.exports = PostService;
