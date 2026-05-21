const HabitService = require('../services/HabitService');
const GeminiService = require('../services/GeminiService');

class HabitController {
    static async getAll(req, res) {
        try {
            const habits = await HabitService.getAllByUserId(req.user.id);
            res.json(habits);
        } catch (error) {
            res.status(500).json({ message: 'Server error' });
        }
    }

    static async create(req, res) {
        try {
            const { habitTitle, habitCategory, description, generateRoadmap } = req.body;
            let aiDescription = null;
            let roadmap = null;

            if (generateRoadmap && description) {
                try {
                    const aiResult = await GeminiService.generateRoadmap(habitTitle, description);
                    aiDescription = aiResult.aiDescription;
                    roadmap = aiResult.roadmap;
                } catch (aiError) {
                    console.error('AI roadmap generation failed during creation:', aiError);
                }
            }

            const habit = await HabitService.create({
                habitTitle,
                habitCategory,
                description,
                aiDescription,
                roadmap,
                userId: req.user.id
            });
            res.status(201).json(habit);
        } catch (error) {
            console.error('Error in HabitController.create:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }

    static async update(req, res) {
        try {
            const habit = await HabitService.update(req.params.id, req.body);
            if (!habit) return res.status(404).json({ message: 'Habit not found' });
            res.json(habit);
        } catch (error) {
            res.status(500).json({ message: 'Server error' });
        }
    }

    static async delete(req, res) {
        try {
            const habit = await HabitService.delete(req.params.id);
            if (!habit) return res.status(404).json({ message: 'Habit not found' });
            res.json({ message: 'Habit deleted' });
        } catch (error) {
            res.status(500).json({ message: 'Server error' });
        }
    }

    static async generateRoadmap(req, res) {
        try {
            const { habitTitle, description } = req.body;
            if (!habitTitle || !description) {
                return res.status(400).json({ msg: 'habitTitle and description are required.' });
            }
            const aiResult = await GeminiService.generateRoadmap(habitTitle, description);
            res.status(200).json(aiResult);
        } catch (error) {
            console.error('Error generating AI roadmap:', error);
            res.status(500).json({ msg: 'Failed to generate AI roadmap.' });
        }
    }

    static async exportCSV(req, res) {
        try {
            const habits = await HabitService.getAllByUserId(req.user.id);
            let csvContent = 'Habit Title,Category,Current Streak,Longest Streak,Last Check-in Date,Created At\n';
            for (const habit of habits) {
                const title = `"${habit.habitTitle.replace(/"/g, '""')}"`;
                const category = habit.habitCategory ? `"${habit.habitCategory.replace(/"/g, '""')}"` : '';
                const lastCheckin = habit.lastCheckinDate ? habit.lastCheckinDate.toISOString().split('T')[0] : '';
                const createdAt = habit.createdAt ? habit.createdAt.toISOString().split('T')[0] : '';
                csvContent += `${title},${category},${habit.currentStreak},${habit.longestStreak},${lastCheckin},${createdAt}\n`;
            }
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename=aadat_habits.csv');
            res.status(200).send(csvContent);
        } catch (error) {
            console.error('Error exporting CSV:', error);
            res.status(500).json({ message: 'Server error exporting habits.' });
        }
    }
}

module.exports = HabitController;
