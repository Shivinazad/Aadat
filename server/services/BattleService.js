const { BattleMongo, UserMongo, NotificationMongo, HabitMongo } = require('../models-mongo');
const UserService = require('./UserService');
const { emitUserDataChanged } = require('../realtime/socketEvents');

const MIN_BATTLE_DAYS = 3;
const MAX_BATTLE_DAYS = 30;
const WINNER_XP = 50;
const LOSER_XP = 15;

class BattleService {
    /**
     * Creates a new battle challenge.
     */
    static async createBattle(challengerId, opponentId, habitName, startDate, endDate) {
        if (challengerId.toString() === opponentId.toString()) {
            throw new Error('You cannot challenge yourself.');
        }

        // Validate opponent exists
        const opponent = await UserMongo.findById(opponentId);
        if (!opponent) {
            throw new Error('Opponent not found.');
        }

        // Validate date range
        const start = new Date(startDate);
        const end = new Date(endDate);
        start.setHours(0, 0, 0, 0);
        end.setHours(0, 0, 0, 0);

        if (start >= end) {
            throw new Error('End date must be after start date.');
        }

        const durationDays = Math.round((end - start) / (1000 * 60 * 60 * 24));
        if (durationDays < MIN_BATTLE_DAYS) {
            throw new Error(`Battle must be at least ${MIN_BATTLE_DAYS} days.`);
        }
        if (durationDays > MAX_BATTLE_DAYS) {
            throw new Error(`Battle cannot exceed ${MAX_BATTLE_DAYS} days.`);
        }

        // Check one-active-battle-per-habit-per-user constraint
        const existingBattle = await BattleMongo.findOne({
            $or: [
                { challengerId, habitName, status: { $in: ['pending', 'active'] } },
                { opponentId: challengerId, habitName, status: { $in: ['pending', 'active'] } }
            ]
        });
        if (existingBattle) {
            throw new Error('You already have an active or pending battle for this habit.');
        }

        const battle = await BattleMongo.create({
            challengerId,
            opponentId,
            habitName,
            startDate: start,
            endDate: end,
            status: 'pending'
        });

        // Notify opponent
        const challenger = await UserMongo.findById(challengerId).select('username');
        await NotificationMongo.create({
            userId: opponentId,
            senderId: challengerId,
            type: 'battle_challenge',
            message: `challenged you to a "${habitName}" battle!`,
            read: false
        });

        emitUserDataChanged(opponentId, {
            scope: 'notifications',
            action: 'created',
            userId: opponentId.toString()
        });
        emitUserDataChanged(opponentId, {
            scope: 'battles',
            action: 'challenge_received',
            userId: opponentId.toString()
        });

        return battle;
    }

    /**
     * Accepts a pending battle challenge.
     */
    static async acceptBattle(battleId, userId) {
        const battle = await BattleMongo.findById(battleId);
        if (!battle) throw new Error('Battle not found.');
        if (battle.status !== 'pending') throw new Error('Battle is no longer pending.');
        if (battle.opponentId.toString() !== userId.toString()) {
            throw new Error('Only the challenged user can accept.');
        }

        // Check one-active-battle-per-habit constraint for opponent too
        const existingActive = await BattleMongo.findOne({
            _id: { $ne: battleId },
            $or: [
                { challengerId: userId, habitName: battle.habitName, status: 'active' },
                { opponentId: userId, habitName: battle.habitName, status: 'active' }
            ]
        });
        if (existingActive) {
            throw new Error('You already have an active battle for this habit.');
        }

        battle.status = 'active';
        await battle.save();

        // Create temporary habits for both users on their dashboards
        try {
            const challengerUser = await UserMongo.findById(battle.challengerId).select('username');
            const opponentUser = await UserMongo.findById(battle.opponentId).select('username');

            // Challenger habit
            await HabitMongo.create({
                habitTitle: `⚔️ Battle: ${battle.habitName}`,
                habitCategory: 'Battle',
                description: `Active battle against ${opponentUser ? opponentUser.username : 'Opponent'}!`,
                userId: battle.challengerId,
                startDate: battle.startDate,
                battleId: battle._id
            });

            // Opponent habit
            await HabitMongo.create({
                habitTitle: `⚔️ Battle: ${battle.habitName}`,
                habitCategory: 'Battle',
                description: `Active battle against ${challengerUser ? challengerUser.username : 'Challenger'}!`,
                userId: battle.opponentId,
                startDate: battle.startDate,
                battleId: battle._id
            });
        } catch (habitErr) {
            console.error('Failed to create temporary battle habits (non-blocking):', habitErr);
        }

        // Notify challenger
        const opponent = await UserMongo.findById(userId).select('username');
        await NotificationMongo.create({
            userId: battle.challengerId,
            senderId: userId,
            type: 'battle_accepted',
            message: `accepted your "${battle.habitName}" battle challenge!`,
            read: false
        });

        emitUserDataChanged(battle.challengerId, {
            scope: 'battles',
            action: 'accepted',
            userId: battle.challengerId.toString()
        });
        emitUserDataChanged(battle.challengerId, {
            scope: 'notifications',
            action: 'created',
            userId: battle.challengerId.toString()
        });

        return battle;
    }

