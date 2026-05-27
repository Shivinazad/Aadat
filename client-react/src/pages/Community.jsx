import { useState, useEffect } from 'react';
import { postsAPI } from '../services/api';
import Navbar from '../components/Navbar';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import CountUp from 'react-countup';
import { FiHeart, FiMessageCircle } from 'react-icons/fi';
import { subscribeToDataChanges } from '../services/socket';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import '../home.css';
import '../styles/Community.css';

const Community = () => {
  const { user, fetchUser } = useAuth();
  const toast = useToast();
  const [posts, setPosts] = useState([]);
  const [activeCategory, setActiveCategory] = useState('all');

  const categories = [
    { id: 'all', name: 'All Feed', icon: '🌐' },
    { id: 'coding', name: 'Coding', icon: '💻' },
    { id: 'learning', name: 'Learning', icon: '📚' },
    { id: 'gym', name: 'Gym & Workout', icon: '🏋️‍♂️' },
    { id: 'running', name: 'Running & Cardio', icon: '🏃‍♂️' },
    { id: 'health', name: 'Health & Wellness', icon: '🧘‍♂️' },
    { id: 'general', name: 'General', icon: '💬' }
  ];

  const getCategoryInfo = (categoryStr, habitTitle, habitId) => {
    if (!habitId) {
      return { name: 'General', icon: '💬', class: 'general' };
    }
    
    const cat = (categoryStr || '').toLowerCase();
    const title = (habitTitle || '').toLowerCase();
    
    const isCoding = /code|coding|dev|develop|program|tech|dsa|programming|software|web|python|javascript|java\b|rust|c\+\+|html|css/i.test(cat) || 
                     /code|coding|dev|develop|program|tech|dsa|programming|software|web|python|javascript|java\b|rust|c\+\+|html|css/i.test(title);
    if (isCoding) {
      return { name: 'Coding', icon: '💻', class: 'coding' };
    }
    
    const isRunning = /run|running|cardio|walk|walking|jog|jogging|marathon/i.test(cat) ||
                      /run|running|cardio|walk|walking|jog|jogging|marathon/i.test(title);
    if (isRunning) {
      return { name: 'Running', icon: '🏃‍♂️', class: 'running' };
    }

    const isGym = /gym|workout|lift|weights|exercise|fitness|bodybuilding|strength/i.test(cat) ||
                  /gym|workout|lift|weights|exercise|fitness|bodybuilding|strength/i.test(title);
    if (isGym) {
      return { name: 'Gym', icon: '🏋️‍♂️', class: 'gym' };
    }

    const isLearning = /study|studying|learn|learning|read|reading|book|education|french|course|class|math|science|history|exam|prepare/i.test(cat) ||
                       /study|studying|learn|learning|read|reading|book|education|french|course|class|math|science|history|exam|prepare/i.test(title);
    if (isLearning) {
      return { name: 'Learning', icon: '📚', class: 'learning' };
    }

    const isHealth = /health|meditat|yoga|sleep|mental|mind|wellness|nutrition|diet|water|hydrate/i.test(cat) ||
                     /health|meditat|yoga|sleep|mental|mind|wellness|nutrition|diet|water|hydrate/i.test(title);
    if (isHealth) {
      return { name: 'Health', icon: '🧘‍♂️', class: 'health' };
    }
    
    return { name: categoryStr || 'General', icon: '✨', class: 'other' };
  };
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    activeMembers: 0,
    postsToday: 0,
    completionRate: 0
  });
  const [expandedPostId, setExpandedPostId] = useState(null);
  const [commentText, setCommentText] = useState({});
  const [submittingComments, setSubmittingComments] = useState({});

  const getPostId = (post) => post?.id || post?._id;

  const handleCommentSubmit = async (postId) => {
    const text = commentText[postId] || '';
    if (!text.trim()) return;
    setSubmittingComments(prev => ({ ...prev, [postId]: true }));
    try {
      await postsAPI.comment(postId, text);
      setCommentText(prev => ({ ...prev, [postId]: '' }));
      fetchPosts();
      if (fetchUser) {
        await fetchUser();
      }
    } catch (error) {
      const errorMsg = error.response?.data?.msg || 'Failed to post comment';
      toast.error(errorMsg);
    } finally {
      setSubmittingComments(prev => ({ ...prev, [postId]: false }));
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [activeCategory]);

  useEffect(() => {
    const currentUserId = user?.id || user?._id;
    const unsubscribe = subscribeToDataChanges((event) => {
      if (!event?.scope) return;
      
      const isCurrentUserEvent = !event.userId || 
                                 String(event.userId) === String(currentUserId) || 
                                 (event.targetUserId && String(event.targetUserId) === String(currentUserId));

      if (['posts', 'likes', 'habits'].includes(event.scope)) {
        fetchPosts();
        fetchStats();
        if (isCurrentUserEvent && fetchUser) {
          fetchUser();
        }
      }
    });

    return unsubscribe;
  }, [user, fetchUser, activeCategory]);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const response = await postsAPI.getAll(activeCategory);
      setPosts(response.data);
    } catch (error) {
      console.error('Failed to fetch posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await postsAPI.getCommunityStats();
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch community stats:', error);
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

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div>
      <Navbar />
      
      <main className="main-container">
        <div className="content-wrapper-single">
          {/* Header Section */}
          <motion.section 
            className="community-header"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="community-header-content">
              <motion.div 
                className="header-badge"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2, duration: 0.4 }}
              >
                <div className="live-dot"></div>
                <span>Live Feed</span>
              </motion.div>
              <motion.h1
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.5 }}
              >
                Community Activity
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.5 }}
              >
                See what others are building and share your progress
              </motion.p>
            </div>
            <motion.div 
              className="community-stats"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.5 }}
            >
              <div className="stat-box">
                <div className="stat-number"><CountUp end={stats.activeMembers} duration={2} /></div>
                <div className="stat-label">Active Members</div>
              </div>
              <div className="stat-box">
                <div className="stat-number"><CountUp end={stats.postsToday} duration={2} /></div>
                <div className="stat-label">Posts Today</div>
              </div>
              <div className="stat-box">
                <div className="stat-number neon"><CountUp end={stats.completionRate} duration={2} />%</div>
                <div className="stat-label">Completion Rate</div>
              </div>
            </motion.div>
          </motion.section>

          {/* Feed Section */}
          <section className="feed-section">
            <div className="category-filters-wrapper">
              <div className="category-filters-container">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    className={`category-chip ${activeCategory === cat.id ? 'active' : ''} cat-${cat.id}`}
                    onClick={() => setActiveCategory(cat.id)}
                  >
                    <span>{cat.icon}</span>
                    <span>{cat.name}</span>
                  </button>
                ))}
              </div>
            </div>
            
            <div className="feed-container">
              {loading ? (
                <div className="loading-state">
                  <div className="loading-spinner"></div>
                  <p>Loading community feed...</p>
                </div>
              ) : posts.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">📝</div>
                  <h3>No posts yet</h3>
                  <p>Be the first to share your progress! Check in to a habit from your dashboard.</p>
                </div>
              ) : (
                posts.map((post, index) => {
                  const author = post.userId || post.User;
                  const habit = post.habitId || post.Habit;
                  const authorUsername = author?.username || 'Unknown User';
                  const authorAvatar = author?.avatar || '👤';
                  const habitTitle = habit?.habitTitle;
                  const habitCategory = habit?.habitCategory;
                  const categoryInfo = getCategoryInfo(habitCategory, habitTitle, habit?._id || habit?.id);
                  const isLiked = post.isLikedByCurrentUser;

                  // Render avatar: show image if URL, emoji/text otherwise
                  const renderAvatar = (avatar) => {
                    if (!avatar) return '👤';
                    if (typeof avatar === 'string' && avatar.startsWith('http')) {
                      return (
                        <img
                          src={avatar}
                          alt={authorUsername || 'avatar'}
                          style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', background: '#222' }}
                        />
                      );
                    }
                    return avatar;
                  };

                  return (
                    <motion.div 
                      key={getPostId(post)} 
                      className="post-card"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: index * 0.05 }}
                      whileHover={{ y: -4, transition: { duration: 0.2 } }}
                    >
                      <div className="post-header">
                        <div className="post-author-info">
                          <div className="post-avatar">{renderAvatar(authorAvatar)}</div>
                          <div className="post-meta">
                            <div className="post-author-name">
                              {author ? (
                                <Link to={`/profile/${author.id || author._id}`} className="author-link">{authorUsername}</Link>
                              ) : (
                                authorUsername
                              )}
                            </div>
                            <div className="post-date">{formatDate(post.createdAt)}</div>
                          </div>
                        </div>
                        <div className="post-header-badges">
                          <span className={`category-badge cat-${categoryInfo.class}`}>
                            {categoryInfo.icon} {categoryInfo.name}
                          </span>
                          {habitTitle && (
                            <div className="post-habit-badge">
                              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                <path d="M8 1l2.5 5 5.5.5-4 4 1 5.5L8 13l-5 3 1-5.5-4-4 5.5-.5z" fill="currentColor"/>
                              </svg>
                              {habitTitle}
                            </div>
                          )}
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
                        <motion.button 
                          className={`btn-like ${isLiked ? 'liked' : ''}`}
                          onClick={() => !isLiked && handleLike(getPostId(post))}
                          disabled={isLiked}
                          whileHover={{ scale: isLiked ? 1 : 1.05 }}
                          whileTap={{ scale: isLiked ? 1 : 0.95 }}
                        >
                          <FiHeart fill={isLiked ? 'currentColor' : 'none'} />
                          {isLiked ? 'Liked' : 'Like'}
                        </motion.button>
                        
                        <motion.button 
                          className="btn-comment"
                          onClick={() => setExpandedPostId(expandedPostId === getPostId(post) ? null : getPostId(post))}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
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
                        </motion.button>

                        <span className="post-stat">
                          <FiHeart /> {post.likeCount || 0} {post.likeCount === 1 ? 'like' : 'likes'}
                        </span>
                      </div>

                      {expandedPostId === getPostId(post) && (
                        <div className="comments-section" style={{
                          marginTop: '20px',
                          paddingTop: '20px',
                          borderTop: '1px solid var(--border-color)'
                        }}>
                          {/* Comments List */}
                           <div className="comments-list" style={{
                             display: 'flex',
                             flexDirection: 'column',
                             gap: '12px',
                             marginBottom: '16px',
                             maxHeight: '250px',
                             overflowY: 'auto'
                           }}>
                             {(post.comments || []).length === 0 ? (
                               <p style={{ color: 'var(--text-secondary)', fontSize: '14px', textAlign: 'center', margin: '8px 0' }}>No comments yet. Start the conversation!</p>
                             ) : (
                               post.comments.map(c => {
                                 const cAuthor = c.userId || {};
                                 return (
                                   <div key={c._id || c.id} style={{
                                     display: 'flex',
                                     alignItems: 'flex-start',
                                     gap: '10px',
                                     background: 'rgba(255, 255, 255, 0.02)',
                                     padding: '10px 14px',
                                     borderRadius: '8px',
                                     border: '1px solid rgba(255, 255, 255, 0.05)',
                                     textAlign: 'left'
                                   }}>
                                     <div style={{
                                       width: '28px',
                                       height: '28px',
                                       borderRadius: '50%',
                                       background: '#444',
                                       display: 'flex',
                                       alignItems: 'center',
                                       justifyContent: 'center',
                                       fontSize: '10px',
                                       flexShrink: 0
                                     }}>
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
                               value={commentText[getPostId(post)] || ''}
                               onChange={(e) => setCommentText({ ...commentText, [getPostId(post)]: e.target.value })}
                               onKeyDown={(e) => e.key === 'Enter' && handleCommentSubmit(getPostId(post))}
                               style={{
                                 flex: 1,
                                 background: 'var(--bg-secondary)',
                                 border: '1px solid var(--border-color)',
                                 borderRadius: '8px',
                                 padding: '8px 12px',
                                 color: 'var(--text-primary)',
                                 fontSize: '14px'
                               }}
                             />
                              <button 
                                onClick={() => handleCommentSubmit(getPostId(post))}
                                disabled={submittingComments[getPostId(post)]}
                                style={{
                                  background: 'var(--neon)',
                                  color: '#000',
                                  border: 'none',
                                  borderRadius: '8px',
                                  padding: '8px 16px',
                                  fontWeight: '600',
                                  fontSize: '13px',
                                  cursor: submittingComments[getPostId(post)] ? 'not-allowed' : 'pointer',
                                  opacity: submittingComments[getPostId(post)] ? 0.7 : 1,
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px'
                                }}
                              >
                                {submittingComments[getPostId(post)] ? (
                                  <>
                                    <div className="loading-spinner-btn" style={{
                                      width: '12px',
                                      height: '12px',
                                      border: '2px solid rgba(0,0,0,0.3)',
                                      borderTopColor: '#000',
                                      borderRadius: '50%',
                                      animation: 'spin 0.6s linear infinite'
                                    }}></div>
                                    <span>Sending...</span>
                                  </>
                                ) : (
                                  'Send'
                                )}
                              </button>
                           </div>
                         </div>
                       )}
                    </motion.div>
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

export default Community;
