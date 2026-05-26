import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { habitsAPI, postsAPI, inviteAPI } from '../services/api';
import Navbar from '../components/Navbar';
import AddHabitModal from '../components/AddHabitModal';
import { Link } from 'react-router-dom';
import { celebrateCheckIn } from '../utils/confetti';
import { motion, AnimatePresence } from 'framer-motion';
import CountUp from 'react-countup';
import { FiPlus, FiCheck, FiX, FiEdit2, FiTrash2, FiMoreVertical, FiArrowRight, FiTrendingUp, FiAward, FiUsers, FiZap, FiMap, FiDownload } from 'react-icons/fi';
import { subscribeToDataChanges } from '../services/socket';
import '../home.css';


const Dashboard = () => {
  const { user, updateUser, fetchUser } = useAuth();
  const [habits, setHabits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [weeklyStats, setWeeklyStats] = useState({
    completedHabits: 0,
    totalCheckins: 0,
    successRate: 0
  });

  const [showCheckinModal, setShowCheckinModal] = useState(false);
  const [showAddHabitModal, setShowAddHabitModal] = useState(false);
  const [currentHabit, setCurrentHabit] = useState(null);
  const [checkinContent, setCheckinContent] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [settingsMenuOpen, setSettingsMenuOpen] = useState(null);
  const [showEditHabitModal, setShowEditHabitModal] = useState(false);
  const [editHabit, setEditHabit] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [habitToDelete, setHabitToDelete] = useState(null);

  const getHabitId = (habit) => habit?._id?.toString?.() || habit?.id?.toString?.() || habit?.id || habit?._id;
  const getUserId = (targetUser) => targetUser?.id || targetUser?._id;

  // Ensure user is loaded after OAuth login
  useEffect(() => {
    if (!user) {
      fetchUser();
    }
  }, [user, fetchUser]);

  useEffect(() => {
    fetchHabits();
    fetchWeeklyStats();
  }, []);

  useEffect(() => {
    const currentUserId = getUserId(user);
    const unsubscribe = subscribeToDataChanges((event) => {
      if (!event?.scope) return;

      const isCurrentUserEvent = !event.userId || 
                                 String(event.userId) === String(currentUserId) || 
                                 (event.targetUserId && String(event.targetUserId) === String(currentUserId));
      if (!isCurrentUserEvent) return;

      if (['posts', 'likes', 'habits', 'dashboard', 'notifications'].includes(event.scope)) {
        fetchHabits();
        fetchWeeklyStats();
        fetchUser();
      }
    });

    return unsubscribe;
  }, [user, fetchUser]);

  const fetchHabits = async () => {
    try {
      const response = await habitsAPI.getAll();
      console.log('📋 Fetched habits:', response.data.map(h => ({ 
        id: getHabitId(h), 
        title: h.habitTitle, 
        hasRoadmap: !!h.roadmap,
        roadmapLength: h.roadmap ? (Array.isArray(h.roadmap) ? h.roadmap.length : 'not array') : 0
      })));
      setHabits(response.data);
    } catch (error) {
      console.error('Failed to fetch habits:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchWeeklyStats = async () => {
    try {
      const currentUserId = getUserId(user);
      if (!currentUserId) {
        console.warn('User not loaded yet, skipping weekly stats fetch');
        return;
      }

      const response = await postsAPI.getAll();
      const posts = response.data;

      // Get posts from the last 7 days
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      const weeklyPosts = posts.filter(post => {
        const postUserId = typeof post.userId === 'object'
          ? (post.userId?._id || post.userId?.id || post.userId)
          : post.userId;
        return new Date(post.createdAt) >= oneWeekAgo && String(postUserId) === String(currentUserId);
      });

      // Calculate unique habits completed this week
      const uniqueHabits = new Set(weeklyPosts.map(post => String(post.habitId?._id || post.habitId?.id || post.habitId)));
      const totalHabits = habits.length;
      // If we don't yet know the user's habits, avoid reporting >100%.
      // When totalHabits is 0 (no habits), successRate should be 0.
      const successRate = totalHabits > 0 ? Math.min(100, Math.round((uniqueHabits.size / totalHabits) * 100)) : 0;

      setWeeklyStats({
        completedHabits: uniqueHabits.size,
        totalCheckins: weeklyPosts.length,
        successRate: isNaN(successRate) ? 0 : successRate
      });
    } catch (error) {
      console.error('Failed to fetch weekly stats:', error);
    }
  };

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  const openCheckinModal = (habit) => {
    setCurrentHabit(habit);
    setShowCheckinModal(true);
    setCheckinContent('');
    setSelectedFile(null);
    setFilePreview(null);
  };

  const handleCheckin = async () => {
    if (!checkinContent.trim()) {
      showToast('Please write something', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('content', checkinContent);
      formData.append('habitId', getHabitId(currentHabit));
      if (selectedFile) {
        formData.append('media', selectedFile);
      }

      await postsAPI.create(formData);
      setShowCheckinModal(false);
      setSelectedFile(null);
      setFilePreview(null);
      celebrateCheckIn(); // Trigger celebration animation
      showToast('Check-in successful! 🎉');
      fetchHabits();
      await fetchUser();
      fetchWeeklyStats();
    } catch (error) {
      const errorMsg = error.response?.data?.msg || 'Failed to post check-in';
      showToast(errorMsg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleHabitSuccess = () => {
    showToast('Habit added successfully! 💪');
    fetchHabits();
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) {
      showToast('Please enter an email address', 'error');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(inviteEmail.trim())) {
      showToast('Please enter a valid email address', 'error');
      return;
    }

    try {
      const response = await inviteAPI.sendInvite(inviteEmail);
      const data = response.data;
      setInviteEmail('');

      // Check if email was actually sent or if we got a fallback link
      if (data.inviteLink) {
        // Email service not available - copy link to clipboard
        try {
          await navigator.clipboard.writeText(data.inviteLink);
          showToast(`${data.message} (Link copied! 📋)`);
        } catch (clipboardError) {
          // Clipboard failed - show link in toast
          showToast(`${data.message}: ${data.inviteLink}`);
        }
      } else if (data.emailSent) {
        // Email successfully sent
        showToast(data.message || 'Invitation email sent successfully! 📧');
      } else {
        // Generic success
        showToast(data.message || 'Invitation processed! ✨');
      }
    } catch (error) {
      const errorMsg = error.response?.data?.msg || 'Failed to send invitation';
      showToast(errorMsg, 'error');
    }
  };

  const openDeleteModal = (habit) => {
    setHabitToDelete(habit);
    setShowDeleteModal(true);
    setSettingsMenuOpen(null);
  };

  const handleDeleteHabit = async () => {
    if (!habitToDelete) return;

    try {
      await habitsAPI.delete(getHabitId(habitToDelete));
      // Remove roadmap progress from localStorage
      localStorage.removeItem(`roadmap_progress_${getHabitId(habitToDelete)}`);
      setShowDeleteModal(false);
      setHabitToDelete(null);
      showToast('Habit deleted successfully');
      fetchHabits();
    } catch (error) {
      showToast('Failed to delete habit', 'error');
    }
  };

  const openEditModal = (habit) => {
    setEditHabit({ habitTitle: habit.habitTitle, habitCategory: habit.habitCategory || '', id: getHabitId(habit) });
    setShowEditHabitModal(true);
    setSettingsMenuOpen(null);
  };

  const handleEditHabit = async (e) => {
    e.preventDefault();
    if (!editHabit.habitTitle.trim()) {
      showToast('Habit title is required', 'error');
      return;
    }

    try {
      await habitsAPI.update(getHabitId(editHabit), {
        habitTitle: editHabit.habitTitle,
        habitCategory: editHabit.habitCategory
      });
      setShowEditHabitModal(false);
      setEditHabit(null);
      showToast('Habit updated successfully! ✏️');
      fetchHabits();
    } catch (error) {
      showToast('Failed to update habit', 'error');
    }
  };

  const toggleSettingsMenu = (habitId) => {
    setSettingsMenuOpen(settingsMenuOpen === habitId ? null : habitId);
  };

  const handleExportCSV = async () => {
    try {
      const response = await habitsAPI.exportCSV();
      const url = URL.createObjectURL(new Blob([response.data], { type: 'text/csv' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'my_habits.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('Habits exported successfully! 📥');
    } catch (error) {
      showToast('Failed to export habits', 'error');
    }
  };

  // Close settings menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setSettingsMenuOpen(null);
    if (settingsMenuOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [settingsMenuOpen]);

  const maxStreak = habits.length > 0 ? Math.max(...habits.map(h => h.currentStreak || 0)) : 0;

  const getXpThresholds = (level) => {
    const thresholds = [0, 80, 200, 400, 800, 1600, 3200, 6400, 12800, 25600];
    if (level <= 9) {
      return {
        baseXp: thresholds[level - 1],
        nextXp: thresholds[level]
      };
    }
    const extraLevels = level - 9;
    return {
      baseXp: 25600 + (extraLevels - 1) * 51200,
      nextXp: 25600 + extraLevels * 51200
    };
  };

  const currentLevel = user?.user_level || 1;
  const { baseXp, nextXp } = getXpThresholds(currentLevel);
  const xpInCurrentLevel = user ? (user.user_xp - baseXp) : 0;
  const xpNeededForNextLevel = nextXp - baseXp;
  const xpPercentage = Math.min(100, Math.max(0, (xpInCurrentLevel / xpNeededForNextLevel) * 100));
  // Avatar rendering: show image if URL, emoji/text otherwise
  const getAvatarElement = () => {
    if (!user?.avatar) return '👤';
    if (typeof user.avatar === 'string' && user.avatar.startsWith('http')) {
      return (
        <img
          src={user.avatar}
          alt={user.username || 'avatar'}
          style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', background: '#222' }}
        />
      );
    }
    return user.avatar;
  };


  if (loading || !user) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div>
      <Navbar />

      <main className="main-container">
        <div className="content-wrapper">
          {/* Left Column - Main Content */}
          <div className="main-column">
            {/* Mobile-only Profile & Streak Combined Card */}
            <div className="profile-card mobile-only" style={{ padding: '24px', marginBottom: '16px' }}>
              <div className="profile-header" style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
                <div className="avatar-ring-wrapper">
                  <div className="avatar-ring-outer">
                    <div className="avatar-ring-inner">
                      <div className="avatar-circle" style={{ width: '60px', height: '60px', borderRadius: '50%', border: 'none' }}>{getAvatarElement()}</div>
                    </div>
                  </div>
                </div>
                <div className="profile-info" style={{ textAlign: 'left' }}>
                  <h3 className="profile-name" style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: 'var(--white)' }}>{user?.username}</h3>
                  {(() => {
                    let lvlName = 'Novice Builder';
                    if (currentLevel >= 3 && currentLevel < 6) lvlName = 'Habit Pioneer';
                    else if (currentLevel >= 6 && currentLevel < 10) lvlName = 'Consistency Sage';
                    else if (currentLevel >= 10) lvlName = 'Habit Overlord';
                    return <span style={{ fontSize: '11px', color: 'var(--neon)', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.05em' }}>{lvlName}</span>;
                  })()}
                  <div style={{ marginTop: '4px' }}>
                    <Link to={`/profile/${getUserId(user)}`} className="view-profile-link" style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>View profile →</Link>
                  </div>
                </div>
              </div>

              {/* Combined Day Streak Pill */}
              <div className="profile-streak-badge" style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                background: 'rgba(255, 100, 0, 0.1)',
                border: '1px solid rgba(255, 100, 0, 0.25)',
                borderRadius: '10px',
                padding: '10px 14px',
                marginBottom: '16px',
                color: '#ff9800',
                fontWeight: '800',
                fontSize: '14px',
                letterSpacing: '0.05em'
              }}>
                🔥 {maxStreak} DAY STREAK
              </div>

              <div className="level-section" style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.03)', marginBottom: '16px' }}>
                <div className="level-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
                  <span className="level-text" style={{ fontWeight: '700', color: 'var(--white)' }}>Rank Level {user?.user_level || 1}</span>
                  <span className="xp-count" style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>{user?.user_xp || 0} / {nextXp} XP</span>
                </div>
                <div className="progress-bar-container" style={{ height: '8px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '999px', overflow: 'hidden' }}>
                  <div className="progress-bar" style={{ width: `${xpPercentage}%`, height: '100%', background: 'linear-gradient(90deg, var(--neon) 0%, #00bfa5 100%)', boxShadow: 'var(--neon-glow)' }}></div>
                </div>
              </div>

              <div className="achievements-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                <div className="achievement-item unlocked" style={{ background: 'rgba(255, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.1)' }} title="Fire Gold Check-in">
                  <span className="achievement-icon">🔥</span>
                </div>
                <div className="achievement-item unlocked" style={{ background: 'rgba(0, 245, 160, 0.05)', border: '1px solid rgba(0, 245, 160, 0.1)' }} title="Social Butterfly">
                  <span className="achievement-icon">🦋</span>
                </div>
                <div className="achievement-item locked" title="Unlock more in your journey!">
                  <span className="achievement-icon">🔒</span>
                </div>
                <div className="achievement-item locked" title="Unlock more in your journey!">
                  <span className="achievement-icon">🏆</span>
                </div>
              </div>
            </div>

            {/* Today's Habits */}
            <section className="habits-section">
              <div className="section-header" style={{ 
                marginBottom: '2rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start'
              }}>
                <div style={{ textAlign: 'left' }}>
                  <h2 style={{ 
                    fontSize: '2rem', 
                    fontWeight: '900', 
                    marginBottom: '0.5rem',
                    letterSpacing: '-0.02em',
                    color: 'var(--white)'
                  }}>
                    Today's Habits
                  </h2>
                  <p className="section-subtitle" style={{ 
                    color: 'var(--gray-400)', 
                    fontSize: '0.95rem',
                    fontWeight: '400'
                  }}>
                    {habits.length === 0 ? 'Start tracking your daily habits' : 'Keep your momentum going'}
                  </p>
                </div>
                <motion.button
                  onClick={() => setShowAddHabitModal(true)}
                  className="btn-add"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <FiPlus />
                  Add Habit
                </motion.button>
              </div>

              <div className="habit-list">
                {habits.length === 0 ? (
                  <motion.div
                    className="empty-state-habits"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '4rem 2rem',
                      textAlign: 'center',
                      minHeight: '300px'
                    }}
                  >
                    <div style={{ 
                      fontSize: '64px', 
                      marginBottom: '1.5rem',
                      opacity: 0.6,
                      lineHeight: 1
                    }}>
                      ✨
                    </div>
                    <h3 style={{ 
                      fontSize: '1.5rem', 
                      fontWeight: '700', 
                      marginBottom: '0.75rem',
                      color: 'var(--white)'
                    }}>
                      No habits yet
                    </h3>
                    <p style={{ 
                      color: 'var(--gray-400)', 
                      fontSize: '0.95rem',
                      lineHeight: '1.6',
                      maxWidth: '420px',
                      margin: '0 auto'
                    }}>
                      Ready to start your journey? Click the <strong style={{ color: 'var(--neon)' }}>Add Habit</strong> button above to create your first habit and begin building consistency.
                    </p>
                  </motion.div>
                ) : (
                  habits.map((habit, index) => {
                    const habitId = getHabitId(habit);
                    const lastCheckin = habit.lastCheckinDate ? new Date(habit.lastCheckinDate) : null;
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const lastCheckinDate = lastCheckin ? new Date(lastCheckin) : null;
                    if (lastCheckinDate) lastCheckinDate.setHours(0, 0, 0, 0);

                    const isCheckedInToday = lastCheckinDate && lastCheckinDate.getTime() === today.getTime();
                    const daysSinceLastCheckin = lastCheckin ? Math.floor((Date.now() - lastCheckin) / (1000 * 60 * 60 * 24)) : null;

                    return (
                      <motion.div
                        key={habitId}
                        className={`habit-item ${(() => {
                          const categoryLower = (habit.habitCategory || '').toLowerCase();
                          if (categoryLower.includes('health') || categoryLower.includes('mind') || categoryLower.includes('spirit') || categoryLower.includes('meditat')) {
                            return 'habit-quest-violet';
                          } else if (categoryLower.includes('fit') || categoryLower.includes('sport') || categoryLower.includes('gym') || categoryLower.includes('run') || categoryLower.includes('work')) {
                            return 'habit-quest-orange';
                          }
                          return 'habit-quest-cyan';
                        })()}`}
                        style={{ zIndex: settingsMenuOpen === habitId ? 50 : 1, position: 'relative' }}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: index * 0.1 }}
                        whileHover={{ y: -4, transition: { duration: 0.2 } }}
                      >
                        <div className="habit-item-header">
                          <div className="habit-main-info" style={{ textAlign: 'left' }}>
                            <div className="habit-title-row" style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                              <span className="habit-title" style={{ fontSize: '18px', fontWeight: '700', color: 'var(--white)' }}>{habit.habitTitle}</span>
                              {habit.habitCategory && (
                                <span className="habit-category-badge" style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: '600' }}>{habit.habitCategory}</span>
                              )}
                            </div>
                            {lastCheckin && (
                              <span className="last-checkin-text" style={{ fontSize: '12px', marginTop: '6px', display: 'block' }}>
                                {isCheckedInToday ? '⚡ Checked in today' :
                                  daysSinceLastCheckin === 1 ? '⏰ Last check-in: Yesterday' :
                                    `📅 Last check-in: ${daysSinceLastCheckin} days ago`}
                              </span>
                            )}
                            <div className="habit-mini-progress">
                              {[1, 2, 3, 4, 5].map((dot, i) => {
                                const isActive = isCheckedInToday ? (i < Math.min(5, habit.currentStreak || 1)) : (i < Math.min(5, habit.currentStreak));
                                return (
                                  <div 
                                    key={dot} 
                                    className={`progress-dot ${isActive ? 'active' : ''}`}
                                    title={`${habit.currentStreak} day streak`}
                                  />
                                );
                              })}
                            </div>
                          </div>
                        </div>

                        <div className="habit-item-footer">
                          <span className="streak-count" style={{ fontSize: '15px', fontWeight: '700', color: 'var(--white)', whiteSpace: 'nowrap' }}>🔥 {habit.currentStreak} days</span>
                          <div className="habit-actions">
                            {((Array.isArray(habit.roadmap) && habit.roadmap.length > 0) || (!Array.isArray(habit.roadmap) && habit.roadmap)) && (
                              <Link 
                                to={`/roadmap/${habitId}`} 
                                className="btn btn-secondary btn-roadmap"
                                onClick={(e) => e.stopPropagation()}
                                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', fontSize: '13px' }}
                              >
                                <FiMap /> Roadmap
                              </Link>
                            )}
                            <button
                              className={`btn btn-primary btn-checkin ${isCheckedInToday ? 'checked-in' : ''}`}
                              onClick={() => openCheckinModal(habit)}
                              disabled={isCheckedInToday}
                              style={{ padding: '8px 20px', fontSize: '13px', borderRadius: '8px' }}
                            >
                              {isCheckedInToday ? (
                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><FiCheck /> Done</span>
                              ) : (
                                'Check In'
                              )}
                            </button>
                          </div>
                          
                          <div className="habit-settings" onClick={(e) => e.stopPropagation()}>
                            <button
                              className="settings-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleSettingsMenu(habitId);
                              }}
                            >
                              <FiMoreVertical />
                            </button>
                            <AnimatePresence>
                              {settingsMenuOpen === habitId && (
                                <motion.div
                                  className="settings-menu"
                                  initial={{ opacity: 0, scale: 0.9, y: -10 }}
                                  animate={{ opacity: 1, scale: 1, y: 0 }}
                                  exit={{ opacity: 0, scale: 0.9, y: -10 }}
                                  transition={{ duration: 0.2 }}
                                >
                                  <button
                                    className="settings-menu-item"
                                    onClick={() => openEditModal(habit)}
                                  >
                                    <FiEdit2 />
                                    Edit Habit
                                  </button>
                                  <button
                                    className="settings-menu-item delete"
                                    onClick={() => openDeleteModal(habit)}
                                  >
                                    <FiTrash2 />
                                    Delete Habit
                                  </button>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </div>
            </section>

            {/* Mobile-only Consistency Plant (Moved under habits) */}
            {(() => {
              let plantEmoji = '🌱';
              let stageName = 'Seedling';
              let nextStageText = 'Keep a 3-day streak to grow into a Sapling!';
              if (maxStreak >= 3 && maxStreak < 7) {
                plantEmoji = '🌿';
                stageName = 'Sapling';
                nextStageText = 'Reach a 7-day streak to grow into a Sprout!';
              } else if (maxStreak >= 7 && maxStreak < 15) {
                plantEmoji = '🎋';
                stageName = 'Sprout';
                nextStageText = 'Maintain a 15-day streak to grow into a Blossom!';
              } else if (maxStreak >= 15) {
                plantEmoji = '🌸';
                stageName = 'Blossom';
                nextStageText = 'Maximum growth stage! You are a master gardener!';
              }

              return (
                <div className="plant-card mobile-only" style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div className="plant-emoji-container">{plantEmoji}</div>
                    <div className="plant-content" style={{ textAlign: 'left' }}>
                      <h4 style={{ margin: 0, fontSize: '16px', color: 'var(--white)' }}>{stageName} Stage</h4>
                      <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--gray-300)' }}>
                        Maintained a <strong>{maxStreak}-day</strong> streak!
                      </p>
                    </div>
                  </div>
                  <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '10px', fontSize: '11px', color: 'var(--text-secondary)', textAlign: 'left' }}>
                    💡 {nextStageText}
                  </div>
                </div>
              );
            })()}

            {/* Mobile-only Stats Card */}
            <motion.div
              className="stats-card mobile-only"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              style={{ marginBottom: '16px' }}
            >
              <h4>This Week's Progress</h4>
              <div className="stat-row">
                <span className="stat-label">Habits worked on</span>
                <span className="stat-value"><CountUp end={weeklyStats.completedHabits} duration={1.5} /></span>
              </div>
              <div className="stat-row">
                <span className="stat-label">Total check-ins</span>
                <span className="stat-value"><CountUp end={weeklyStats.totalCheckins} duration={1.5} /></span>
              </div>
              <div className="stat-row">
                <span className="stat-label">Consistency rate</span>
                <span className="stat-value neon"><CountUp end={weeklyStats.successRate} duration={1.5} />%</span>
              </div>
            </motion.div>

            {/* Quick Actions Grid */}
            <section className="quick-actions-section">
              <h2>Quick Actions</h2>
              <div className="actions-grid">
                <motion.a
                  href="/community"
                  className="action-card"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: 0.1 }}
                  whileHover={{ y: -4, transition: { duration: 0.2 } }}
                >
                  <div className="action-icon"><FiUsers /></div>
                  <div className="action-content">
                    <h3>Join Community</h3>
                    <p>Connect with others building similar habits</p>
                  </div>
                  <FiArrowRight className="action-arrow" />
                </motion.a>

                <motion.a
                  href="/leaderboard"
                  className="action-card"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: 0.2 }}
                  whileHover={{ y: -4, transition: { duration: 0.2 } }}
                >
                  <div className="action-icon"><FiAward /></div>
                  <div className="action-content">
                    <h3>View Leaderboard</h3>
                    <p>See how you rank against other members</p>
                  </div>
                  <FiArrowRight className="action-arrow" />
                </motion.a>

                <motion.div
                  className="action-card"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: 0.3 }}
                  whileHover={{ y: -4, transition: { duration: 0.2 } }}
                >
                  <div className="action-icon"><FiZap /></div>
                  <div className="action-content">
                    <h3>30-Day Challenge</h3>
                    <p>Commit to building consistency for 30 days</p>
                  </div>
                  <FiArrowRight className="action-arrow" />
                </motion.div>

                <motion.div
                  className="action-card"
                  onClick={handleExportCSV}
                  style={{ cursor: 'pointer' }}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: 0.4 }}
                  whileHover={{ y: -4, transition: { duration: 0.2 } }}
                >
                  <div className="action-icon"><FiDownload /></div>
                  <div className="action-content">
                    <h3>Export Habits</h3>
                    <p>Download your habits as a CSV file</p>
                  </div>
                  <FiArrowRight className="action-arrow" />
                </motion.div>
              </div>
            </section>

            {/* Invite Section */}
            <section className="invite-section">
              <div className="invite-content">
                <div className="invite-icon">💌</div>
                <div className="invite-text">
                  <h3>Invite Friends</h3>
                  <p>Help your friends build better habits. Share Aadat with them.</p>
                </div>
              </div>
              <div className="invite-form">
                <input
                  type="email"
                  placeholder="friend@example.com"
                  className="invite-input"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleInvite()}
                />
                <button onClick={handleInvite} className="btn-invite">Send Invite</button>
              </div>
            </section>
          </div>

          {/* Right Column - Sidebar */}
          <aside className="sidebar">
            {/* Profile Card */}
            <div className="profile-card desktop-only" style={{ padding: '24px' }}>
              <div className="profile-header" style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
                <div className="avatar-ring-wrapper">
                  <div className="avatar-ring-outer">
                    <div className="avatar-ring-inner">
                      <div className="avatar-circle" style={{ width: '60px', height: '60px', borderRadius: '50%', border: 'none' }}>{getAvatarElement()}</div>
                    </div>
                  </div>
                </div>
                <div className="profile-info" style={{ textAlign: 'left' }}>
                  <h3 className="profile-name" style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: 'var(--white)' }}>{user?.username}</h3>
                  {(() => {
                    let lvlName = 'Novice Builder';
                    if (currentLevel >= 3 && currentLevel < 6) lvlName = 'Habit Pioneer';
                    else if (currentLevel >= 6 && currentLevel < 10) lvlName = 'Consistency Sage';
                    else if (currentLevel >= 10) lvlName = 'Habit Overlord';
                    return <span style={{ fontSize: '11px', color: 'var(--neon)', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.05em' }}>{lvlName}</span>;
                  })()}
                  <div style={{ marginTop: '4px' }}>
                    <Link to={`/profile/${getUserId(user)}`} className="view-profile-link" style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>View profile →</Link>
                  </div>
                </div>
              </div>

              {/* Combined Day Streak Pill */}
              <div className="profile-streak-badge" style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                background: 'rgba(255, 100, 0, 0.1)',
                border: '1px solid rgba(255, 100, 0, 0.25)',
                borderRadius: '10px',
                padding: '10px 14px',
                marginBottom: '16px',
                color: '#ff9800',
                fontWeight: '800',
                fontSize: '14px',
                letterSpacing: '0.05em'
              }}>
                🔥 {maxStreak} DAY STREAK
              </div>

              <div className="level-section" style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.03)', marginBottom: '16px' }}>
                <div className="level-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
                  <span className="level-text" style={{ fontWeight: '700', color: 'var(--white)' }}>Rank Level {user?.user_level || 1}</span>
                  <span className="xp-count" style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>{user?.user_xp || 0} / {nextXp} XP</span>
                </div>
                <div className="progress-bar-container" style={{ height: '8px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '999px', overflow: 'hidden' }}>
                  <div className="progress-bar" style={{ width: `${xpPercentage}%`, height: '100%', background: 'linear-gradient(90deg, var(--neon) 0%, #00bfa5 100%)', boxShadow: 'var(--neon-glow)' }}></div>
                </div>
              </div>

              <div className="achievements-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                <div className="achievement-item unlocked" style={{ background: 'rgba(255, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.1)' }} title="Fire Gold Check-in">
                  <span className="achievement-icon">🔥</span>
                </div>
                <div className="achievement-item unlocked" style={{ background: 'rgba(0, 245, 160, 0.05)', border: '1px solid rgba(0, 245, 160, 0.1)' }} title="Social Butterfly">
                  <span className="achievement-icon">🦋</span>
                </div>
                <div className="achievement-item locked" title="Unlock more in your journey!">
                  <span className="achievement-icon">🔒</span>
                </div>
                <div className="achievement-item locked" title="Unlock more in your journey!">
                  <span className="achievement-icon">🏆</span>
                </div>
              </div>
            </div>

            {/* Consistency Plant */}
            {(() => {
              let plantEmoji = '🌱';
              let stageName = 'Seedling';
              let nextStageText = 'Keep a 3-day streak to grow into a Sapling!';
              if (maxStreak >= 3 && maxStreak < 7) {
                plantEmoji = '🌿';
                stageName = 'Sapling';
                nextStageText = 'Reach a 7-day streak to grow into a Sprout!';
              } else if (maxStreak >= 7 && maxStreak < 15) {
                plantEmoji = '🎋';
                stageName = 'Sprout';
                nextStageText = 'Maintain a 15-day streak to grow into a Blossom!';
              } else if (maxStreak >= 15) {
                plantEmoji = '🌸';
                stageName = 'Blossom';
                nextStageText = 'Maximum growth stage! You are a master gardener!';
              }

              return (
                <div className="plant-card desktop-only" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div className="plant-emoji-container">{plantEmoji}</div>
                    <div className="plant-content" style={{ textAlign: 'left' }}>
                      <h4 style={{ margin: 0, fontSize: '16px', color: 'var(--white)' }}>{stageName} Stage</h4>
                      <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--gray-300)' }}>
                        Maintained a <strong>{maxStreak}-day</strong> streak!
                      </p>
                    </div>
                  </div>
                  <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '10px', fontSize: '11px', color: 'var(--text-secondary)', textAlign: 'left' }}>
                    💡 {nextStageText}
                  </div>
                </div>
              );
            })()}

            {/* Quick Stats */}
            <motion.div
              className="stats-card desktop-only"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <h4>This Week's Progress</h4>
              <div className="stat-row">
                <span className="stat-label">Habits worked on</span>
                <span className="stat-value"><CountUp end={weeklyStats.completedHabits} duration={1.5} /></span>
              </div>
              <div className="stat-row">
                <span className="stat-label">Total check-ins</span>
                <span className="stat-value"><CountUp end={weeklyStats.totalCheckins} duration={1.5} /></span>
              </div>
              <div className="stat-row">
                <span className="stat-label">Consistency rate</span>
                <span className="stat-value neon"><CountUp end={weeklyStats.successRate} duration={1.5} />%</span>
              </div>
            </motion.div>
          </aside>
        </div >
      </main >

      {/* Check-in Modal */}
      {
        showCheckinModal && (
          <div className="modal-overlay open" onClick={() => setShowCheckinModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Check-in: {currentHabit?.habitTitle}</h2>
                <button onClick={() => setShowCheckinModal(false)} className="modal-close">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
              <div className="modal-body">
                <label htmlFor="modal-textarea">What did you accomplish today?</label>
                <textarea
                  id="modal-textarea"
                  placeholder="Share your progress..."
                  value={checkinContent}
                  onChange={(e) => setCheckinContent(e.target.value)}
                  maxLength={280}
                />
                <div className="char-counter-wrapper" style={{ marginBottom: '16px' }}>
                  <span className="char-counter">{280 - checkinContent.length}</span>
                </div>

                {/* Media upload input and preview */}
                <div className="media-upload-container" style={{
                  border: '1px dashed var(--border-color)',
                  borderRadius: '8px',
                  padding: '16px',
                  textAlign: 'center',
                  background: 'var(--bg-secondary)',
                  cursor: 'pointer',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  {filePreview ? (
                    <div style={{ position: 'relative' }}>
                      {selectedFile?.type?.startsWith('video') ? (
                        <video src={filePreview} controls style={{ width: '100%', maxHeight: '180px', borderRadius: '6px' }} />
                      ) : (
                        <img src={filePreview} alt="Preview" style={{ width: '100%', maxHeight: '180px', objectFit: 'cover', borderRadius: '6px' }} />
                      )}
                      <button 
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedFile(null);
                          setFilePreview(null);
                        }}
                        style={{
                          position: 'absolute',
                          top: '8px',
                          right: '8px',
                          background: 'rgba(0,0,0,0.7)',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '50%',
                          width: '28px',
                          height: '28px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 'bold',
                          zIndex: 10
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <label style={{ cursor: 'pointer', display: 'block', margin: 0 }}>
                      <span style={{ fontSize: '24px', display: 'block', marginBottom: '8px' }}>📷</span>
                      <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Upload Photo or Video (Optional)</span>
                      <input 
                        type="file" 
                        accept="image/*,video/*" 
                        onChange={(e) => {
                          const file = e.target.files[0];
                          if (file) {
                            setSelectedFile(file);
                            setFilePreview(URL.createObjectURL(file));
                          }
                        }}
                        style={{ display: 'none' }}
                      />
                    </label>
                  )}
                </div>
              </div>
              <div className="modal-footer">
                <button onClick={() => setShowCheckinModal(false)} className="btn-secondary">Cancel</button>
                <button 
                  onClick={handleCheckin} 
                  className="btn-primary" 
                  disabled={submitting}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    opacity: submitting ? 0.7 : 1,
                    cursor: submitting ? 'not-allowed' : 'pointer'
                  }}
                >
                  {submitting ? (
                    <>
                      <div className="loading-spinner-btn" style={{
                        width: '16px',
                        height: '16px',
                        border: '2px solid rgba(255,255,255,0.3)',
                        borderTopColor: '#fff',
                        borderRadius: '50%',
                        animation: 'spin 0.6s linear infinite'
                      }}></div>
                      <span>Posting...</span>
                    </>
                  ) : (
                    'Post Check-in'
                  )}
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* Add Habit Modal */}
      <AddHabitModal 
        isOpen={showAddHabitModal} 
        onClose={() => setShowAddHabitModal(false)}
        onSuccess={handleHabitSuccess}
      />

      {/* Edit Habit Modal */}
      {
        showEditHabitModal && editHabit && (
          <div className="modal-overlay open" onClick={() => setShowEditHabitModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Edit Habit</h2>
                <button onClick={() => setShowEditHabitModal(false)} className="modal-close">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
              <form onSubmit={handleEditHabit}>
                <div className="modal-body">
                  <div className="input-group">
                    <label htmlFor="edit-habit-title-input">Habit Title</label>
                    <input
                      type="text"
                      id="edit-habit-title-input"
                      placeholder="e.g., Morning workout"
                      value={editHabit.habitTitle}
                      onChange={(e) => setEditHabit({ ...editHabit, habitTitle: e.target.value })}
                      required
                    />
                  </div>
                  <div className="input-group">
                    <label htmlFor="edit-habit-category-input">Category <span className="optional">(Optional)</span></label>
                    <input
                      type="text"
                      id="edit-habit-category-input"
                      placeholder="e.g., Fitness, Learning"
                      value={editHabit.habitCategory}
                      onChange={(e) => setEditHabit({ ...editHabit, habitCategory: e.target.value })}
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" onClick={() => setShowEditHabitModal(false)} className="btn-secondary">Cancel</button>
                  <button type="submit" className="btn-primary">Update Habit</button>
                </div>
              </form>
            </div>
          </div>
        )
      }

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteModal && habitToDelete && (
          <motion.div
            className="modal-overlay open"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowDeleteModal(false)}
          >
            <motion.div
              className="modal-content"
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: "spring", duration: 0.4 }}
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: '420px' }}
            >
              <div className="modal-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ 
                    width: '48px', 
                    height: '48px', 
                    borderRadius: '12px', 
                    background: 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '24px'
                  }}>
                    🗑️
                  </div>
                  <div>
                    <h2 style={{ marginBottom: '4px' }}>Delete Habit</h2>
                    <p style={{ color: 'var(--gray-400)', fontSize: '0.9rem', margin: 0 }}>
                      This action cannot be undone
                    </p>
                  </div>
                </div>
                <button onClick={() => setShowDeleteModal(false)} className="modal-close">
                  <FiX />
                </button>
              </div>
              <div className="modal-body">
                <div style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '12px',
                  padding: '16px',
                  marginBottom: '16px'
                }}>
                  <p style={{ 
                    color: 'var(--white)', 
                    fontSize: '1rem', 
                    marginBottom: '8px',
                    fontWeight: '600'
                  }}>
                    {habitToDelete.habitTitle}
                  </p>
                  {habitToDelete.habitCategory && (
                    <span style={{
                      fontSize: '0.75rem',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      background: 'rgba(0, 255, 136, 0.15)',
                      color: 'var(--neon)',
                      fontWeight: '600',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      {habitToDelete.habitCategory}
                    </span>
                  )}
                </div>
                <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                  Are you sure you want to delete this habit? All your progress, check-ins, and roadmap data will be permanently removed.
                </p>
              </div>
              <div className="modal-footer" style={{ gap: '12px' }}>
                <button 
                  onClick={() => setShowDeleteModal(false)} 
                  className="btn-secondary"
                  style={{ flex: 1 }}
                >
                  Cancel
                </button>
                <button 
                  onClick={handleDeleteHabit} 
                  className="btn-primary"
                  style={{ 
                    flex: 1,
                    background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                    border: '1px solid rgba(239, 68, 68, 0.3)'
                  }}
                >
                  <FiTrash2 style={{ marginRight: '8px' }} />
                  Delete Habit
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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

      {/* Toast Notification */}
      {
        toast.show && (
          <div className={`toast-notification show ${toast.type === 'error' ? 'toast-error' : ''}`}>
            {toast.message}
          </div>
        )
      }
    </div >
  );
};

export default Dashboard;
