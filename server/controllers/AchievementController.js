const { AchievementMongo, UserAchievementMongo } = require('../models-mongo');

class AchievementController {
    static async getAll(req, res) {
        try {
            const userId = (req.params.id && req.params.id !== 'me') ? req.params.id : req.user.id;
            const allAchievements = await AchievementMongo.find();
            const userAchievements = await UserAchievementMongo.find({ userId });
            const unlockedIds = new Set(userAchievements.map(ua => ua.achievementId.toString()));

            const achievementsWithStatus = allAchievements.map(ach => ({
                id: ach._id,
                name: ach.name,
                displayName: ach.displayName,
                description: ach.description,
                icon: ach.icon,
                unlocked: unlockedIds.has(ach._id.toString())
            }));

            res.json(achievementsWithStatus);
        } catch (error) {
            res.status(500).json({ message: 'Server error' });
        }
    }
}

module.exports = AchievementController;
