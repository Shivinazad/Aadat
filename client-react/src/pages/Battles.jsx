import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { battlesAPI } from '../services/api';
import { subscribeToDataChanges } from '../services/socket';
import { useToast } from '../context/ToastContext';
import Navbar from '../components/Navbar';
import CreateBattleModal from '../components/CreateBattleModal';
import '../styles/Battles.css';

const Battles = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [battles, setBattles] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('active');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const getUserId = (u) => u?.id || u?._id;

  console.log('=== Battles render === showCreateModal:', showCreateModal, 'loading:', loading);

  // Stable ref for user ID to avoid effect re-runs when user object reference changes
  const userIdRef = useRef(getUserId(user));
  useEffect(() => { userIdRef.current = getUserId(user); }, [user]);

  useEffect(() => {
    console.log('=== Battles mounted ===');
    fetchBattles();
    fetchLeaderboard();
    return () => {
      console.log('=== Battles UNMOUNTED ===');
    };
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToDataChanges((event) => {
      if (event?.scope === 'battles') {
        fetchBattles();
        fetchLeaderboard();
      }
    });
    return unsubscribe;
  }, []);

  const fetchBattles = async () => {
    try {
      const res = await battlesAPI.getAll();
      setBattles(res.data || []);
    } catch (error) {
      console.error('Failed to fetch battles:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLeaderboard = async () => {
    try {
      const res = await battlesAPI.getLeaderboard();
      setLeaderboard(res.data || []);
    } catch (err) {
      console.error('Failed to fetch battle leaderboard:', err);
    }
  };

  const handleAccept = async (battleId) => {
    try {
      await battlesAPI.accept(battleId);
      toast.success('Battle accepted! Let\'s go! 🔥');
      fetchBattles();
    } catch (error) {
      toast.error(error.response?.data?.msg || 'Failed to accept battle.');
    }
  };

  const handleReject = async (battleId) => {
    try {
      await battlesAPI.reject(battleId);
      toast.info('Battle declined.');
      fetchBattles();
    } catch (error) {
      toast.error(error.response?.data?.msg || 'Failed to reject battle.');
    }
  };

  const handleCheckin = async (battleId) => {
    try {
      await battlesAPI.checkin(battleId);
      toast.success('Battle check-in recorded! ⚔️');
      fetchBattles();
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

  const getFilteredBattles = () => {
    return battles.filter(b => {
      if (activeTab === 'active') return b.status === 'active';
      if (activeTab === 'pending') return b.status === 'pending';
      if (activeTab === 'completed') return b.status === 'completed' || b.status === 'rejected';
      return true;
    });
  };

  const getDaysRemaining = (endDate) => {
    const end = new Date(endDate);
    const now = new Date();
    const diff = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
    return Math.max(0, diff);
  };

  const getTotalDays = (startDate, endDate) => {
    return Math.round((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24));
  };

  const hasCheckedInToday = (battle) => {
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

  const renderBattleCard = (battle) => {
    const currentUserId = getUserId(user);
    const challenger = battle.challengerId || {};
    const opponent = battle.opponentId || {};
    const isChallenger = (challenger._id || challenger) === currentUserId;
    const isPendingForMe = battle.status === 'pending' && !isChallenger;
    const isWinner = battle.winner && (battle.winner._id || battle.winner) === currentUserId;
    const winnerId = battle.winner?._id || battle.winner;

    const cData = battle.challengerData || { checkins: [], currentStreak: 0, consistency: 0 };
    const oData = battle.opponentData || { checkins: [], currentStreak: 0, consistency: 0 };
    const totalDays = getTotalDays(battle.startDate, battle.endDate);

    return (
      <div key={battle._id} className={`battle-card ${battle.status}`}>
        <div className="battle-card-header">
          <div className="battle-habit-name">
            <span className="habit-icon">⚔️</span>
            {battle.habitName}
          </div>
          <span className={`battle-status-badge ${battle.status}`}>
            {battle.status}
          </span>
        </div>

        {/* VS Section */}
        <div className="battle-vs-section">
          <div className={`battle-participant ${winnerId && (challenger._id || challenger) === winnerId ? 'winner' : ''}`}>
            <div className="battle-participant-avatar">
              {renderAvatar(challenger.avatar, challenger.username)}
            </div>
            <div className="battle-participant-name">
              {challenger.username || 'Challenger'}
              {isChallenger && ' (You)'}
            </div>
            <div className="battle-participant-streak">
              🔥 <strong>{cData.currentStreak}</strong> streak
            </div>
          </div>

          <div className="battle-vs-divider">
            {battle.status === 'completed' && winnerId && (
              <span className="winner-crown">👑</span>
            )}
            <span className="vs-text">VS</span>
          </div>

          <div className={`battle-participant ${winnerId && (opponent._id || opponent) === winnerId ? 'winner' : ''}`}>
            <div className="battle-participant-avatar">
              {renderAvatar(opponent.avatar, opponent.username)}
            </div>
            <div className="battle-participant-name">
              {opponent.username || 'Opponent'}
              {!isChallenger && ' (You)'}
            </div>
            <div className="battle-participant-streak">
              🔥 <strong>{oData.currentStreak}</strong> streak
            </div>
          </div>
        </div>

        {/* Progress bars — only for active & completed */}
        {(battle.status === 'active' || battle.status === 'completed') && (
          <div className="battle-progress-section">
            <div className="battle-progress-row">
              <span className="battle-progress-label">{challenger.username || 'Challenger'}</span>
              <div className="battle-progress-bar-wrapper">
                <div
                  className="battle-progress-bar challenger"
                  style={{ width: `${Math.min(cData.consistency, 100)}%` }}
                />
              </div>
              <span className="battle-progress-value">{cData.consistency}%</span>
            </div>
            <div className="battle-progress-row">
              <span className="battle-progress-label">{opponent.username || 'Opponent'}</span>
              <div className="battle-progress-bar-wrapper">
                <div
                  className="battle-progress-bar opponent"
                  style={{ width: `${Math.min(oData.consistency, 100)}%` }}
                />
              </div>
              <span className="battle-progress-value">{oData.consistency}%</span>
            </div>
          </div>
        )}

        {/* Meta */}
        <div className="battle-meta">
          <span className="battle-meta-item">
            📅 {new Date(battle.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            {' → '}
            {new Date(battle.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
          <span className="battle-meta-item">
            ⏱ <strong>{totalDays}</strong> days
          </span>
          {battle.status === 'active' && (
            <span className="battle-meta-item">
              ⏳ <strong>{getDaysRemaining(battle.endDate)}</strong> remaining
            </span>
          )}
          {battle.status === 'completed' && isWinner && (
            <span className="battle-meta-item" style={{ color: '#ffd600' }}>
              🏆 Winner (+50 XP)
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="battle-actions">
          {isPendingForMe && (
            <>
              <button className="btn-battle-action accept" onClick={() => handleAccept(battle._id)}>
                ✅ Accept
              </button>
              <button className="btn-battle-action reject" onClick={() => handleReject(battle._id)}>
                ✕ Decline
              </button>
            </>
          )}
          {battle.status === 'active' && (
            <button
              className="btn-battle-action checkin"
              onClick={() => navigate('/dashboard')}
              style={{
                background: hasCheckedInToday(battle)
                  ? 'rgba(57, 211, 83, 0.1)'
                  : 'linear-gradient(135deg, #ff6b35 0%, #ff2d55 100%)',
                color: hasCheckedInToday(battle) ? '#39d353' : '#fff',
                border: hasCheckedInToday(battle) ? '1px solid rgba(57, 211, 83, 0.2)' : 'none',
                boxShadow: hasCheckedInToday(battle) ? 'none' : '0 2px 10px rgba(255, 107, 53, 0.3)'
              }}
            >
              {hasCheckedInToday(battle) ? '✅ Done for Today' : '📝 Post Check-in'}
            </button>
          )}
          <button
            className="btn-battle-action view"
            onClick={() => navigate(`/battles/${battle._id}`)}
          >
            📊 Details
          </button>
        </div>
      </div>
    );
  };

  const filteredBattles = getFilteredBattles();
  const pendingCount = battles.filter(b => b.status === 'pending').length;
  const activeCount = battles.filter(b => b.status === 'active').length;

  if (loading) {
    return (
      <div className="battles-page">
        <Navbar />
        <div className="battles-container">
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '100px' }}>
            <div className="loading-spinner"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="battles-page">
      <Navbar />
      <div className="battles-container">
        <div className="battles-page-header">
          <h1>⚔️ Habit Battles</h1>
          <button
            type="button"
            className="btn-create-battle"
            onClick={(e) => {
              e.stopPropagation();
              setShowCreateModal(true);
            }}
          >
            + New Challenge
          </button>
        </div>

        {/* Tabs */}
        <div className="battles-tabs">
          <button
            className={`battles-tab ${activeTab === 'active' ? 'active' : ''}`}
            onClick={() => setActiveTab('active')}
          >
            🔥 Active
            {activeCount > 0 && <span className="tab-badge">{activeCount}</span>}
          </button>
          <button
            className={`battles-tab ${activeTab === 'pending' ? 'active' : ''}`}
            onClick={() => setActiveTab('pending')}
          >
            ⏳ Pending
            {pendingCount > 0 && <span className="tab-badge">{pendingCount}</span>}
          </button>
          <button
            className={`battles-tab ${activeTab === 'completed' ? 'active' : ''}`}
            onClick={() => setActiveTab('completed')}
          >
            🏆 Completed
          </button>
        </div>

        {/* Battle cards */}
        <div className="battles-list">
          {filteredBattles.length === 0 ? (
            <div className="battles-empty">
              <div className="battles-empty-icon">
                {activeTab === 'active' ? '⚔️' : activeTab === 'pending' ? '📬' : '🏆'}
              </div>
              <h3>
                {activeTab === 'active' && 'No active battles'}
                {activeTab === 'pending' && 'No pending challenges'}
                {activeTab === 'completed' && 'No completed battles yet'}
              </h3>
              <p>
                {activeTab === 'active' && 'Challenge a friend to start competing on your habits!'}
                {activeTab === 'pending' && 'Your incoming and outgoing challenges will appear here.'}
                {activeTab === 'completed' && 'Completed battle results will show up here.'}
              </p>
            </div>
          ) : (
            filteredBattles.map(renderBattleCard)
          )}
        </div>

        {/* Battle Leaderboard */}
        {leaderboard.length > 0 && (
          <div className="battle-leaderboard-section">
            <h3>🏅 Battle Leaderboard</h3>
            <div className="battle-lb-list">
              {leaderboard.map((entry, i) => (
                <div key={entry._id} className="battle-lb-item">
                  <span className="battle-lb-rank">#{i + 1}</span>
                  <div className="battle-lb-avatar">
                    {renderAvatar(entry.avatar, entry.username)}
                  </div>
                  <span className="battle-lb-name">{entry.username}</span>
                  <span className="battle-lb-wins">{entry.wins} win{entry.wins !== 1 ? 's' : ''}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Create Battle Modal */}
      {showCreateModal && (
        <CreateBattleModal
          onClose={() => setShowCreateModal(false)}
          onCreated={fetchBattles}
        />
      )}
    </div>
  );
};

export default Battles;
