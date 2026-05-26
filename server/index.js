const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const http = require('http');
const jwt = require('jsonwebtoken');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const { Server } = require('socket.io');
const passport = require('./config/passport');
const connectMongo = require('./mongo/connectMongo');
const defaultAchievements = require('./constants/defaultAchievements');
const { setIo } = require('./realtime/socketEvents');

// Helper to parse cookies from Socket.io handshake headers
const parseCookies = (cookieString) => {
    if (!cookieString) return {};
    return cookieString.split(';').reduce((acc, curr) => {
        const [key, val] = curr.split('=').map(c => c.trim());
        if (key && val) {
            acc[key] = decodeURIComponent(val);
        }
        return acc;
    }, {});
};

const authRoutes = require('./routes/auth');
const habitRoutes = require('./routes/habits');
const postRoutes = require('./routes/posts');
const leaderboardRoutes = require('./routes/leaderboard');
const notificationRoutes = require('./routes/notifications');
const achievementRoutes = require('./routes/achievements');
const inviteRoutes = require('./routes/invite');
const battleRoutes = require('./routes/battles');
const HeatmapController = require('./controllers/HeatmapController');
const auth = require('./middleware/auth');
const { UserMongo, HabitMongo, PostMongo, AchievementMongo } = require('./models-mongo');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET && process.env.NODE_ENV === 'production') {
    console.error('FATAL: JWT_SECRET environment variable is not set.');
    process.exit(1);
}
const vercelUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null;
const renderUrl = process.env.RENDER_EXTERNAL_URL || null;
const isServerless = !!process.env.VERCEL;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Request logging (stdout only — compatible with all hosts)
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000
    }
}));

app.use(passport.initialize());
app.use(passport.session());

const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:3000',
    vercelUrl,
    renderUrl,
    process.env.CLIENT_URL
].filter(Boolean);

app.use(cors({
    origin: allowedOrigins,
    credentials: true
}));

async function syncCompletionsFromPosts() {
    try {
        const { PostMongo, CompletionMongo } = require('./models-mongo');
        const posts = await PostMongo.find({ habitId: { $ne: null } });
        console.log(`[Sync] Found ${posts.length} posts to sync to completions...`);
        let createdCount = 0;

        for (const post of posts) {
            const postDate = new Date(post.createdAt);
            postDate.setHours(0, 0, 0, 0);

            const endDate = new Date(postDate);
            endDate.setHours(23, 59, 59, 999);

            const exists = await CompletionMongo.exists({
                HabitId: post.habitId,
                date: { $gte: postDate, $lte: endDate }
            });

            if (!exists) {
                await CompletionMongo.create({
                    HabitId: post.habitId,
                    date: postDate,
                    notes: post.content || ''
                });
                createdCount++;
            }
        }
        if (createdCount > 0) {
            console.log(`[Sync] Successfully created ${createdCount} missing completion documents.`);
        } else {
            console.log(`[Sync] All completions are up to date.`);
        }
    } catch (err) {
        console.error('[Sync] Error syncing completions from posts:', err);
    }
}

async function initializeDb() {
    try {
        await connectMongo();
        await Promise.all(defaultAchievements.map((achievement) =>
            AchievementMongo.updateOne(
                { name: achievement.name },
                { $setOnInsert: achievement },
                { upsert: true }
            )
        ));
        console.log('Connected to MongoDB');
        await syncCompletionsFromPosts();
    } catch (error) {
        console.error('Unable to initialize database:', error);
        process.exit(1);
    }
}

if (!isServerless) {
    initializeDb().then(() => {
        const server = http.createServer(app);
        const io = new Server(server, {
            cors: {
                origin: allowedOrigins,
                credentials: true
            }
        });

        io.use((socket, next) => {
            // 1. Try to read token from cookies
            let token = null;
            const cookieHeader = socket.handshake.headers?.cookie;
            if (cookieHeader) {
                const parsedCookies = parseCookies(cookieHeader);
                token = parsedCookies.token;
            }

            // 2. Fallback to handshake auth or Authorization header
            if (!token) {
                const authHeader = socket.handshake.headers?.authorization;
                const bearerToken = authHeader && authHeader.startsWith('Bearer ')
                    ? authHeader.slice(7)
                    : null;
                token = socket.handshake.auth?.token || bearerToken;
            }

            if (!token) {
                return next();
            }

            try {
                const decoded = jwt.verify(token, JWT_SECRET);
                if (decoded?.id) {
                    socket.data.userId = decoded.id.toString();
                }
                return next();
            } catch (_error) {
                return next();
            }
        });

        io.on('connection', (socket) => {
            if (socket.data.userId) {
                socket.join(`user:${socket.data.userId}`);
            }
        });

        setIo(io);

        server.listen(PORT, () => {
            console.log(`Server running on http://localhost:${PORT}`);

            // Keep-alive: ping own /health endpoint every 14 min to prevent Render free-tier spin-down
            if (renderUrl) {
                const PING_INTERVAL = 14 * 60 * 1000;
                setInterval(() => {
                    fetch(`${renderUrl}/health`)
                        .then(res => console.log(`[keep-alive] ping → ${res.status}`))
                        .catch(err => console.error('[keep-alive] ping failed:', err.message));
                }, PING_INTERVAL);
                console.log(`[keep-alive] pinging ${renderUrl}/health every 14 min`);
            }

            // Auto-complete expired battles every hour
            const BattleService = require('./services/BattleService');
            const BATTLE_CHECK_INTERVAL = 60 * 60 * 1000; // 1 hour
            setInterval(() => {
                BattleService.checkExpiredBattles()
                    .catch(err => console.error('[BattleService] Expired battle check failed:', err.message));
            }, BATTLE_CHECK_INTERVAL);
            console.log('[BattleService] Checking for expired battles every hour');
        });
    });
} else {
    initializeDb();
}

app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

const countUsers = () => UserMongo.countDocuments();
const countHabits = () => HabitMongo.countDocuments();
const countCheckins = () => PostMongo.countDocuments();

const handleStatsRequest = async (req, res) => {
    try {
        const [totalUsers, totalHabits, totalCheckins] = await Promise.all([
            countUsers(),
            countHabits(),
            countCheckins()
        ]);
        res.json({ totalUsers, totalHabits, totalCheckins });
    } catch (error) {
        console.error('Error fetching public stats:', error);
        res.status(500).json({ message: 'Failed to fetch statistics' });
    }
};

app.get('/api/stats/landing', handleStatsRequest);
app.get('/api/stats/public', handleStatsRequest);

app.get('/api', (req, res) => {
    res.json({ message: "Welcome to the Aadat API", version: "1.0.0" });
});

app.use('/api/users', authRoutes);
app.use('/api/habits', habitRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/achievements', achievementRoutes);
app.use('/api/invite', inviteRoutes);
app.use('/api/battles', battleRoutes);
app.get('/api/heatmap', auth, HeatmapController.getHeatmapData);
app.get('/api/heatmap/:userId', auth, HeatmapController.getHeatmapData);

if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, '../client-react/dist')));
    app.get(/.*/, (req, res) => {
        res.sendFile(path.join(__dirname, '../client-react/dist', 'index.html'));
    });
}

module.exports = app;