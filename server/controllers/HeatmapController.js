const { CompletionMongo, HabitMongo } = require('../models-mongo');

class HeatmapController {
    /**
     * GET /api/heatmap/:userId?
     * Returns daily completion counts for the last 365 days.
     * Response: [{ date: "2026-01-15", count: 3 }, ...]
     */
    static async getHeatmapData(req, res) {
        try {
            const userId = req.params.userId || req.user.id;

            // Calculate date range: last 365 days
            const endDate = new Date();
            endDate.setHours(23, 59, 59, 999);
            const startDate = new Date();
            startDate.setFullYear(startDate.getFullYear() - 1);
            startDate.setHours(0, 0, 0, 0);

            // Get all habits for the user to filter completions
            const habits = await HabitMongo.find({ userId }).select('_id');
            const habitIds = habits.map(h => h._id);

            if (habitIds.length === 0) {
                return res.json([]);
            }

            // Aggregate completions by date
            const completions = await CompletionMongo.aggregate([
                {
                    $match: {
                        HabitId: { $in: habitIds },
                        date: { $gte: startDate, $lte: endDate }
                    }
                },
                {
                    $group: {
                        _id: {
                            $dateToString: { format: '%Y-%m-%d', date: '$date' }
                        },
                        count: { $sum: 1 }
                    }
                },
                {
                    $project: {
                        _id: 0,
                        date: '$_id',
                        count: 1
                    }
                },
                {
                    $sort: { date: 1 }
                }
            ]);

            res.json(completions);
        } catch (error) {
            console.error('Error in HeatmapController.getHeatmapData:', error);
            res.status(500).json({ msg: 'Failed to fetch heatmap data.' });
        }
    }
}

module.exports = HeatmapController;
