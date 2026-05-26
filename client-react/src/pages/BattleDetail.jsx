import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { battlesAPI } from '../services/api';
import { subscribeToDataChanges } from '../services/socket';
import { useToast } from '../context/ToastContext';
import Navbar from '../components/Navbar';
import '../styles/Battles.css';

const BattleDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [battle, setBattle] = useState(null);
  const [loading, setLoading] = useState(true);
  const getUserId = (u) => u?.id || u?._id;

  useEffect(() => {
    fetchBattle();
  }, [id]);

  useEffect(() => {
    const unsubscribe = subscribeToDataChanges((event) => {
      if (event?.scope === 'battles') {
        fetchBattle();
      }
    });
    return unsubscribe;
  }, [id]);

  const fetchBattle = async () => {
    try {
      const res = await battlesAPI.getById(id);
      setBattle(res.data);
    } catch (error) {
      console.error('Failed to fetch battle:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckin = async () => {
    try {
      await battlesAPI.checkin(id);
      toast.success('Battle check-in recorded! ⚔️');
      fetchBattle();
    } catch (error) {
      toast.error(error.response?.data?.msg || 'Failed to check in.');
    }
  };

  const renderAvatar = (avatar, name) => {
    if (!avatar) return '👤';
    if (typeof avatar === 'string' && avatar.startsWith('http')) {
      return <img src={avatar} alt={name || 'user'} />;
    }
    return avatar;
  };

  const hasCheckedInToday = () => {
    if (!battle) return false;
    const currentUserId = getUserId(user);
    const isChallenger = (battle.challengerId?._id || battle.challengerId) === currentUserId;
    const data = isChallenger ? battle.challengerData : battle.opponentData;
    if (!data?.checkins?.length) return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return data.checkins.some(d => {
      const checkinDate = new Date(d);
      checkinDate.setHours(0, 0, 0, 0);
      return checkinDate.getTime() === today.getTime();
    });
  };

  // Generate daily calendar for the battle duration
  const generateCalendar = () => {
    if (!battle) return [];
    const start = new Date(battle.startDate);
    const end = new Date(battle.endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const days = [];
    const current = new Date(start);
    current.setHours(0, 0, 0, 0);

    const cCheckins = new Set((battle.challengerData?.checkins || []).map(d => {
      const dt = new Date(d);
      dt.setHours(0, 0, 0, 0);
      return dt.getTime();
    }));
    const oCheckins = new Set((battle.opponentData?.checkins || []).map(d => {
      const dt = new Date(d);
      dt.setHours(0, 0, 0, 0);
      return dt.getTime();
    }));

    while (current <= end) {
      const ts = current.getTime();
      days.push({
        date: new Date(current),
        dayNum: current.getDate(),
        isToday: ts === today.getTime(),
        challengerChecked: cCheckins.has(ts),
        opponentChecked: oCheckins.has(ts),
        isFuture: current > today
      });
      current.setDate(current.getDate() + 1);
    }

    return days;
  };

  if (loading) {
    return (
      <div className="battle-detail-page">
        <Navbar />
        <div className="battle-detail-container">
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '100px' }}>
            <div className="loading-spinner"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!battle) {
    return (
      <div className="battle-detail-page">
        <Navbar />
        <div className="battle-detail-container">
          <div className="battles-empty">
            <div className="battles-empty-icon">❌</div>
            <h3>Battle not found</h3>
            <Link to="/battles" className="battle-detail-back">← Back to Battles</Link>
          </div>
        </div>
      </div>
    );
  }

  const challenger = battle.challengerId || {};
  const opponent = battle.opponentId || {};
  const cData = battle.challengerData || { checkins: [], currentStreak: 0, longestStreak: 0, consistency: 0 };
  const oData = battle.opponentData || { checkins: [], currentStreak: 0, longestStreak: 0, consistency: 0 };
  const winnerId = battle.winner?._id || battle.winner;
  const currentUserId = getUserId(user);
  const isParticipant = (challenger._id || challenger) === currentUserId || (opponent._id || opponent) === currentUserId;
  const totalDays = Math.round((new Date(battle.endDate) - new Date(battle.startDate)) / (1000 * 60 * 60 * 24));
  const calendarDays = generateCalendar();

  return (
    <div className="battle-detail-page">
      <Navbar />
      <div className="battle-detail-container">
        <Link to="/battles" className="battle-detail-back">
          ← Back to Battles
        </Link>

        <div className="battle-detail-card">
          <div className="battle-detail-title">
            ⚔️ {battle.habitName}
          </div>
          <div className="battle-detail-dates">
            {new Date(battle.startDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            {' — '}
            {new Date(battle.endDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            {' · '}
            {totalDays} days
            <span className={`battle-status-badge ${battle.status}`} style={{ marginLeft: '12px' }}>
              {battle.status}
            </span>
          </div>

          {/* Head-to-Head comparison */}
          <div className="battle-h2h">
            <div className={`battle-h2h-player ${winnerId && (challenger._id || challenger) === winnerId ? 'is-winner' : ''}`}>
              {winnerId && (challenger._id || challenger) === winnerId && (
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>👑</div>
              )}
              <div className="h2h-avatar">
                {renderAvatar(challenger.avatar, challenger.username)}
              </div>
              <div className="h2h-name">{challenger.username || 'Challenger'}</div>
              <div className="h2h-stats">
                <div className="h2h-stat">
                  <span className="h2h-stat-label">Current Streak</span>
                  <span className="h2h-stat-value">🔥 {cData.currentStreak}</span>
                </div>
                <div className="h2h-stat">
                  <span className="h2h-stat-label">Longest Streak</span>
                  <span className="h2h-stat-value">⭐ {cData.longestStreak}</span>
                </div>
                <div className="h2h-stat">
                  <span className="h2h-stat-label">Check-ins</span>
                  <span className="h2h-stat-value">{cData.checkins?.length || 0} / {totalDays}</span>
                </div>
                <div className="h2h-stat">
                  <span className="h2h-stat-label">Consistency</span>
                  <span className="h2h-stat-value">{cData.consistency}%</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span className="vs-text" style={{ fontSize: '28px' }}>VS</span>
            </div>

            <div className={`battle-h2h-player ${winnerId && (opponent._id || opponent) === winnerId ? 'is-winner' : ''}`}>
              {winnerId && (opponent._id || opponent) === winnerId && (
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>👑</div>
              )}
              <div className="h2h-avatar">
                {renderAvatar(opponent.avatar, opponent.username)}
              </div>
              <div className="h2h-name">{opponent.username || 'Opponent'}</div>
              <div className="h2h-stats">
                <div className="h2h-stat">
                  <span className="h2h-stat-label">Current Streak</span>
                  <span className="h2h-stat-value">🔥 {oData.currentStreak}</span>
                </div>
                <div className="h2h-stat">
                  <span className="h2h-stat-label">Longest Streak</span>
                  <span className="h2h-stat-value">⭐ {oData.longestStreak}</span>
                </div>
                <div className="h2h-stat">
                  <span className="h2h-stat-label">Check-ins</span>
                  <span className="h2h-stat-value">{oData.checkins?.length || 0} / {totalDays}</span>
                </div>
                <div className="h2h-stat">
                  <span className="h2h-stat-label">Consistency</span>
                  <span className="h2h-stat-value">{oData.consistency}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Progress Comparison */}
          <div className="battle-progress-section">
            <div className="battle-progress-row">
              <span className="battle-progress-label" style={{ minWidth: '90px' }}>{challenger.username}</span>
              <div className="battle-progress-bar-wrapper">
                <div
                  className="battle-progress-bar challenger"
                  style={{ width: `${Math.min(cData.consistency, 100)}%` }}
                />
              </div>
              <span className="battle-progress-value">{cData.consistency}%</span>
            </div>
            <div className="battle-progress-row">
              <span className="battle-progress-label" style={{ minWidth: '90px' }}>{opponent.username}</span>
              <div className="battle-progress-bar-wrapper">
                <div
                  className="battle-progress-bar opponent"
                  style={{ width: `${Math.min(oData.consistency, 100)}%` }}
                />
              </div>
              <span className="battle-progress-value">{oData.consistency}%</span>
            </div>
          </div>

          {/* Daily check-in calendar */}
          <div className="battle-calendar-section">
            <div className="battle-calendar-title">📅 Daily Check-in Calendar</div>
            <div style={{ display: 'flex', gap: '16px', marginBottom: '8px', fontSize: '11px', color: 'var(--text-secondary)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: 'rgba(255, 107, 53, 0.3)', display: 'inline-block' }}></span>
                {challenger.username}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: 'rgba(99, 102, 241, 0.3)', display: 'inline-block' }}></span>
                {opponent.username}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: 'linear-gradient(135deg, rgba(255, 107, 53, 0.3), rgba(99, 102, 241, 0.3))', display: 'inline-block' }}></span>
                Both
              </span>
            </div>
            <div className="battle-calendar-grid">
              {calendarDays.map((day, i) => {
                let className = 'battle-calendar-day';
                if (day.isToday) className += ' today';
                if (day.challengerChecked && day.opponentChecked) className += ' both-checked';
                else if (day.challengerChecked) className += ' challenger-checked';
                else if (day.opponentChecked) className += ' opponent-checked';

                return (
                  <div
                    key={i}
                    className={className}
                    title={`${day.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}${day.challengerChecked ? ` — ${challenger.username} ✓` : ''}${day.opponentChecked ? ` — ${opponent.username} ✓` : ''}`}
                    style={{ opacity: day.isFuture ? 0.3 : 1 }}
                  >
                    {day.dayNum}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action button */}
          {battle.status === 'active' && isParticipant && (
            <div className="battle-actions" style={{ justifyContent: 'center', marginTop: '24px' }}>
              <button
                className="btn-battle-action checkin"
                onClick={() => navigate('/dashboard')}
                style={{
                  padding: '12px 32px',
                  fontSize: '15px',
                  background: hasCheckedInToday()
                    ? 'rgba(57, 211, 83, 0.1)'
                    : 'linear-gradient(135deg, #ff6b35 0%, #ff2d55 100%)',
                  color: hasCheckedInToday() ? '#39d353' : '#fff',
                  border: hasCheckedInToday() ? '1px solid rgba(57, 211, 83, 0.2)' : 'none',
                  boxShadow: hasCheckedInToday() ? 'none' : '0 2px 10px rgba(255, 107, 53, 0.3)'
                }}
              >
                {hasCheckedInToday() ? '✅ Done for Today' : '📝 Post Check-in on Dashboard'}
              </button>
            </div>
          )}

          {/* Result banner */}
          {battle.status === 'completed' && (
            <div className="battle-result-banner">
              {winnerId ? (
                <>
                  <h3>🏆 {(battle.winner?.username || (winnerId === (challenger._id || challenger) ? challenger.username : opponent.username))} Wins!</h3>
                  <p>
                    Winner earned <strong>50 XP</strong> • Participant earned <strong>15 XP</strong>
                  </p>
                </>
              ) : (
                <>
                  <h3>🤝 It's a Draw!</h3>
                  <p>Both participants earned <strong>15 XP</strong></p>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BattleDetail;
