import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { achievementsAPI, postsAPI, authAPI } from '../services/api';
import Navbar from '../components/Navbar';
import { subscribeToDataChanges } from '../services/socket';
import { FiHeart, FiMessageCircle } from 'react-icons/fi';
import { useToast } from '../context/ToastContext';
import HabitHeatmap from '../components/HabitHeatmap';
import '../home.css';

const Profile = () => {
  const { user, logout, updateUser, fetchUser } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const params = useParams();
  const viewingUserId = params.id;
  const getUserId = (targetUser) => targetUser?.id || targetUser?._id;
  const getPostId = (post) => post?.id || post?._id;
  const isOwnProfile = !viewingUserId || String(viewingUserId) === String(getUserId(user));
  const [achievements, setAchievements] = useState([]);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [viewedUser, setViewedUser] = useState(null);
  const [stats, setStats] = useState({
    currentStreak: 0,
    longestStreak: 0,
    completionRate: 0,
    totalHabits: 0,
    totalCheckins: 0
  });
  const [expandedPostId, setExpandedPostId] = useState(null);
  const [commentText, setCommentText] = useState({});
  const [submittingComments, setSubmittingComments] = useState({});

  const avatarOptions = ['👤', '😀', '😎', '🤓', '🥳', '🤠', '🧑‍💻', '🧑‍🎨', '🧑‍🚀', '🧑‍🔬', '🦸', '🧙', '🧚', '🧛', '🐱', '🐶', '🦊', '🐻', '🐼', '🐨', '🦁', '🐯', '🦄', '🐧', '🦉', '🦋', '🌟', '⚡', '🔥', '💎'];

  useEffect(() => {
    // Decide which user's data to load: current user or a public user by id
    const targetId = viewingUserId || getUserId(user);
    if (viewingUserId) {
      fetchViewedUser(viewingUserId);
    } else {
      setViewedUser(null);
    }
    if (targetId) {
      fetchAchievements(targetId);
      fetchPosts(targetId);
      fetchStats(targetId);
    }
  }, [user, viewingUserId]);

  useEffect(() => {
    const targetId = viewingUserId || getUserId(user);
    if (!targetId) return undefined;

    const unsubscribe = subscribeToDataChanges((event) => {
      if (!event?.scope) return;

      const isRelevant = !event.userId || 
                         String(event.userId) === String(targetId) || 
                         (event.targetUserId && String(event.targetUserId) === String(targetId));
      if (!isRelevant) return;

      if (['posts', 'likes', 'habits', 'dashboard', 'profile', 'achievements'].includes(event.scope)) {
        fetchPosts();
        fetchStats(targetId);
        fetchAchievements(targetId);
        if (isOwnProfile && fetchUser) {
          fetchUser();
        }
      }
    });

    return unsubscribe;
  }, [user, viewingUserId, fetchUser, isOwnProfile]);

  const fetchViewedUser = async (id) => {
    try {
      const res = await authAPI.getUserById(id);
      setViewedUser(res.data);
    } catch (err) {
      console.error('Failed to fetch viewed user:', err);
      setViewedUser(null);
    }
  };

  const fetchStats = async (targetId) => {
    try {
      // Use targetId param directly to avoid stale closure issues
      const statsUserId = targetId || (viewingUserId || null);
      const response = await authAPI.getUserStats(statsUserId !== getUserId(user) ? statsUserId : null);
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch user stats:', error);
    }
  };

  const handleCommentSubmit = async (postId) => {
    const text = commentText[postId] || '';
    if (!text.trim()) return;
    setSubmittingComments(prev => ({ ...prev, [postId]: true }));
    try {
      await postsAPI.comment(postId, text);
      setCommentText(prev => ({ ...prev, [postId]: '' }));
      fetchPosts();
    } catch (error) {
      const errorMsg = error.response?.data?.msg || 'Failed to post comment';
      toast.error(errorMsg);
    } finally {
      setSubmittingComments(prev => ({ ...prev, [postId]: false }));
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const fetchAchievements = async (targetId) => {
    try {
      let response;
      if (targetId && viewingUserId) {
        try {
          response = await authAPI.getUserAchievements(targetId);
        } catch (err) {
          response = { data: [] };
        }
      } else {
        response = await authAPI.getAchievements();
      }
      
      setAchievements(response.data || []);
    } catch (error) {
      console.error('Failed to fetch achievements:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPosts = async () => {
    try {
      const targetId = viewingUserId || getUserId(user);
      console.log('Fetching posts for user:', targetId);
      const response = await postsAPI.getUserPosts(targetId);
      console.log('Posts API response:', response);
      console.log('Posts received:', response.data);
      console.log('Number of posts:', response.data?.length || 0);
      
        if (response.data && Array.isArray(response.data)) {
        // Sort posts by creation date (newest first)
        const sortedPosts = response.data.sort((a, b) => 
          new Date(b.createdAt) - new Date(a.createdAt)
        );
        console.log('Sorted posts:', sortedPosts);
        setPosts(sortedPosts);
        // If we're viewing another user's profile but `viewedUser` wasn't set (server fetch may have failed),
        // use the author info attached to posts as a reliable fallback
        const firstPostAuthor = sortedPosts[0]?.userId || sortedPosts[0]?.User;
        if (viewingUserId && !getUserId(viewedUser) && sortedPosts.length > 0 && firstPostAuthor) {
          // Use the author info from the post as an immediate fallback so the UI
          // shows a username/avatar quickly, but then try to fetch the full
          // public profile (which includes `user_xp` and `user_level`) so the
          // Total XP and Level cards show correct values.
          setViewedUser(firstPostAuthor);
          try {
            const fullProfile = await authAPI.getUserById(getUserId(firstPostAuthor));
            if (fullProfile && fullProfile.data) {
              setViewedUser(prev => ({ ...prev, ...fullProfile.data }));
            }
          } catch (e) {
            console.warn('Could not fetch full viewed user profile:', e);
          }
        }
      } else {
        console.warn('Response data is not an array:', response.data);
        setPosts([]);
      }
    } catch (error) {
      console.error('Failed to fetch posts:', error);
      console.error('Error details:', error.response?.data || error.message);
      setPosts([]);
    }
  };

  const handleLike = async (postId) => {
    try {
      await postsAPI.like(postId);
      // Update the post in the local state
      setPosts(posts.map(post => 
        String(getPostId(post)) === String(postId)
          ? { 
              ...post, 
              isLikedByCurrentUser: true,
              likeCount: (post.likeCount || 0) + 1
            }
          : post
      ));
    } catch (error) {
      console.error('Failed to like post:', error);
    }
  };

  // Render avatar: prefer viewed user's avatar when viewing someone else
  const getAvatarElement = (overrideUser) => {
    const targetUser = overrideUser || (isOwnProfile ? user : viewedUser);
    const avatar = targetUser?.avatar;
    if (!avatar) return '👤';
    if (typeof avatar === 'string' && avatar.startsWith('http')) {
      return (
        <img
          src={avatar}
          alt={targetUser?.username || 'avatar'}
          style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', background: '#222' }}
        />
      );
    }
    return avatar;
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleSaveAvatar = async () => {
    try {
      const response = await authAPI.updateProfile({ avatar: selectedAvatar });
      updateUser(response.data);
      setShowAvatarModal(false);
    } catch (error) {
      console.error('Failed to update avatar:', error);
      toast.error('Failed to update avatar');
    }
  };

  const handleSaveBio = async () => {
    try {
      const response = await authAPI.updateProfile({ bio });
      updateUser(response.data);
      setShowBioModal(false);
    } catch (error) {
      console.error('Failed to update bio:', error);
      toast.error('Failed to update bio');
    }
  };

  const getAchievementIcon = (achievement) => {
    // Use icon from database if available, otherwise use default based on name
    if (achievement.icon) {
      return achievement.icon;
    }
    
    const iconMap = {
      'first_post': '✍️',
      'streak_3_day': '🔥',
      'streak_7_day': '🗓️',
      'level_5': '🚀',
    };
    return iconMap[achievement.name] || '🏆';
  };

  if (loading) {
    return (
      <div>
        <Navbar />
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
          <div className="loading-spinner"></div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Navbar />
      
      <main className="main-container">
        <div className="content-wrapper-single">
          {/* Profile Header */}
          <section className="profile-header-section">
            <div className="profile-header-card">
              <div className="profile-avatar-large">
                <div className="avatar-circle-large">{getAvatarElement()}</div>
              </div>
                <div className="profile-header-info">
                <h1 className="profile-username">{isOwnProfile ? (user?.username) : (viewedUser?.username || 'User')}</h1>
                <p className="profile-bio">{isOwnProfile ? (user?.bio || 'Building habits in public.') : (viewedUser?.bio || 'Building habits in public.')}</p>
              </div>
              {isOwnProfile && (
                <div className="profile-settings-container">
                  <button 
                    className="settings-btn" 
                    onClick={() => setShowSettings(!showSettings)}
                  >
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <circle cx="10" cy="4" r="1.5" fill="currentColor"/>
                      <circle cx="10" cy="10" r="1.5" fill="currentColor"/>
                      <circle cx="10" cy="16" r="1.5" fill="currentColor"/>
                    </svg>
                  </button>
                  {showSettings && (
                    <div className="settings-dropdown">
                      <button 
                        className="settings-item" 
                        onClick={() => {
                          setShowSettings(false);
                          navigate('/profile/edit');
                        }}
                      >
                        <span>✏️</span> Edit Profile
                      </button>
                      <button 
                        className="settings-item danger" 
                        onClick={handleLogout}
                      >
                        <span>🚪</span> Logout
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Stats Grid */}
            <div className="profile-stats-grid">
              <div className="profile-stat-card">
                <div className="stat-number">🔥 {stats.currentStreak}</div>
                <div className="stat-label">Current Streak</div>
              </div>
              <div className="profile-stat-card">
                <div className="stat-number">⭐ {stats.longestStreak}</div>
                <div className="stat-label">Longest Streak</div>
              </div>
              <div className="profile-stat-card">
                <div className="stat-number">Level {isOwnProfile ? (user?.user_level || 1) : (viewedUser?.user_level || 1)}</div>
                <div className="stat-label">Current Level</div>
              </div>
              <div className="profile-stat-card">
                <div className="stat-number neon">{isOwnProfile ? (user?.user_xp || 0) : (viewedUser?.user_xp || 0)}</div>
                <div className="stat-label">Total XP</div>
              </div>
              {/* Weekly completion and check-ins removed per request */}
            </div>
          </section>

          {/* Habit Heatmap */}
          <HabitHeatmap userId={viewingUserId || undefined} />

          {/* Achievements Section */}
          <section className="profile-achievements-section">
            <div className="achievements-header">
              <h2>Achievements</h2>
              <span className="achievements-count">
                {achievements.filter(a => a.unlocked).length} / {achievements.length} unlocked
              </span>
            </div>
            <div className="achievements-scroll-container">
              {achievements.length === 0 ? (
                <p>No achievements available yet.</p>
              ) : (
                achievements.map((achievement) => (
                  <div 
                    key={achievement.id} 
                    className={`achievement-badge-scroll ${achievement.unlocked ? 'unlocked' : 'locked'}`}
                    title={achievement.unlocked ? `Unlocked!` : `Keep going to unlock this!`}
                  >
                    <div className="achievement-icon-large">
                      {getAchievementIcon(achievement)}
                    </div>
                    <div className="achievement-name">
                      {achievement.displayName || achievement.name}
                    </div>
                    <div className="achievement-description">
                      {achievement.description}
                    </div>
                    {achievement.unlocked && (
                      <div className="unlocked-badge">✓ Unlocked</div>
                    )}
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Activity Feed */}
          <section className="profile-activity-section">
            <h2>My Journey</h2>
            <div className="activity-feed-container">
              {posts.length === 0 ? (
                <div className="empty-state">
                  <p className="empty-message">
                    Your habit check-ins will appear here. 
                  </p>
                  <p className="empty-message-hint">
                    💡 Go to Dashboard → Check in on a habit to create your first post!
                  </p>
                </div>
              ) : (
                posts.map((post) => {
                  const author = post.userId || post.User;
                  const habit = post.habitId || post.Habit;
                  const authorUsername = author?.username || viewedUser?.username || user?.username || 'User';
                  const authorAvatar = author?.avatar || (isOwnProfile ? user?.avatar : viewedUser?.avatar) || '👤';
                  const habitTitle = habit?.habitTitle || 'General Post';
                  const isLiked = post.isLikedByCurrentUser;
                  const postId = getPostId(post);

                  const renderAvatar = (avatar) => {
                    if (!avatar) return '👤';
                    if (typeof avatar === 'string' && avatar.startsWith('http')) {
                      return (
                        <img
                          src={avatar}
                          alt={authorUsername}
                          style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', background: '#222' }}
                        />
                      );
                    }
                    return avatar;
                  };

                  return (
                    <div key={postId} className="post-card">
                      <div className="post-header">
                        <div className="post-author-info">
                          <div className="post-avatar">{renderAvatar(authorAvatar)}</div>
                          <div className="post-meta">
                            <div className="post-author-name">
                              {author ? (
                                <Link to={`/profile/${author.id || author._id}`} className="author-link">{authorUsername}</Link>
                              ) : authorUsername}
                            </div>
                            <div className="post-date">{formatDate(post.createdAt)}</div>
                          </div>
                        </div>
                        <div className="post-habit-badge">
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <path d="M8 1l2.5 5 5.5.5-4 4 1 5.5L8 13l-5 3 1-5.5-4-4 5.5-.5z" fill="currentColor"/>
                          </svg>
                          {habitTitle}
                        </div>
                      </div>

                      <div className="post-content">
                        <p>{post.content}</p>
                        {post.mediaUrl && (
                          <div className="post-media-wrapper" style={{ marginTop: '14px', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-color)', background: '#0a0a0a' }}>
                            {post.mediaType === 'video' ? (
                              <video src={post.mediaUrl} controls style={{ width: '100%', maxHeight: '450px', display: 'block' }} />
                            ) : (
                              <img src={post.mediaUrl} alt="Check-in media" style={{ width: '100%', maxHeight: '450px', objectFit: 'contain', display: 'block' }} />
                            )}
                          </div>
                        )}
                      </div>

                      <div className="post-actions" style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                        <button
                          className={`btn-like ${isLiked ? 'liked' : ''}`}
                          onClick={() => !isLiked && handleLike(postId)}
                          disabled={isLiked}
                        >
                          <FiHeart fill={isLiked ? 'currentColor' : 'none'} />
                          {isLiked ? 'Liked' : 'Like'}
                        </button>

                        <button
                          className="btn-comment"
                          onClick={() => setExpandedPostId(expandedPostId === postId ? null : postId)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            background: 'var(--bg-secondary)',
                            border: '1px solid var(--border-color)',
                            color: 'var(--text-secondary)',
                            padding: '8px 16px',
                            borderRadius: '8px',
                            fontSize: '14px',
                            fontWeight: '500',
                            cursor: 'pointer',
                            transition: 'var(--transition)'
                          }}
                        >
                          <FiMessageCircle />
                          Comment ({post.commentCount || 0})
                        </button>

                        <span className="post-stat">
                          <FiHeart /> {post.likeCount || 0} {post.likeCount === 1 ? 'like' : 'likes'}
                        </span>
                      </div>

                      {expandedPostId === postId && (
                        <div className="comments-section" style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid var(--border-color)' }}>
                          {/* Comments List */}
                          <div className="comments-list" style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px', maxHeight: '250px', overflowY: 'auto' }}>
                            {(post.comments || []).length === 0 ? (
                              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', textAlign: 'center', margin: '8px 0' }}>No comments yet. Start the conversation!</p>
                            ) : (
                              post.comments.map(c => {
                                const cAuthor = c.userId || {};
                                return (
                                  <div key={c._id || c.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', background: 'rgba(255,255,255,0.02)', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', textAlign: 'left' }}>
                                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#444', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', flexShrink: 0 }}>
                                      {typeof cAuthor.avatar === 'string' && cAuthor.avatar.startsWith('http') ? (
                                        <img src={cAuthor.avatar} alt={cAuthor.username} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                                      ) : (
                                        cAuthor.avatar || '👤'
                                      )}
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', width: '100%' }}>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--white)' }}>{cAuthor.username || 'User'}</span>
                                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{formatDate(c.createdAt)}</span>
                                      </div>
                                      <p style={{ fontSize: '13px', color: 'var(--gray-300)', lineHeight: '1.4', margin: 0 }}>{c.content}</p>
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>

                          {/* Add Comment Input */}
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <input
                              type="text"
                              placeholder="Write a comment..."
                              value={commentText[postId] || ''}
                              onChange={(e) => setCommentText({ ...commentText, [postId]: e.target.value })}
                              onKeyDown={(e) => e.key === 'Enter' && handleCommentSubmit(postId)}
                              style={{ flex: 1, background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '8px 12px', color: 'var(--text-primary)', fontSize: '14px' }}
                            />
                            <button
                              onClick={() => handleCommentSubmit(postId)}
                              disabled={submittingComments[postId]}
                              style={{ background: 'var(--neon)', color: '#000', border: 'none', borderRadius: '8px', padding: '8px 16px', fontWeight: '600', fontSize: '13px', cursor: submittingComments[postId] ? 'not-allowed' : 'pointer', opacity: submittingComments[postId] ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: '6px' }}
                            >
                              {submittingComments[postId] ? (
                                <>
                                  <div style={{ width: '12px', height: '12px', border: '2px solid rgba(0,0,0,0.3)', borderTopColor: '#000', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }}></div>
                                  <span>Sending...</span>
                                </>
                              ) : 'Send'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </section>
        </div>
      </main>


    </div>
  );
};

export default Profile;
