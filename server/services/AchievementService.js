const { AchievementMongo, UserAchievementMongo, PostMongo, HabitMongo, LikeMongo, UserMongo, NotificationMongo } = require('../models-mongo');
const { emitUserDataChanged } = require('../realtime/socketEvents');

class AchievementService {
    /**
     * Checks all locked achievements for a user and unlocks any that meet the requirements.
     * @param {string} userId - The user ID to evaluate.
     */
    static async checkAndUnlock(userId) {
        try {
            if (!userId) return;

            // Get all achievements in the database
            const allAchievements = await AchievementMongo.find();
            
            // Get achievements already unlocked by this user
            const userAchievements = await UserAchievementMongo.find({ userId });
            const unlockedIds = new Set(userAchievements.map(ua => ua.achievementId.toString()));
            const unlockedNames = new Set();
            
            for (const ua of userAchievements) {
                const ach = allAchievements.find(a => a._id.toString() === ua.achievementId.toString());
                if (ach) {
                    unlockedNames.add(ach.name);
                }
            }
            
            // Fetch stats from DB
            const user = await UserMongo.findById(userId);
            if (!user) return;
            
            const habits = await HabitMongo.find({ userId });
            const posts = await PostMongo.find({ userId });
            const likesCount = await LikeMongo.countDocuments({ userId });
            
            const maxStreak = habits.reduce((max, h) => Math.max(max, h.longestStreak || 0), 0);
            const userLevel = user.user_level || 1;
            
            const achievementsToUnlock = [];
            
            const checkCondition = (name) => {
                // If already unlocked, skip it
                if (unlockedNames.has(name)) return false;
                
                switch (name) {
                    case 'first_post':
                        return posts.length >= 1;
                    case 'streak_3_day':
                        return maxStreak >= 3;
                    case 'streak_7_day':
                        return maxStreak >= 7;
                    case 'streak_30_day':
                        return maxStreak >= 30;
                    case 'streak_100_day':
                        return maxStreak >= 100;
                    case 'level_5':
                        return userLevel >= 5;
                    case 'level_10':
                        return userLevel >= 10;
                    case 'community_joiner':
                        return true; // Unlocked automatically for any registered user
                    case 'first_like':
                        return likesCount >= 1;
                    case 'habit_creator':
                        return habits.length >= 1;
                    case 'five_habits':
                        return habits.length >= 5;
                    case 'early_bird':
                        // Check if any post check-in occurred before 8 AM local time (hour < 8)
                        return posts.some(p => new Date(p.createdAt).getHours() < 8);
                    default:
                        return false;
                }
            };
            
            for (const ach of allAchievements) {
                if (checkCondition(ach.name) && !unlockedIds.has(ach._id.toString())) {
                    achievementsToUnlock.push(ach);
                }
            }
            
            if (achievementsToUnlock.length > 0) {
                for (const ach of achievementsToUnlock) {
                    try {
                        // Create the UserAchievement mapping
                        await UserAchievementMongo.create({
                            userId,
                            achievementId: ach._id
                        });
                        
                        // Create notification for the user
                        await NotificationMongo.create({
                            userId,
                            senderId: null,
                            type: 'achievement',
                            message: `unlocked the "${ach.displayName || ach.name}" achievement!`,
                            read: false
                        });
                        
                        console.log(`[AchievementService] Unlocked "${ach.displayName || ach.name}" for user ID ${userId}`);
                    } catch (dbErr) {
                        // Suppress duplicate key errors
                        if (dbErr.code !== 11000) {
                            console.error(`[AchievementService] Failed to save achievement ${ach.name}:`, dbErr);
                        }
                    }
                }
                
                // Emit socket event to trigger real-time updates on the profile page
                emitUserDataChanged(userId, {
                    scope: 'achievements',
                    action: 'unlocked',
                    userId: userId.toString()
                });
                
                // Also trigger notification list update
                emitUserDataChanged(userId, {
                    scope: 'notifications',
                    action: 'created',
                    userId: userId.toString()
                });
            }
        } catch (error) {
            console.error('[AchievementService] Error in checkAndUnlock:', error);
        }
    }
}

module.exports = AchievementService;
