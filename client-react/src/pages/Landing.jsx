import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import CountUp from 'react-countup';
import { FiArrowRight, FiPlay, FiCheck, FiTrendingUp, FiUsers, FiAward, FiZap, FiSun, FiMoon, FiBell, FiTarget, FiActivity, FiStar } from 'react-icons/fi';
import api from '../services/api';
import { subscribeToDataChanges } from '../services/socket';

const Landing = () => {
  const { isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalHabits: 0,
    totalCheckins: 0
  });
  const [recentActivities, setRecentActivities] = useState([]);
  const [testimonialUsers, setTestimonialUsers] = useState([
    { username: 'Loading...' },
    { username: 'Loading...' },
    { username: 'Loading...' },
    { username: 'Loading...' },
    { username: 'Loading...' }
  ]);
  const isDark = true;

  useEffect(() => {
    localStorage.setItem('theme', 'dark');
    document.body.classList.add('dark-mode');
    document.body.classList.remove('light-mode');
    document.body.classList.add('landing-page');
    return () => {
      document.body.classList.remove('landing-page', 'light-mode');
    };
  }, []);

  useEffect(() => {
    // Fetch real statistics
    const fetchStats = async () => {
      try {
        const response = await api.get('/stats/public');
        setStats(response.data);
      } catch (error) {
        console.error('Failed to fetch stats:', error);
        // Set fallback values if API fails
        setStats({ totalUsers: 1000, totalHabits: 5000, totalCheckins: 25000 });
      }
    };

    // Fetch recent activities from posts
    const fetchActivities = async () => {
      try {
        const response = await api.get('/posts/recent?limit=5');
        if (response.data && Array.isArray(response.data)) {
          setRecentActivities(response.data);
        }
      } catch (error) {
        console.error('Failed to fetch activities:', error.response?.data || error.message);
        // Set empty array on error so the UI shows "no activity" message
        setRecentActivities([]);
      }
    };

    // Fetch random users for testimonials
    const fetchTestimonialUsers = async () => {
      try {
        const response = await api.get('/users/random?limit=5');
        if (response.data && Array.isArray(response.data) && response.data.length > 0) {
          setTestimonialUsers(response.data);
        }
      } catch (error) {
        console.error('Failed to fetch testimonial users:', error);
        // Keep the initial placeholder state - don't set to empty array
      }
    };

    fetchStats();
    fetchActivities();
    fetchTestimonialUsers();
    // Refresh activities every 30 seconds
    const interval = setInterval(fetchActivities, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const refreshStats = async () => {
      try {
        const response = await api.get('/stats/public');
        setStats(response.data);
      } catch (error) {
        console.error('Failed to refresh stats:', error);
      }
    };

    const refreshActivities = async () => {
      try {
        const response = await api.get('/posts/recent?limit=5');
        if (response.data && Array.isArray(response.data)) {
          setRecentActivities(response.data);
        }
      } catch (error) {
        console.error('Failed to refresh activities:', error);
      }
    };

    const unsubscribe = subscribeToDataChanges((event) => {
      if (!event?.scope) return;

      if (['posts', 'likes'].includes(event.scope)) {
        refreshActivities();
        refreshStats();
      }

      if (event.scope === 'habits') {
        refreshStats();
      }
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, loading, navigate]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="landing-page">
      <motion.nav
        className="navbar"
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <div className="nav-container">
          <div className="brand-footer">
            Aadat<span className="neon-dot"></span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>

            <Link to="/login" className="btn-primary-new">
              Sign up
              <FiArrowRight />
            </Link>
          </div>
        </div>
      </motion.nav>

      {/* HERO SECTION */}
      <section className="hero">
        <div className="hero-container">
          <motion.div
            className="hero-badge-wrapper"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <span className="hero-badge">
              <span className="live-indicator"></span>
              {stats.totalUsers > 0 ? `${stats.totalUsers.toLocaleString()}+ users` : 'Join our community'} building better habits
            </span>
          </motion.div>

          <motion.h1
            className="hero-title"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
          >
            Build habits that
            <br />
            <span className="neon-text">actually stick</span>
          </motion.h1>

          <motion.p
            className="hero-subtitle"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
          >
            The habit tracker designed for people who are tired of broken streaks.<br />
            Simple. Powerful. Built for consistency.
          </motion.p>

          <motion.div
            className="hero-actions"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
          >
            <Link to="/login" className="btn-primary-new">
              Get started free
              <FiArrowRight />
            </Link>
          </motion.div>

          {/* STATS BAR */}
          <motion.div
            className="hero-stats"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.8 }}
          >
            <div className="stat-item">
              <div className="stat-number">
                <CountUp end={stats.totalUsers} duration={2.5} separator="," />
              </div>
              <div className="stat-label">Active users</div>
            </div>
            <div className="stat-divider"></div>
            <div className="stat-item">
              <div className="stat-number">
                <CountUp end={stats.totalHabits} duration={2.5} separator="," />
              </div>
              <div className="stat-label">Habits tracked</div>
            </div>
            <div className="stat-divider"></div>
            <div className="stat-item">
              <div className="stat-number">
                {stats.totalCheckins > 0 ? <CountUp end={stats.totalCheckins} duration={2.5} separator="," /> : '...'}
              </div>
              <div className="stat-label">Check-ins completed</div>
            </div>
          </motion.div>

          {/* HERO DASHBOARD PREVIEW */}
          <div className="hero-dashboard">
            <div className="dashboard-window">
              <div className="window-header">
                <div className="window-dots">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
                <div className="window-title">Dashboard</div>
                <div className="window-actions"></div>
              </div>
              <div className="window-content">
                <div className="streak-display">
                  <div className="streak-icon-large">🔥</div>
                  <div className="streak-number-large">127</div>
                  <div className="streak-label">Day Streak</div>
                </div>

                <div className="habits-today">
                  <div className="habits-header">
                    <span>Today</span>
                    <span className="habits-count">3/5 completed</span>
                  </div>
                  <div className="habit-item done">
                    <div className="habit-check">✓</div>
                    <div className="habit-name">Morning meditation</div>
                    <div className="habit-streak">47🔥</div>
                  </div>
                  <div className="habit-item done">
                    <div className="habit-check">✓</div>
                    <div className="habit-name">Drink 2L water</div>
                    <div className="habit-streak">11🔥</div>
                  </div>
                  <div className="habit-item done">
                    <div className="habit-check">✓</div>
                    <div className="habit-name">Read 30 minutes</div>
                    <div className="habit-streak">23🔥</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES SECTION */}
      <section className="features-section">
        <div className="features-container">
          <div className="section-header">
            <span className="section-badge">FEATURES</span>
            <h2>Everything you need to succeed</h2>
            <p className="section-subtitle">Powerful features designed by habit experts</p>
          </div>

          <div className="features-grid">
            <motion.div
              className="feature-card"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              whileHover={{ y: -8, transition: { duration: 0.3 } }}
            >
              <div className="feature-icon"><FiZap /></div>
              <h3>Streak Tracking</h3>
              <p>Watch your consistency grow with visual streak counters that motivate you daily.</p>
            </motion.div>
            <motion.div
              className="feature-card"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              whileHover={{ y: -8, transition: { duration: 0.3 } }}
            >
              <div className="feature-icon"><FiUsers /></div>
              <h3>Community Support</h3>
              <p>Join a supportive community of habit builders who celebrate your wins.</p>
            </motion.div>
            <motion.div
              className="feature-card"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.3 }}
              whileHover={{ y: -8, transition: { duration: 0.3 } }}
            >
              <div className="feature-icon"><FiTrendingUp /></div>
              <h3>Progress Analytics</h3>
              <p>Get detailed insights into your habit patterns with beautiful charts.</p>
            </motion.div>
            <motion.div
              className="feature-card"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.4 }}
              whileHover={{ y: -8, transition: { duration: 0.3 } }}
            >
              <div className="feature-icon"><FiAward /></div>
              <h3>Achievements</h3>
              <p>Unlock badges and achievements as you hit milestones.</p>
            </motion.div>
            <motion.div
              className="feature-card"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.5 }}
              whileHover={{ y: -8, transition: { duration: 0.3 } }}
            >
              <div className="feature-icon"><FiBell /></div>
              <h3>Smart Reminders</h3>
              <p>Never miss a habit with intelligent reminders that adapt to your schedule.</p>
            </motion.div>
            <motion.div
              className="feature-card"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.6 }}
              whileHover={{ y: -8, transition: { duration: 0.3 } }}
            >
              <div className="feature-icon"><FiTarget /></div>
              <h3>Smart Goals</h3>
              <p>Set realistic goals based on data-driven insights from successful users.</p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* STORY/TIMELINE SECTION */}
      <section className="story-section">
        <div className="story-container">
          <div className="section-header">
            <span className="section-badge">YOUR JOURNEY</span>
            <h2>The transformation happens in steps</h2>
            <p className="section-subtitle">Here's what users experience on their habit-building journey</p>
          </div>

          <div className="timeline">
            <motion.div
              className="timeline-item"
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <div className="timeline-marker"></div>
              <div className="timeline-content">
                <div className="timeline-badge">Day 1</div>
                <h3>The Beginning</h3>
                <p>You create your first habit and join thousands on the same journey. The excitement is real, but so is the uncertainty.</p>
                <div className="mini-streak">
                  <div className="streak-day active"></div>
                  <div className="streak-day"></div>
                  <div className="streak-day"></div>
                  <div className="streak-day"></div>
                  <div className="streak-day"></div>
                </div>
              </div>
            </motion.div>

            <motion.div
              className="timeline-item"
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <div className="timeline-marker"></div>
              <div className="timeline-content">
                <div className="timeline-badge">Week 2-4</div>
                <h3>Building Momentum</h3>
                <p>Your streaks grow. The community celebrates with you. What seemed impossible now feels achievable.</p>
                <div className="mini-streak">
                  <div className="streak-day active"></div>
                  <div className="streak-day active"></div>
                  <div className="streak-day"></div>
                  <div className="streak-day"></div>
                  <div className="streak-day"></div>
                </div>
              </div>
            </motion.div>

            <motion.div
              className="timeline-item"
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              <div className="timeline-marker"></div>
              <div className="timeline-content">
                <div className="timeline-badge">Month 2-3</div>
                <h3>Overcoming Challenges</h3>
                <p>Life happens. You miss a day. But the community's there, and our smart recovery system helps you bounce back stronger.</p>
                <div className="mini-streak">
                  <div className="streak-day active"></div>
                  <div className="streak-day active"></div>
                  <div className="streak-day active"></div>
                  <div className="streak-day"></div>
                  <div className="streak-day"></div>
                </div>
              </div>
            </motion.div>

            <motion.div
              className="timeline-item"
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <div className="timeline-marker"></div>
              <div className="timeline-content">
                <div className="timeline-badge">Month 4-6</div>
                <h3>Transformation</h3>
                <p>It's not willpower anymore—it's who you are. You're inspiring others, achieving goals, and building the life you dreamed of.</p>
                <div className="mini-streak">
                  <div className="streak-day active"></div>
                  <div className="streak-day active"></div>
                  <div className="streak-day active"></div>
                  <div className="streak-day active"></div>
                  <div className="streak-day"></div>
                </div>
              </div>
            </motion.div>

            <motion.div
              className="timeline-item"
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.5 }}
            >
              <div className="timeline-marker"></div>
              <div className="timeline-content">
                <div className="timeline-badge">6+ Months</div>
                <h3>Mastery & Beyond</h3>
                <p>You've become the best version of yourself. Your habits are automatic, your goals are exceeded, and you're leading others on their journey.</p>
                <div className="mini-streak">
                  <div className="streak-day active"></div>
                  <div className="streak-day active"></div>
                  <div className="streak-day active"></div>
                  <div className="streak-day active"></div>
                  <div className="streak-day active"></div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* SOCIAL PROOF SECTION */}
      <section className="social-proof-section">
        <div className="proof-container">
          <div className="section-header">
            <span className="section-badge">COMMUNITY</span>
            <h2>You're not alone on this journey</h2>
            <p className="section-subtitle">Join thousands building better habits right now</p>
          </div>

          {/* Live Activity Feed */}
          <motion.div
            className="live-feed"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="feed-header">
              <FiActivity className="pulse-icon" />
              <span>Live Activity</span>
            </div>
            <div className="feed-items">
              {recentActivities.length > 0 ? (
                recentActivities.map((activity, index) => {
                  const author = activity.userId || activity.User;
                  const habit = activity.habitId || activity.Habit;
                  const timeAgo = () => {
                    const seconds = Math.floor((new Date() - new Date(activity.createdAt)) / 1000);
                    if (seconds < 60) return `${seconds}s ago`;
                    const minutes = Math.floor(seconds / 60);
                    if (minutes < 60) return `${minutes}m ago`;
                    const hours = Math.floor(minutes / 60);
                    if (hours < 24) return `${hours}h ago`;
                    return `${Math.floor(hours / 24)}d ago`;
                  };

                  const getInitials = (name) => {
                    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
                  };

                  return (
                    <motion.div
                      key={activity.id}
                      className="feed-item"
                      animate={{ opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 3, repeat: Infinity, delay: index * 0.5 }}
                    >
                      <div className="feed-avatar">{getInitials(author?.username || 'User')}</div>
                      <div className="feed-content">
                        <span className="feed-name">{author?.username || 'Anonymous'}</span>
                        <span className="feed-action">{activity.content} {habit ? `on "${habit.habitTitle}"` : ''}</span>
                      </div>
                      <span className="feed-time">{timeAgo()}</span>
                    </motion.div>
                  );
                })
              ) : (
                <div className="feed-empty">No recent activity yet. Be the first to share your progress!</div>
              )}
            </div>
          </motion.div>

          {/* Testimonials Ticker */}
          <motion.div
            className="testimonials-ticker"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className="ticker-track">
              {[
                "Aadat completely transformed how I approach habit building. The streak tracking keeps me motivated every single day!",
                "I went from 0 consistent habits to 5 active streaks in just 3 months. This app is a game changer!",
                "The analytics dashboard shows me exactly what's working. Best feature ever for understanding my patterns!",
                "The community features make accountability fun. I love celebrating wins with others on the platform!",
                "Finally a habit tracker that actually sticks with me. The UI is clean and the features are exactly what I needed."
              ].map((text, index) => (
                <div key={`testimonial-${index}`} className="testimonial-card">
                  <div className="stars">
                    <FiStar className="star-filled" />
                    <FiStar className="star-filled" />
                    <FiStar className="star-filled" />
                    <FiStar className="star-filled" />
                    <FiStar className="star-filled" />
                  </div>
                  <p>"{text}"</p>
                  <span className="author">@{testimonialUsers[index]?.username || 'Loading...'}</span>
                </div>
              ))}
              {/* Duplicate for seamless loop */}
              {[
                "Aadat completely transformed how I approach habit building. The streak tracking keeps me motivated every single day!",
                "I went from 0 consistent habits to 5 active streaks in just 3 months. This app is a game changer!"
              ].map((text, index) => (
                <div key={`testimonial-dup-${index}`} className="testimonial-card">
                  <div className="stars">
                    <FiStar className="star-filled" />
                    <FiStar className="star-filled" />
                    <FiStar className="star-filled" />
                    <FiStar className="star-filled" />
                    <FiStar className="star-filled" />
                  </div>
                  <p>"{text}"</p>
                  <span className="author">@{testimonialUsers[index]?.username || 'Loading...'}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="final-cta-section">
        <motion.div
          className="final-cta-container"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
        >
          <div className="cta-content-new">
            <h2>Start building habits that last</h2>
            <p>Join {stats.totalUsers > 0 && <CountUp end={stats.totalUsers} duration={2} separator="," />}{stats.totalUsers > 0 && '+'} users who've already transformed their lives</p>
          </div>
          <div className="cta-actions-new">
            <Link to="/login" className="btn-primary-new">
              Get started free
              <FiArrowRight />
            </Link>
          </div>
          
        </motion.div>
      </section>

      {/* FOOTER */}
      <footer className="footer-new">
        <div className="footer-container">
          <motion.div
            className="footer-brand"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <div className="brand-footer">Aadat<span className="neon-dot"></span></div>
            <p>Build habits that actually stick</p>
          </motion.div>
          <motion.div
            className="footer-bottom"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <span>© 2025 Aadat. All rights reserved.</span>
          </motion.div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