    /**
     * Rejects a pending battle challenge.
     */
    static async rejectBattle(battleId, userId) {
        const battle = await BattleMongo.findById(battleId);
        if (!battle) throw new Error('Battle not found.');
        if (battle.status !== 'pending') throw new Error('Battle is no longer pending.');
        if (battle.opponentId.toString() !== userId.toString()) {
            throw new Error('Only the challenged user can reject.');
        }

        battle.status = 'rejected';
        await battle.save();

        // Notify challenger
        await NotificationMongo.create({
            userId: battle.challengerId,
            senderId: userId,
            type: 'battle_rejected',
            message: `declined your "${battle.habitName}" battle challenge.`,
            read: false
        });

        emitUserDataChanged(battle.challengerId, {
            scope: 'battles',
            action: 'rejected',
            userId: battle.challengerId.toString()
        });
        emitUserDataChanged(battle.challengerId, {
            scope: 'notifications',
            action: 'created',
            userId: battle.challengerId.toString()
        });

        return battle;
    }

    static async recordCheckin(userId, habitName, battleId = null) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let query = {
            status: 'active',
            startDate: { $lte: today },
            endDate: { $gte: today }
        };

        if (battleId) {
            query._id = battleId;
        } else {
            query.$or = [
                { challengerId: userId },
                { opponentId: userId }
            ];
        }

        // Find active battles matching the query
        const activeBattles = await BattleMongo.find(query);

        // Filter battles matching the habit name case-insensitively if not querying by exact battleId
        const matchingBattles = battleId 
            ? activeBattles 
            : activeBattles.filter(b => 
                b.habitName && habitName && b.habitName.trim().toLowerCase() === habitName.trim().toLowerCase()
            );

