const BattleService = require('../services/BattleService');

class BattleController {
    static async create(req, res) {
        try {
            const { opponentId, habitName, startDate, endDate } = req.body;
            const challengerId = req.user.id;

            if (!opponentId || !habitName) {
                return res.status(400).json({ msg: 'opponentId and habitName are required.' });
            }

            const battle = await BattleService.createBattle(
                challengerId, opponentId, habitName,
                startDate || new Date(),
                endDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Default 7 days
            );

            res.status(201).json(battle);
        } catch (error) {
            console.error('Error in BattleController.create:', error);
            const status = error.message.includes('not found') ? 404 : 400;
            res.status(status).json({ msg: error.message || 'Failed to create battle.' });
        }
    }

    static async accept(req, res) {
        try {
            const battle = await BattleService.acceptBattle(req.params.id, req.user.id);
            res.json(battle);
        } catch (error) {
            console.error('Error in BattleController.accept:', error);
            const status = error.message.includes('not found') ? 404 : 400;
            res.status(status).json({ msg: error.message || 'Failed to accept battle.' });
        }
    }

    static async reject(req, res) {
        try {
            const battle = await BattleService.rejectBattle(req.params.id, req.user.id);
            res.json(battle);
        } catch (error) {
            console.error('Error in BattleController.reject:', error);
            const status = error.message.includes('not found') ? 404 : 400;
            res.status(status).json({ msg: error.message || 'Failed to reject battle.' });
        }
    }

    static async getMyBattles(req, res) {
        try {
            const { status } = req.query;
            const battles = await BattleService.getUserBattles(req.user.id, status);
            res.json(battles);
        } catch (error) {
            console.error('Error in BattleController.getMyBattles:', error);
            res.status(500).json({ msg: 'Failed to fetch battles.' });
        }
    }

    static async getById(req, res) {
        try {
            const battle = await BattleService.getBattleById(req.params.id);
            if (!battle) {
                return res.status(404).json({ msg: 'Battle not found.' });
            }
            res.json(battle);
        } catch (error) {
            console.error('Error in BattleController.getById:', error);
            res.status(500).json({ msg: 'Failed to fetch battle.' });
        }
    }

    static async checkin(req, res) {
        try {
            const battle = await BattleService.getBattleById(req.params.id);
            if (!battle) {
                return res.status(404).json({ msg: 'Battle not found.' });
            }
            if (battle.status !== 'active') {
                return res.status(400).json({ msg: 'Battle is not active.' });
            }

            const userId = req.user.id;
            const isParticipant =
                battle.challengerId._id.toString() === userId ||
                battle.opponentId._id.toString() === userId;

            if (!isParticipant) {
                return res.status(403).json({ msg: 'You are not a participant in this battle.' });
            }

            await BattleService.recordCheckin(userId, battle.habitName);
            
            // Re-fetch the updated battle
            const updated = await BattleService.getBattleById(req.params.id);
            res.json(updated);
        } catch (error) {
            console.error('Error in BattleController.checkin:', error);
            res.status(500).json({ msg: 'Failed to check in.' });
        }
    }

    static async getLeaderboard(req, res) {
        try {
            const leaderboard = await BattleService.getLeaderboard();
            res.json(leaderboard);
        } catch (error) {
            console.error('Error in BattleController.getLeaderboard:', error);
            res.status(500).json({ msg: 'Failed to fetch battle leaderboard.' });
        }
    }
}

module.exports = BattleController;
