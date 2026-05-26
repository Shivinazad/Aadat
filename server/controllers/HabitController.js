const HabitService = require('../services/HabitService');
const GeminiService = require('../services/GeminiService');

class HabitController {
    static async getAll(req, res) {
        try {
            const habits = await HabitService.getAllByUserId(req.user.id);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            
            let updatedAny = false;
            const processedHabits = [];
            
            for (const habit of habits) {
                // If habit is linked to a battle, only show it if the battle is active
                if (habit.battleId && habit.battleId.status !== 'active') {
                    continue; // Skip pending, rejected, completed, etc.
                }

                if (habit.lastCheckinDate) {
                    const lastCheckin = new Date(habit.lastCheckinDate);
                    lastCheckin.setHours(0, 0, 0, 0);
                    
                    // If last checkin is older than yesterday, active streak is broken
                    if (lastCheckin < yesterday && habit.currentStreak > 0) {
                        habit.currentStreak = 0;
                        await habit.save();
                        updatedAny = true;
                    }
                }
                processedHabits.push(habit);
            }
            
            if (updatedAny) {
                const AchievementService = require('../services/AchievementService');
                await AchievementService.checkAndUnlock(req.user.id);
            }
            
            res.json(processedHabits);
        } catch (error) {
            console.error('Error in HabitController.getAll:', error);
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

            // Check achievements
            const AchievementService = require('../services/AchievementService');
            await AchievementService.checkAndUnlock(req.user.id);

            res.status(201).json(habit);
        } catch (error) {
            console.error('Error in HabitController.create:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }

    static async update(req, res) {
        try {
            const habitId = req.params.id;
            const oldHabit = await HabitService.getById(habitId);
            if (!oldHabit) return res.status(404).json({ message: 'Habit not found' });

            const updatedHabit = await HabitService.update(habitId, req.body);
            
            // If roadmapProgress was updated, evaluate checkpoint completions
            if (req.body.roadmapProgress && oldHabit.roadmap) {
                const oldProgress = oldHabit.roadmapProgress || { completed: [], current: 0 };
                const newProgress = req.body.roadmapProgress;
                
                const oldCompleted = oldProgress.completed || [];
                const newCompleted = newProgress.completed || [];
                
                const newlyCompleted = newCompleted.filter(c => !oldCompleted.includes(c));
                
                if (newlyCompleted.length > 0) {
                    const UserService = require('../services/UserService');
                    const AchievementService = require('../services/AchievementService');
                    
                    let xpEarned = 0;
                    for (const cp of newlyCompleted) {
                        xpEarned += 20; // +20 XP per checkpoint
                    }
                    
                    const totalCheckpoints = oldHabit.roadmap.length || 0;
                    const isEntirelyCompleted = totalCheckpoints > 0 && newCompleted.length === totalCheckpoints && oldCompleted.length < totalCheckpoints;
                    
                    if (isEntirelyCompleted) {
                        xpEarned += 100; // +100 XP bonus for completing the roadmap
                    }
                    
                    if (xpEarned > 0) {
                        await UserService.awardXP(oldHabit.userId, xpEarned);
                        await AchievementService.checkAndUnlock(oldHabit.userId);
                    }
                }
            }

            res.json(updatedHabit);
        } catch (error) {
            console.error('Error in HabitController.update:', error);
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
