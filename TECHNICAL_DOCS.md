# Aadat — Technical Documentation

> Complete technical reference for the Aadat social habit tracking platform.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Database Design](#database-design)
3. [Authentication System](#authentication-system)
4. [Habit Tracking Engine](#habit-tracking-engine)
5. [AI Integration (Gemini)](#ai-integration-gemini)
6. [Social Features](#social-features)
7. [Achievement System](#achievement-system)
8. [Real-time System (Socket.IO)](#real-time-system-socketio)
9. [Email Service](#email-service)
10. [Media Uploads (Cloudinary)](#media-uploads-cloudinary)
11. [Content Moderation](#content-moderation)
12. [Frontend Architecture](#frontend-architecture)
13. [API Flow Diagrams](#api-flow-diagrams)
14. [Deployment Guide](#deployment-guide)

---

## Architecture Overview

Aadat follows a **client-server architecture** with a React SPA frontend and a Node.js/Express REST API backend.

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT (React)                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐   │
│  │ Dashboard │  │Community │  │Leaderboard│  │  Profile     │   │
│  └────┬─────┘  └────┬─────┘  └────┬──────┘  └──────┬───────┘   │
│       │              │             │                │            │
│  ┌────▼──────────────▼─────────────▼────────────────▼───────┐   │
│  │              API Service (Axios) + Socket.IO Client       │   │
│  └──────────────────────────┬────────────────────────────────┘   │
└─────────────────────────────┼───────────────────────────────────┘
                              │ HTTP + WebSocket
┌─────────────────────────────▼───────────────────────────────────┐
│                        SERVER (Express 5)                       │
│  ┌──────────┐  ┌───────────┐  ┌───────────┐  ┌─────────────┐  │
│  │  Routes   │  │Controllers│  │  Services  │  │  Middleware  │  │
│  └────┬─────┘  └─────┬─────┘  └─────┬──────┘  └──────┬──────┘  │
│       │              │               │                │          │
│  ┌────▼──────────────▼───────────────▼────────────────▼──────┐  │
│  │                  Mongoose ODM + MongoDB Atlas              │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  External Services:                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │ Gemini AI │  │ SendGrid │  │Cloudinary│  │Socket.IO │       │
│  │(Roadmaps +│  │ (Emails) │  │ (Media)  │  │(Realtime)│       │
│  │Moderation)│  │          │  │          │  │          │       │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘       │
└─────────────────────────────────────────────────────────────────┘
```

### Request Lifecycle

```
Client Request → Express Router → Auth Middleware (JWT verify)
    → Controller (business logic) → Service Layer (DB queries)
    → Mongoose Model → MongoDB Atlas
    → Response JSON → Client
```

---

## Database Design

### MongoDB Collections (Mongoose Schemas)

#### User (`UserMongo`)
```
{
  username:     String (unique, required, trimmed)
  email:        String (unique, required, lowercase, validated)
  password:     String (required, bcrypt hashed)
  user_level:   Number (default: 1)
  user_xp:      Number (default: 0)
  avatar:       String (default: '👤', can be emoji or Cloudinary URL)
  bio:          String (max: 150 chars)
  warnings:     Number (default: 0, tracks AI moderation strikes)
  isSuspended:  Boolean (default: false)
  communities:  Mixed (nullable)
  createdAt:    Date (auto)
  updatedAt:    Date (auto)
}
Indexes: { username: 1 } unique, { email: 1 } unique
```

#### Habit (`HabitMongo`)
```
{
  habitTitle:       String (required, trimmed)
  habitCategory:    String (nullable)
  startDate:        Date (default: now)
  currentStreak:    Number (default: 0)
  longestStreak:    Number (default: 0)
  lastCheckinDate:  Date (nullable)
  description:      String (nullable)
  aiDescription:    String (AI-generated habit summary, nullable)
  roadmap:          Mixed (JSON array of AI-generated checkpoints, nullable)
  roadmapProgress:  Mixed (tracks checkpoint completion, nullable)
  targetPercentage: Number (default: 70)
  userId:           ObjectId → UserMongo (required)
  createdAt:        Date (auto)
  updatedAt:        Date (auto)
}
Indexes: { userId: 1, createdAt: -1 }
```

#### Post (`PostMongo`)
```
{
  content:    String (required)
  userId:     ObjectId → UserMongo (required)
  habitId:    ObjectId → HabitMongo (nullable)
  mediaUrl:   String (Cloudinary URL, nullable)
  mediaType:  String (enum: 'image', 'video', null)
  createdAt:  Date (auto)
  updatedAt:  Date (auto)
}
Indexes: { userId: 1, createdAt: -1 }, { habitId: 1, createdAt: -1 }
```

#### Comment (`CommentMongo`)
```
{
  content:   String (required)
  userId:    ObjectId → UserMongo (required)
  postId:    ObjectId → PostMongo (required)
  createdAt: Date (auto)
}
```

#### Like (`LikeMongo`)
```
{
  userId:    ObjectId → UserMongo (required)
  postId:    ObjectId → PostMongo (required)
}
Indexes: { userId: 1, postId: 1 } unique compound
```

#### Achievement (`AchievementMongo`)
```
{
  name:        String (unique, system key e.g., 'streak_7_day')
  displayName: String (human-readable e.g., '7-Day Streak')
  description: String
  icon:        String (emoji)
  xpReward:    Number
}
```

#### UserAchievement (`UserAchievementMongo`)
```
{
  userId:        ObjectId → UserMongo
  achievementId: ObjectId → AchievementMongo
  unlockedAt:    Date (default: now)
}
Indexes: { userId: 1, achievementId: 1 } unique compound
```

#### Notification (`NotificationMongo`)
```
{
  userId:    ObjectId → UserMongo (recipient)
  senderId:  ObjectId → UserMongo (nullable, null for system notifications)
  type:      String (enum: 'like', 'comment', 'achievement', 'system')
  message:   String
  read:      Boolean (default: false)
  createdAt: Date (auto)
}
```

#### OTP (`OTPMongo`)
```
{
  email:     String (required)
  otp:       String (required, 6-digit code)
  username:  String
  password:  String (pre-hashed)
  verified:  Boolean (default: false)
  expiresAt: Date (10 minutes from creation)
  createdAt: Date (auto, TTL index: 600s)
}
```

#### Completion (`CompletionMongo`)
```
{
  habitId:   ObjectId → HabitMongo
  userId:    ObjectId → UserMongo
  date:      Date
}
```

---

## Authentication System

Aadat supports **3 authentication methods**:

### 1. Email + Password (with OTP Verification)

```
Client                          Server                         SendGrid
  │                               │                               │
  ├─ POST /register/send-otp ────►│                               │
  │  { email, username, password } │                               │
  │                               ├─ Hash password (bcrypt) ──────│
  │                               ├─ Generate 6-digit OTP ────────│
  │                               ├─ Store OTP in OTPMongo ───────│
  │                               ├─ Send OTP email ──────────────►│
  │◄── { msg: "OTP sent" } ──────┤                               │
  │                               │                               │
  ├─ POST /register/verify-otp ──►│                               │
  │  { email, otp }               │                               │
  │                               ├─ Verify OTP matches & not expired
  │                               ├─ Create User in MongoDB ──────│
  │                               ├─ Generate JWT token ──────────│
  │◄── { token, user } ──────────┤                               │
```

### 2. Google OAuth

```
Client → GET /auth/google → Google consent screen → Callback
  → Server creates/finds user → Generates JWT → Redirects to client with token
```

### 3. GitHub OAuth

Same flow as Google, using Passport.js `passport-github2` strategy.

### JWT Token Structure
```javascript
payload = {
  id: user._id,
  email: user.email
}
// Signed with JWT_SECRET, no expiration by default
```

### Auth Middleware
Every protected route passes through `middleware/auth.js`:
```
Request → Extract token from Authorization header → jwt.verify()
  → Attach req.user = { id, email } → Next handler
  → If invalid → 401 Unauthorized
```

### Suspension Check
The `POST /api/posts` and `POST /api/posts/:id/comments` routes check `user.isSuspended` before allowing content creation. Suspended users receive a 403 response.

---

## Habit Tracking Engine

### Creating a Habit
```
POST /api/habits
Body: { habitTitle, habitCategory, description }

→ Creates HabitMongo document
→ Triggers achievement check (habit_creator, five_habits)
→ Returns the new habit
```

### Check-in Flow (Core Business Logic)
```
POST /api/habits/:id/checkin

1. Find habit by ID
2. Validate: Has the user already checked in today?
   - Compare lastCheckinDate with today's date
   - If already checked in → reject

3. Calculate streak:
   - If lastCheckinDate was yesterday → currentStreak + 1
   - If lastCheckinDate was today → reject (already done)
   - If lastCheckinDate was older → streak resets to 1

4. Update longestStreak if currentStreak exceeds it

5. Grant XP:
   - Base: +10 XP
   - Streak bonus: +5 XP for every streak milestone
   - Level up: Every 100 XP → user_level + 1

6. Create a Post (check-in post) with optional media

7. Update roadmap progress (if roadmap exists):
   - Find the current checkpoint based on streak days
   - Mark checkpoint as completed
   - Set completedDate

8. Trigger achievement evaluation (async)

9. Emit Socket.IO events (posts, habits, leaderboard)
```

### XP & Leveling System
```
XP Per Check-in:  10 base + streak bonuses
Level Formula:    Level = floor(user_xp / 100) + 1
Level Up:         Happens automatically when XP crosses threshold
```

---

## AI Integration (Gemini)

Aadat uses **Google Gemini 2.5 Flash** for two features:

### 1. Roadmap Generation
```
POST /api/habits/:id/roadmap

Input:  habitTitle + description
Prompt: "Generate a personalized 30-day roadmap with 5-7 checkpoints..."
Output: JSON with aiDescription + roadmap array

Roadmap Checkpoint Schema:
{
  checkpoint: Number (1-7),
  day: Number (1-30),
  title: String,
  description: String,
  difficulty: "Easy" | "Medium" | "Hard",
  tips: [String]
}
```

### 2. Content Moderation
```
Input:  Post/comment text content
Prompt: "Analyze for abuse, harassment, hate speech..."
Output: { isAbusive: Boolean, reason: String | null }

Used in: POST /api/posts (create post), POST /api/posts/:id/comments
```

---

## Social Features

### Community Feed
- `GET /api/posts/feed` — Returns all posts, sorted by newest first
- Each post is **enriched** with:
  - `likeCount` — total likes
  - `isLikedByCurrentUser` — Boolean
  - `comments` — array with populated author info
  - `commentCount` — total comments
- Posts are populated with `userId` (username, avatar) and `habitId` (habitTitle)

### Likes
- `POST /api/posts/:id/like` — Toggle-free (one-time like only)
- Creates a `LikeMongo` document
- Creates a notification for the post author
- Triggers achievement check (first_like)

### Comments
- `POST /api/posts/:id/comments` — AI-moderated before saving
- Creates a `CommentMongo` document
- Creates a notification for the post author
- Populated with author's username and avatar on fetch

---

## Achievement System

### Available Achievements

| Name | Display | Condition | XP |
|------|---------|-----------|-----|
| `community_joiner` | Community Joiner | Registered user | 10 |
| `habit_creator` | Habit Creator | Created 1 habit | 20 |
| `five_habits` | Five Habits | Created 5 habits | 50 |
| `first_post` | First Post | Made 1 post | 15 |
| `first_like` | First Like | Liked 1 post | 10 |
| `streak_3_day` | 3-Day Streak | 3-day streak on any habit | 30 |
| `streak_7_day` | 7-Day Streak | 7-day streak | 50 |
| `streak_30_day` | 30-Day Streak | 30-day streak | 100 |
| `streak_100_day` | 100-Day Streak | 100-day streak | 500 |
| `level_5` | Level 5 | Reached level 5 | 50 |
| `level_10` | Level 10 | Reached level 10 | 100 |
| `early_bird` | Early Bird | Checked in before 8 AM | 25 |

### Evaluation Flow
```
Any action (check-in, post, like) → AchievementService.checkAndUnlock(userId)
  → Fetch all achievements + user's unlocked set
  → Evaluate each locked achievement condition
  → If condition met → Create UserAchievement + Notification
  → Emit Socket.IO event for real-time UI update
```

---

## Real-time System (Socket.IO)

### Events Emitted
```javascript
// Server → Client
'data-changed' → { scope, action, userId }
  scope: 'posts' | 'habits' | 'leaderboard' | 'achievements' | 'notifications'
  action: 'created' | 'updated' | 'deleted' | 'unlocked'
```

### Client Handling
```javascript
// socket.js — subscribeToDataChanges(callback)
// When event received → callback triggers data re-fetch on the appropriate page
```

### When Events Fire
- Habit check-in → `posts`, `habits`, `leaderboard`
- New post → `posts`
- New like → `posts`, `notifications`
- Achievement unlocked → `achievements`, `notifications`
- Habit CRUD → `habits`

---

## Email Service

### Provider Priority
```
1. SendGrid (HTTP API) — Works on Render and all cloud hosts
2. Gmail/Nodemailer (SMTP) — Works only locally (blocked on Render)
```

### Email Types

#### OTP Verification Email
- Sent during registration
- Contains 6-digit OTP code
- Styled HTML template with Aadat branding
- 10-minute expiry

#### Invitation Email
- Sent when a user invites a friend
- Contains personalized CTA button
- Styled HTML template with sender's name
- Links back to the Aadat landing page

---

## Media Uploads (Cloudinary)

### Configuration
- Uses `multer-storage-cloudinary` for direct uploads
- Two upload configs:
  - **Avatar uploads**: `multer` single file (`avatar` field)
  - **Post media uploads**: `multer` single file (`media` field)

### Supported Media
- **Images**: Displayed with `<img>` tag
- **Videos**: Displayed with `<video controls>` tag
- `mediaType` field (`'image'` or `'video'`) determines rendering

---

## Content Moderation

### 3-Strike Warning System

```
User posts/comments content
  → GeminiService.moderateContent(text)
  → If isAbusive:
      → user.warnings += 1
      → If warnings >= 3:
          → user.isSuspended = true
          → 403: "Account suspended"
      → Else:
          → 400: "Content blocked. Warning X of 3"
  → If not abusive:
      → Content saved normally
```

### Frontend Handling
- Blocked content shows a custom toast notification (not browser `alert()`)
- Suspension redirects to login page
- Global axios interceptor catches 403 suspension responses

---

## Frontend Architecture

### State Management
- **AuthContext** — Global auth state (user, token, login/logout/fetchUser)
- **ToastContext** — Global toast notification system with DOM event bridge
- **Local State** — Component-level `useState` for page-specific data

### Page Components

| Page | Key Features |
|------|-------------|
| **Landing** | Hero section, feature showcase, stats, animated with Framer Motion |
| **Login** | Email/password login, OTP registration, Google/GitHub OAuth buttons |
| **Dashboard** | Habit list, check-in buttons, streak display, add habit modal, seeding chart |
| **Community** | Post feed, like/comment, post creation with media upload |
| **Leaderboard** | XP ranking table with level badges and avatars |
| **Roadmap** | AI-generated 30-day roadmap with interactive checkpoint visualization |
| **Profile** | Stats cards, achievement showcase, journey timeline (user's posts), editable bio/avatar |
| **EditProfile** | Avatar picker (emoji or upload), username, bio editing |

### Toast Notification System
```
ToastContext provides: toast.error(), toast.warn(), toast.success(), toast.info()

Non-React code (axios interceptor) → dispatches CustomEvent('app-toast')
  → ToastContext useEffect listener → routes to addToast()
  → Renders glassmorphic slide-in notification
```

### Key Client Libraries
- **Framer Motion** — Page transitions, card animations, stagger effects
- **React CountUp** — Animated number counters on stats
- **React Icons (Feather)** — FiHeart, FiMessageCircle icons
- **Socket.IO Client** — Real-time data change subscriptions

---

## API Flow Diagrams

### Complete Check-in Flow
```
User clicks "Check In" on Dashboard
  │
  ├─► POST /api/habits/:id/checkin (with optional media file)
  │     │
  │     ├─► Validate: not already checked in today
  │     ├─► Calculate new streak
  │     ├─► Grant XP + check level up
  │     ├─► AI moderate content (if text provided)
  │     ├─► Upload media to Cloudinary (if file attached)
  │     ├─► Create PostMongo document
  │     ├─► Update roadmap progress
  │     ├─► AchievementService.checkAndUnlock(userId)
  │     ├─► Emit Socket.IO events
  │     └─► Return { habit, post, xpGained, levelUp }
  │
  └─► Client receives response
        ├─► Update habit list (re-fetch)
        ├─► Show success toast
        └─► Achievement popup (if unlocked)
```

### Comment with Moderation Flow
```
User types comment → clicks Send
  │
  ├─► POST /api/posts/:id/comments
  │     │
  │     ├─► GeminiService.moderateContent(text)
  │     │     ├─► Safe → continue
  │     │     └─► Abusive → increment warnings → return 400/403
  │     │
  │     ├─► Create CommentMongo document
  │     ├─► Create NotificationMongo for post author
  │     ├─► Emit Socket.IO event
  │     └─► Return { comment }
  │
  └─► Client receives response
        ├─► Success → append comment to list
        └─► Error → show toast with moderation message
```

---

## Deployment Guide

### Render Deployment

#### Backend (Web Service)
```
Build Command:  npm install
Start Command:  node index.js
Root Directory: server/
```

**Environment Variables:**
| Variable | Required | Description |
|----------|----------|-------------|
| `MONGODB_URI` | ✅ | MongoDB Atlas connection string |
| `JWT_SECRET` | ✅ | Strong random secret |
| `SESSION_SECRET` | ✅ | OAuth session secret |
| `NODE_ENV` | ✅ | `production` |
| `CLIENT_URL` | ✅ | Frontend URL for CORS |
| `SENDGRID_API_KEY` | ✅ | SendGrid API key |
| `SENDGRID_SENDER_EMAIL` | ✅ | Verified sender email |
| `GEMINI_API_KEY` | ✅ | Google Gemini API key |
| `GOOGLE_CLIENT_ID` | ✅ | Google OAuth |
| `GOOGLE_CLIENT_SECRET` | ✅ | Google OAuth |
| `GOOGLE_CALLBACK_URL` | ✅ | Full callback URL |
| `GITHUB_CLIENT_ID` | ✅ | GitHub OAuth |
| `GITHUB_CLIENT_SECRET` | ✅ | GitHub OAuth |
| `GITHUB_CALLBACK_URL` | ✅ | Full callback URL |
| `CLOUDINARY_CLOUD_NAME` | ✅ | Cloudinary config |
| `CLOUDINARY_API_KEY` | ✅ | Cloudinary config |
| `CLOUDINARY_API_SECRET` | ✅ | Cloudinary config |

#### Frontend (Static Site)
```
Build Command:   cd client-react && npm install && npm run build
Publish Dir:     client-react/dist
```

**Environment Variables:**
| Variable | Description |
|----------|-------------|
| `VITE_API_BASE_URL` | Backend URL (e.g. `https://aadat-api.onrender.com`) |

### Important Notes
- **SMTP is blocked on Render** — Gmail/Nodemailer will timeout. Use SendGrid.
- **MongoDB Atlas** — Whitelist `0.0.0.0/0` for Render's dynamic IPs.
- **OAuth Callback URLs** — Must match the production domain in Google/GitHub console.

---

*Last updated: May 2026*