        for (const battle of matchingBattles) {
            const isChallenger = battle.challengerId.toString() === userId.toString();
            const data = isChallenger ? battle.challengerData : battle.opponentData;

            // Check if already checked in today
            const alreadyCheckedIn = data.checkins.some(d => {
                const checkinDate = new Date(d);
                checkinDate.setHours(0, 0, 0, 0);
                return checkinDate.getTime() === today.getTime();
            });

            if (alreadyCheckedIn) continue;

            // Record check-in
            data.checkins.push(today);

            // Recalculate streak
            const sortedCheckins = [...data.checkins].sort((a, b) => new Date(a) - new Date(b));
            let currentStreak = 1;
            let longestStreak = 1;

            for (let i = sortedCheckins.length - 1; i > 0; i--) {
                const curr = new Date(sortedCheckins[i]);
                const prev = new Date(sortedCheckins[i - 1]);
                curr.setHours(0, 0, 0, 0);
                prev.setHours(0, 0, 0, 0);

                const diffDays = Math.round((curr - prev) / (1000 * 60 * 60 * 24));
                if (diffDays === 1) {
                    currentStreak++;
                } else {
                    break;
                }
            }

            // Calculate longest streak from all checkins
            let tempStreak = 1;
            for (let i = 1; i < sortedCheckins.length; i++) {
                const curr = new Date(sortedCheckins[i]);
                const prev = new Date(sortedCheckins[i - 1]);
                curr.setHours(0, 0, 0, 0);
                prev.setHours(0, 0, 0, 0);

                const diffDays = Math.round((curr - prev) / (1000 * 60 * 60 * 24));
                if (diffDays === 1) {
                    tempStreak++;
                } else {
                    tempStreak = 1;
                }
                longestStreak = Math.max(longestStreak, tempStreak);
            }
            longestStreak = Math.max(longestStreak, currentStreak);

            // Calculate consistency
            const totalDays = Math.round((battle.endDate - battle.startDate) / (1000 * 60 * 60 * 24));
            const consistency = totalDays > 0 ? Math.round((data.checkins.length / totalDays) * 100) : 0;

            data.currentStreak = currentStreak;
            data.longestStreak = longestStreak;
            data.consistency = Math.min(consistency, 100);

            // Mark subdocument as modified so Mongoose persists changes
            battle.markModified(isChallenger ? 'challengerData' : 'opponentData');
            await battle.save();

            // Notify the opponent about the streak update
            const otherUserId = isChallenger ? battle.opponentId : battle.challengerId;
            emitUserDataChanged(otherUserId, {
                scope: 'battles',
                action: 'checkin',
                battleId: battle._id.toString(),
                userId: userId.toString()
            });
            emitUserDataChanged(userId, {
                scope: 'battles',
                action: 'checkin',
                battleId: battle._id.toString(),
                userId: userId.toString()
            });
        }
    }

    /**
     * Completes a battle and determines the winner.
     * Winner logic: Highest streak → Consistency % → Earliest last check-in.
     */
    static async completeBattle(battle) {
        if (battle.status !== 'active') return battle;

        const cd = battle.challengerData;
        const od = battle.opponentData;

        let winnerId = null;

        // Primary: Highest longestStreak
        if (cd.longestStreak > od.longestStreak) {
            winnerId = battle.challengerId;
        } else if (od.longestStreak > cd.longestStreak) {
            winnerId = battle.opponentId;
        } else {
            // Tiebreaker 1: Consistency %
            if (cd.consistency > od.consistency) {
                winnerId = battle.challengerId;
            } else if (od.consistency > cd.consistency) {
                winnerId = battle.opponentId;
            } else {
                // Tiebreaker 2: Earliest last check-in timestamp
                const cLastCheckin = cd.checkins.length > 0 ? new Date(cd.checkins[cd.checkins.length - 1]) : new Date(8640000000000000);
                const oLastCheckin = od.checkins.length > 0 ? new Date(od.checkins[od.checkins.length - 1]) : new Date(8640000000000000);

                if (cLastCheckin <= oLastCheckin) {
                    winnerId = battle.challengerId;
                } else {
                    winnerId = battle.opponentId;
                }
            }
        }

        // Handle case where neither participant checked in
        if (cd.checkins.length === 0 && od.checkins.length === 0) {
            winnerId = null; // Draw — no winner
        }

        battle.status = 'completed';
        battle.winner = winnerId;

        // Award XP (only once)
        if (!battle.xpAwarded) {
            if (winnerId) {
                const loserId = winnerId.toString() === battle.challengerId.toString()
                    ? battle.opponentId
                    : battle.challengerId;
                
                await UserService.awardXP(winnerId, WINNER_XP);
                await UserService.awardXP(loserId, LOSER_XP);
            } else {
                // Draw — both get loser XP
                await UserService.awardXP(battle.challengerId, LOSER_XP);
                await UserService.awardXP(battle.opponentId, LOSER_XP);
            }
            battle.xpAwarded = true;
        }

        await battle.save();

        // Notifications
        const winnerUser = winnerId ? await UserMongo.findById(winnerId).select('username') : null;

        for (const uid of [battle.challengerId, battle.opponentId]) {
            const isWinner = winnerId && uid.toString() === winnerId.toString();
            let message;
            if (!winnerId) {
                message = `Your "${battle.habitName}" battle ended in a draw!`;
            } else if (isWinner) {
                message = `You won the "${battle.habitName}" battle! 🏆 (+${WINNER_XP} XP)`;
            } else {
                message = `You lost the "${battle.habitName}" battle to ${winnerUser?.username || 'your opponent'}. (+${LOSER_XP} XP)`;
            }

            await NotificationMongo.create({
                userId: uid,
                senderId: null,
                type: 'battle_completed',
                message,
                read: false
            });

            emitUserDataChanged(uid, {
                scope: 'battles',
                action: 'completed',
                battleId: battle._id.toString()
            });
            emitUserDataChanged(uid, {
                scope: 'notifications',
                action: 'created',
                userId: uid.toString()
            });
        }

        // Check achievements for both participants
        const AchievementService = require('./AchievementService');
        await AchievementService.checkAndUnlock(battle.challengerId);
        await AchievementService.checkAndUnlock(battle.opponentId);

        return battle;
    }

    /**
     * Finds and auto-completes all expired active battles.
     */
    static async checkExpiredBattles() {
        const now = new Date();
        now.setHours(0, 0, 0, 0);

        const expiredBattles = await BattleMongo.find({
            status: 'active',
            endDate: { $lt: now }
        });

        let completed = 0;
        for (const battle of expiredBattles) {
            try {
                await BattleService.completeBattle(battle);
                completed++;
            } catch (err) {
                console.error(`[BattleService] Failed to complete battle ${battle._id}:`, err);
            }
        }

        if (completed > 0) {
            console.log(`[BattleService] Auto-completed ${completed} expired battle(s).`);
        }
    }

    /**
     * Gets all battles for a user, optionally filtered by status.
     */
    static async getUserBattles(userId, status) {
        const query = {
            $or: [
                { challengerId: userId },
                { opponentId: userId }
            ]
        };
        if (status) {
            query.status = status;
        }

        return await BattleMongo.find(query)
            .sort({ updatedAt: -1 })
            .populate('challengerId', 'username avatar user_level')
            .populate('opponentId', 'username avatar user_level')
            .populate('winner', 'username avatar');
    }

    /**
     * Gets a single battle by ID with populated user info.
     */
    static async getBattleById(battleId) {
        return await BattleMongo.findById(battleId)
            .populate('challengerId', 'username avatar user_level user_xp')
            .populate('opponentId', 'username avatar user_level user_xp')
            .populate('winner', 'username avatar');
    }

    /**
     * Gets the battle leaderboard — users with most wins.
     */
    static async getLeaderboard(limit = 10) {
        const leaderboard = await BattleMongo.aggregate([
            { $match: { status: 'completed', winner: { $ne: null } } },
            { $group: { _id: '$winner', wins: { $sum: 1 } } },
            { $sort: { wins: -1 } },
            { $limit: limit },
            {
                $lookup: {
                    from: 'usermongos',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'user'
                }
            },
            { $unwind: '$user' },
            {
                $project: {
                    _id: '$user._id',
                    username: '$user.username',
                    avatar: '$user.avatar',
                    user_level: '$user.user_level',
                    wins: 1
                }
            }
        ]);

        return leaderboard;
    }
}

module.exports = BattleService;
