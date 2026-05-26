
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useState, useEffect, useRef } from 'react';
import { notificationsAPI } from '../services/api';
import { subscribeToDataChanges } from '../services/socket';

const Navbar = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationRef = useRef(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const getUserId = (targetUser) => targetUser?.id || targetUser?._id;

  useEffect(() => {
    fetchNotifications();
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToDataChanges((event) => {
      if (!event?.scope) return;

      const currentUserId = getUserId(user);
      if (event.userId && String(event.userId) !== String(currentUserId)) {
        return;
      }

      if (['notifications', 'likes', 'posts'].includes(event.scope)) {
        fetchNotifications();
      }
    });

    return unsubscribe;
  }, [user]);

  useEffect(() => {
    document.body.classList.remove('light-mode');
    document.body.classList.add('dark-mode');
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };

    if (showNotifications) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showNotifications]);

  const fetchNotifications = async () => {
    try {
      const response = await notificationsAPI.getAll();
      setNotifications(response.data.filter(n => !n.read));
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationsAPI.markAllRead();
      setNotifications([]);
      setShowNotifications(false);
    } catch (error) {
      console.error('Failed to mark notifications as read:', error);
    }
  };



  if (!user) return null;

  const renderAvatarElement = () => {
    const avatar = user?.avatar;
    if (!avatar) return '👤';
    if (typeof avatar === 'string' && avatar.startsWith('http')) {
      return (
        <img
          src={avatar}
          alt={user?.username || 'avatar'}
          style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', background: '#222' }}
        />
      );
    }
    return avatar;
  };
  const isActive = (path) => location.pathname === path ? 'active' : '';

  return (
    <nav className="navbar">
      <div className="nav-container">
        <div className="nav-logo">
          <Link to="/" className="brand">
            Aadat<span className="neon-dot"></span>
          </Link>
        </div>
        <div className="nav-links-center">
          <Link to="/dashboard" className={`nav-link ${isActive('/dashboard')}`}>Dashboard</Link>
          <Link to="/community" className={`nav-link ${isActive('/community')}`}>Community</Link>
          <Link to="/roadmap" className={`nav-link ${isActive('/roadmap')}`}>Roadmap</Link>
          <Link to="/battles" className={`nav-link ${isActive('/battles')}`}>Battles</Link>
          <Link to="/leaderboard" className={`nav-link ${isActive('/leaderboard')}`}>Leaderboard</Link>
        </div>
        <div className="nav-icons">
          <div className="notification-container" ref={notificationRef}>
            <button className="icon-btn notification-btn" onClick={() => setShowNotifications(!showNotifications)} aria-label="Notifications">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M15 6.66667C15 5.34058 14.4732 4.06881 13.5355 3.13112C12.5979 2.19344 11.3261 1.66667 10 1.66667C8.67392 1.66667 7.40215 2.19344 6.46447 3.13112C5.52678 4.06881 5 5.34058 5 6.66667C5 12.5 2.5 14.1667 2.5 14.1667H17.5C17.5 14.1667 15 12.5 15 6.66667Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M11.4417 17.5C11.2952 17.7526 11.0849 17.9622 10.8319 18.1079C10.5788 18.2537 10.292 18.3304 10 18.3304C9.70802 18.3304 9.42117 18.2537 9.16816 18.1079C8.91514 17.9622 8.70484 17.7526 8.55835 17.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {notifications.length > 0 && (
                <span className="notification-badge">{notifications.length}</span>
              )}
            </button>
            {showNotifications && (
              <div className="notifications-dropdown open">
                <div className="notifications-header">
                  <h3>Notifications</h3>
                  <button className="mark-read-btn" onClick={handleMarkAllRead}>Mark all as read</button>
                </div>
                <div className="notifications-list">
                  {notifications.length === 0 ? (
                    <div className="notifications-empty">
                      <div className="empty-icon">🔔</div>
                      <p>No new notifications</p>
                    </div>
                  ) : (
                    notifications.map((notif) => {
                      const sender = notif.senderId || {};
                      const senderName = sender.username || notif.senderUsername || 'Someone';
                      const senderAvatar = sender.avatar || '👤';
                      
                      const getNotificationIcon = (type) => {
                        if (type === 'like') return '❤️';
                        if (type === 'comment') return '💬';
                        if (type === 'invite') return '✉️';
                        if (type === 'battle_challenge') return '⚔️';
                        if (type === 'battle_accepted') return '✅';
                        if (type === 'battle_rejected') return '❌';
                        if (type === 'battle_completed') return '🏆';
                        if (type === 'battle_streak') return '💥';
                        return '🔔';
                      };

                      return (
                        <div key={notif._id || notif.id} className="notification-item" style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          padding: '12px 16px',
                          borderBottom: '1px solid var(--border-color)',
                          transition: 'var(--transition)'
                        }}>
                          <div style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            background: 'var(--bg-secondary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '14px',
                            flexShrink: 0
                          }}>
                            {typeof senderAvatar === 'string' && senderAvatar.startsWith('http') ? (
                              <img src={senderAvatar} alt={senderName} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                            ) : (
                              senderAvatar
                            )}
                          </div>
                          
                          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px', textAlign: 'left' }}>
                            <div style={{ fontSize: '13px', color: 'var(--text-primary)', lineHeight: '1.4' }}>
                              {notif.type === 'achievement' ? (
                                <>
                                  <strong style={{ color: 'var(--white)' }}>You</strong> {notif.message}
                                </>
                              ) : (
                                <>
                                  <strong style={{ color: 'var(--white)' }}>{senderName}</strong> {notif.message}
                                </>
                              )}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                              {new Date(notif.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            </div>
                          </div>

                          <div style={{ fontSize: '14px' }}>
                            {getNotificationIcon(notif.type)}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
          <Link to="/profile" className="user-avatar" aria-label="Profile">{renderAvatarElement()}</Link>
          {/* Hamburger for mobile */}
          <button className={`hamburger${mobileMenuOpen ? ' open' : ''}`} aria-label="Toggle menu" onClick={() => setMobileMenuOpen((open) => !open)}>
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>
      </div>
      {/* Mobile nav links dropdown */}
      <div className={`nav-links-mobile${mobileMenuOpen ? ' open' : ''}`}>
        <Link 
          to="/dashboard" 
          className={`nav-link ${isActive('/dashboard')}`} 
          onClick={() => setMobileMenuOpen(false)}
        >
          Dashboard
        </Link>
        <Link 
          to="/community" 
          className={`nav-link ${isActive('/community')}`} 
          onClick={() => setMobileMenuOpen(false)}
        >
          Community
        </Link>
        <Link 
          to="/battles" 
          className={`nav-link ${isActive('/battles')}`} 
          onClick={() => setMobileMenuOpen(false)}
        >
          Battles
        </Link>
        <Link 
          to="/leaderboard" 
          className={`nav-link ${isActive('/leaderboard')}`} 
          onClick={() => setMobileMenuOpen(false)}
        >
          Leaderboard
        </Link>
      </div>
    </nav>
  );
};

export default Navbar;
