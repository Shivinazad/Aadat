const { HabitMongo } = require('../models-mongo');

class HabitService {
    static async getAllByUserId(userId) {
        return await HabitMongo.find({ userId }).populate('battleId');
    }

    static async getById(habitId) {
        return await HabitMongo.findById(habitId);
    }

    static async create(habitData) {
        return await HabitMongo.create(habitData);
    }

    static async update(habitId, updateData) {
        return await HabitMongo.findByIdAndUpdate(habitId, updateData, { new: true });
    }

    static async delete(habitId) {
        return await HabitMongo.findByIdAndDelete(habitId);
    }
}

module.exports = HabitService;
