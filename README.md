# Aadat — A Social Space for Habit Tracking 🎯

> Build habits that actually stick. A full-stack social platform where you track habits, share progress, compete on leaderboards, and stay accountable with a real community.

![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![React](https://img.shields.io/badge/React-19-61DAFB.svg)
![Express](https://img.shields.io/badge/Express-5-000000.svg)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248.svg)

---

## 🌟 Features

### Core
- **📊 Habit Tracking** — Create, manage, and track daily habits with check-in streaks
- **🔥 Streak System** — Visual streak counters with current & longest streak tracking
- **✅ Daily Check-ins** — Check in on habits to earn XP and keep your streak alive

### AI-Powered
- **🤖 AI Roadmaps** — Google Gemini generates personalized 30-day habit-building paths with checkpoints
- **🛡️ AI Content Moderation** — Gemini-powered abuse detection on posts & comments (3-strike suspension system)

### Social
- **👥 Community Feed** — Share check-in posts with text, images, and videos
- **💬 Comments & Likes** — Interact with community members on their posts
- **🏆 XP Leaderboard** — Compete with the community based on XP earned from habits
- **📧 Email Invitations** — Invite friends via beautiful branded emails (SendGrid)
- **🔔 Real-time Notifications** — Instant updates via Socket.IO for likes, comments, and achievements

### Profile & Achievements
- **👤 User Profiles** — Customizable avatar (emoji or uploaded photo), bio, and journey timeline
- **🎖️ Achievement System** — 12+ unlockable badges (First Step, Streak Master, Social Butterfly, etc.)
- **📈 Stats Dashboard** — Total habits, completed count, current/longest streaks, XP breakdown

### Auth & Security
- **🔐 Multi-Auth** — Email/password with OTP verification, Google OAuth, GitHub OAuth
- **🔑 JWT Authentication** — Secure token-based session management
- **⚠️ Warning System** — AI-moderated content with 3-warning suspension policy

### Design
- **🌙 Dark Mode** — Premium dark theme with neon green accents
- **📱 Fully Responsive** — Optimized for desktop, tablet, and mobile
- **✨ Micro-Animations** — Framer Motion powered transitions and interactions
- **🎨 Custom Toast Notifications** — Glassmorphic in-app notification system (no native alerts)

---

## 🛠️ Tech Stack

### Frontend
| Technology | Version | Purpose |
|---|---|---|
| React | 19.2 | UI library |
| React Router | 7.x | Client-side routing |
| Vite | 7.x | Build tool & dev server |
| Framer Motion | 12.x | Animations & transitions |
| Axios | 1.x | HTTP client |
| Socket.IO Client | 4.x | Real-time WebSocket events |
| React Icons | 5.x | Icon library |
| React CountUp | 6.x | Animated number counters |
| CSS3 | — | Custom dark theme with CSS variables |

### Backend
| Technology | Version | Purpose |
|---|---|---|
| Node.js | 18+ | Runtime |
| Express | 5.x | Web framework |
| MongoDB Atlas | — | Cloud database |
| Mongoose | 8.x | MongoDB ODM |
| JWT | 9.x | Authentication tokens |
| Bcrypt | 6.x | Password hashing |
| Passport.js | 0.7 | OAuth (Google + GitHub) |
| Socket.IO | 4.x | Real-time events |
| Multer | 2.x | File uploads |
| Cloudinary | 1.x | Image/video hosting |
| SendGrid | 8.x | Transactional emails |
| Nodemailer | 7.x | Email fallback (local dev) |
| Google Gemini AI | 0.24 | Roadmap generation & content moderation |

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MongoDB Atlas account (or local MongoDB)
- SendGrid API key (for emails)
- Google Gemini API key (for AI features)
- Cloudinary account (for media uploads)

### Local Development

1. **Clone the repository**
```bash
git clone https://github.com/Shivinazad/Aadat-A-Social-Space-for-Habbit-Tracking.git
cd Aadat-A-Social-Space-for-Habbit-Tracking
```

2. **Install dependencies**
```bash
# Server
cd server && npm install

# Client (new terminal)
cd client-react && npm install
```

3. **Configure environment variables**
```bash
cd server
cp .env.production.example .env
# Edit .env with your credentials (see Environment Variables section)
```

4. **Start the app**
```bash
# Terminal 1 — Backend
cd server
node index.js

# Terminal 2 — Frontend
cd client-react
npm run dev
```

5. **Open the app**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3000

---

## 📦 Project Structure

```
Aadat-A-Social-Space-for-Habbit-Tracking/
├── client-react/                # React frontend
│   ├── src/
│   │   ├── components/          # Reusable UI components
│   │   │   ├── Navbar.jsx       # Navigation bar with notifications
│   │   │   ├── AddHabitModal.jsx # Habit creation modal
│   │   │   ├── RoadmapDisplay.jsx # AI roadmap visualizer
│   │   │   ├── ErrorBoundary.jsx  # Error handling wrapper
│   │   │   └── PrivateRoute.jsx   # Auth route guard
│   │   ├── context/
│   │   │   ├── AuthContext.jsx  # Authentication state management
│   │   │   └── ToastContext.jsx # Global toast notification system
│   │   ├── pages/
│   │   │   ├── Landing.jsx      # Public landing page
│   │   │   ├── Login.jsx        # Login + Register with OTP
│   │   │   ├── Dashboard.jsx    # Main habit tracking dashboard
│   │   │   ├── Community.jsx    # Social feed with posts
│   │   │   ├── Leaderboard.jsx  # XP ranking leaderboard
│   │   │   ├── Roadmap.jsx      # AI-generated habit roadmap
│   │   │   ├── Profile.jsx      # User profile & journey
│   │   │   └── EditProfile.jsx  # Profile editing
│   │   ├── services/
│   │   │   ├── api.js           # Axios API client with interceptors
│   │   │   └── socket.js        # Socket.IO real-time client
│   │   └── styles/              # Component-specific CSS
│   └── vite.config.js
│
├── server/                      # Express backend
│   ├── config/
│   │   ├── passport.js          # OAuth strategies (Google + GitHub)
│   │   └── cloudinary.js        # Media upload config
│   ├── controllers/
│   │   ├── AuthController.js    # Auth, profile, stats
│   │   ├── HabitController.js   # CRUD + check-in + streaks
│   │   ├── PostController.js    # Posts, likes, comments, AI moderation
│   │   ├── AchievementController.js
│   │   ├── LeaderboardController.js
│   │   └── NotificationController.js
│   ├── services/
│   │   ├── GeminiService.js     # AI roadmap + content moderation
│   │   ├── AchievementService.js # Achievement evaluation engine
│   │   ├── PostService.js       # Post enrichment (likes, comments)
│   │   ├── AuthService.js       # User + OTP operations
│   │   ├── HabitService.js      # Habit queries
│   │   └── UserService.js       # Leaderboard queries
│   ├── models-mongo/            # Mongoose schemas
│   │   ├── User.js, Habit.js, Post.js, Comment.js,
│   │   ├── Like.js, Achievement.js, UserAchievement.js,
│   │   ├── Completion.js, Notification.js, OTP.js
│   │   └── index.js
│   ├── middleware/
│   │   └── auth.js              # JWT verification middleware
│   ├── routes/                  # Express route definitions
│   ├── realtime/
│   │   └── socketEvents.js      # Socket.IO event handlers
│   ├── emailService.js          # SendGrid + Gmail email service
│   ├── index.js                 # Server entry point
│   └── seed.js                  # Database seeding script
│
└── README.md
```

---

## 🔒 Environment Variables

### Server (`server/.env`)
```env
# Core
PORT=3000
NODE_ENV=development
DB_ENGINE=mongo
JWT_SECRET=<your-secret>
SESSION_SECRET=<your-session-secret>
CLIENT_URL=http://localhost:5173

# MongoDB
MONGODB_URI=<your-mongodb-atlas-uri>

# OAuth
GOOGLE_CLIENT_ID=<your-google-client-id>
GOOGLE_CLIENT_SECRET=<your-google-client-secret>
GOOGLE_CALLBACK_URL=http://localhost:3000/api/users/auth/google/callback
GITHUB_CLIENT_ID=<your-github-client-id>
GITHUB_CLIENT_SECRET=<your-github-client-secret>
GITHUB_CALLBACK_URL=http://localhost:3000/api/users/auth/github/callback

# Email (SendGrid for production, Gmail for local dev)
SENDGRID_API_KEY=<your-sendgrid-key>
SENDGRID_SENDER_EMAIL=<your-verified-sender-email>
EMAIL_USER=<your-gmail>            # Fallback for local dev only
EMAIL_PASSWORD=<gmail-app-password> # Fallback for local dev only

# AI
GEMINI_API_KEY=<your-gemini-api-key>

# Media
CLOUDINARY_CLOUD_NAME=<your-cloud-name>
CLOUDINARY_API_KEY=<your-api-key>
CLOUDINARY_API_SECRET=<your-api-secret>
```

---

## 📚 API Reference

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/users/register/send-otp` | Send OTP to email |
| POST | `/api/users/register/verify-otp` | Verify OTP code |
| POST | `/api/users/register` | Complete registration |
| POST | `/api/users/login` | Login with email/password |
| GET | `/api/users/auth/google` | Google OAuth login |
| GET | `/api/users/auth/github` | GitHub OAuth login |
| GET | `/api/users/me` | Get current user profile |
| PUT | `/api/users/profile` | Update profile (avatar, bio, username) |

### Habits
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/habits` | Get user's habits |
| POST | `/api/habits` | Create new habit |
| PUT | `/api/habits/:id` | Update habit |
| DELETE | `/api/habits/:id` | Delete habit |
| POST | `/api/habits/:id/checkin` | Check in on a habit |
| POST | `/api/habits/:id/roadmap` | Generate AI roadmap |

### Posts & Social
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/posts/feed` | Get community feed |
| GET | `/api/posts/recent` | Get recent posts (public) |
| GET | `/api/posts/user/:userId` | Get user's posts |
| POST | `/api/posts` | Create post (with optional media) |
| POST | `/api/posts/:id/like` | Like a post |
| POST | `/api/posts/:id/comments` | Add comment (AI moderated) |
| GET | `/api/posts/:id/comments` | Get post comments |

### Other
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/leaderboard` | Get XP leaderboard |
| GET | `/api/achievements` | Get all achievements |
| GET | `/api/notifications` | Get user notifications |
| PUT | `/api/notifications/mark-read` | Mark all as read |
| POST | `/api/invite` | Send email invitation |

---

## 🌐 Deployment (Render)

1. Push code to GitHub
2. Create two Render services:
   - **Backend**: Web Service → `node server/index.js`
   - **Frontend**: Static Site → `cd client-react && npm run build` (publish: `dist`)
3. Set all environment variables on the backend service
4. Set `VITE_API_BASE_URL` on the frontend build

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📧 Support

For support, email shivinazad3@gmail.com or create an issue in the repository.

---

**Built with ❤️ by Shivin Azad — for people who want to build better habits together**
