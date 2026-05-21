const bcrypt = require('bcrypt');
const AuthService = require('../services/AuthService');
const UserService = require('../services/UserService');
const { sendOTPEmail } = require('../emailService');
const { UserMongo, HabitMongo, CompletionMongo } = require('../models-mongo');

const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
};

class AuthController {
    static async sendOTP(req, res) {
        try {
            const { username, email, password } = req.body;
            if (!username || !email || !password) return res.status(400).json({ message: 'Missing fields' });
            const existingUser = await AuthService.getUserByEmail(email);
            if (existingUser) return res.status(409).json({ message: 'Email in use' });
            const existingUsername = await AuthService.getUserByUsername(username);
            if (existingUsername) return res.status(409).json({ message: 'Username taken' });
            const otp = Math.floor(100000 + Math.random() * 900000).toString();
            const hashedPassword = await bcrypt.hash(password, 10);
            await AuthService.createOTP(email, otp, username, hashedPassword);
            res.status(200).json({ message: 'OTP sent', email });
            sendOTPEmail(email, otp, username).catch(err => console.error('OTP error:', err));
        } catch (error) {
            res.status(500).json({ message: 'Server error' });
        }
    }

    static async verifyOTP(req, res) {
        try {
            const { email, otp } = req.body;
            const otpRecord = await AuthService.verifyOTP(email, otp);
            if (!otpRecord || new Date() > otpRecord.expiresAt) return res.status(400).json({ message: 'Invalid OTP' });
            const user = await AuthService.createUser({ username: otpRecord.username, email: otpRecord.email, password: otpRecord.password });
            otpRecord.verified = true;
            await otpRecord.save();
            const token = AuthService.generateToken(user);
            res.cookie('token', token, cookieOptions);
            res.status(201).json({ token, user: { id: user._id, username: user.username } });
        } catch (error) {
            res.status(500).json({ message: 'Server error' });
        }
    }

    static async login(req, res) {
        try {
            const { email, password } = req.body;
            const user = await AuthService.getUserByEmail(email);
            if (!user || !(await bcrypt.compare(password, user.password))) return res.status(401).json({ message: 'Invalid credentials' });
            const token = AuthService.generateToken(user);
            res.cookie('token', token, cookieOptions);
            res.status(200).json({ token, user: { id: user._id, username: user.username } });
        } catch (error) {
            res.status(500).json({ message: 'Server error' });
        }
    }

    static async getProfile(req, res) {
        try {
            const userId = (req.params.id && req.params.id !== 'me') ? req.params.id : req.user.id;
            const user = await UserService.getProfile(userId);
            if (!user) return res.status(404).json({ message: 'User not found' });
            res.json(user);
        } catch (error) {
            res.status(500).json({ message: 'Server error' });
        }
    }

    static async updateProfile(req, res) {
        try {
            const { username, bio } = req.body;
            let avatarUrl = req.body.avatar;
            if (req.file && req.file.path) {
                avatarUrl = req.file.path;
            }

            const user = await UserMongo.findById(req.user.id);
            if (!user) return res.status(404).json({ message: 'User not found' });
            if (username && username !== user.username) {
                if (await AuthService.getUserByUsername(username)) return res.status(409).json({ message: 'Username taken' });
                user.username = username;
            }
            if (avatarUrl) user.avatar = avatarUrl;
            if (bio !== undefined) user.bio = bio;
            await user.save();
            res.json({ message: 'Profile updated', user });
        } catch (error) {
            res.status(500).json({ message: 'Server error' });
        }
    }
    static async getStats(req, res) {
        try {
            const userId = req.params.id || req.user.id;
            const habits = await HabitMongo.find({ userId });
            const completions = await CompletionMongo.find({ userId });
            
            const totalCheckins = completions.length;
            res.json({ totalHabits: habits.length, totalCheckins });
        } catch (error) {
            console.error('getStats error:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }

    static async register(req, res) {
        try {
            const { username, email, password } = req.body;
            if (!username || !email || !password) return res.status(400).json({ message: 'Missing fields' });
            
            const existingUser = await AuthService.getUserByEmail(email);
            if (existingUser) return res.status(409).json({ message: 'Email in use' });
            
            const existingUsername = await AuthService.getUserByUsername(username);
            if (existingUsername) return res.status(409).json({ message: 'Username taken' });

            const hashedPassword = await bcrypt.hash(password, 10);
            const user = await AuthService.createUser({ username, email, password: hashedPassword });
            const token = AuthService.generateToken(user);
            res.cookie('token', token, cookieOptions);
            res.status(201).json({ token, user: { id: user._id, username: user.username } });
        } catch (error) {
            console.error('Register error:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }

    static async logout(req, res) {
        try {
            res.clearCookie('token', {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
            });
            res.status(200).json({ message: 'Logged out successfully' });
        } catch (error) {
            console.error('Logout error:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }

    static async getRandomUsers(req, res) {
        try {
            const limit = parseInt(req.query.limit) || 5;
            const users = await UserMongo.aggregate([
                { $sample: { size: limit } },
                { $project: { username: 1, avatar: 1, user_level: 1, bio: 1 } }
            ]);
            res.json(users);
        } catch (error) {
            console.error('getRandomUsers error:', error);
            res.status(500).json({ message: 'Server error' });
        }
    }
}

module.exports = AuthController;
