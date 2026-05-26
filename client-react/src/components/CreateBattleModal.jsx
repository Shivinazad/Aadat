import { useState, useEffect, useRef } from 'react';
import { authAPI, battlesAPI } from '../services/api';
import { useToast } from '../context/ToastContext';

const CreateBattleModal = ({ onClose, onCreated }) => {
  const toast = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedOpponent, setSelectedOpponent] = useState(null);
  const [habitName, setHabitName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [searching, setSearching] = useState(false);
  const debounceTimer = useRef(null);
  const mouseDownTarget = useRef(null);
  const mountTimeRef = useRef(Date.now());

  // Set default dates (start: today, end: +7 days)
  useEffect(() => {
    console.log('=== CreateBattleModal mounted ===');
    const today = new Date();
    const defaultEnd = new Date(today);
    defaultEnd.setDate(defaultEnd.getDate() + 7); // 7 days total
    setStartDate(today.toISOString().split('T')[0]);
    setEndDate(defaultEnd.toISOString().split('T')[0]);
    return () => {
      console.log('=== CreateBattleModal UNMOUNTED ===');
    };
  }, []);

  // Debounced user search
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    if (!searchQuery.trim() || selectedOpponent) {
      setSearchResults([]);
      return;
    }

    debounceTimer.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await authAPI.searchUsers(searchQuery);
        setSearchResults(res.data || []);
      } catch (err) {
        console.error('User search failed:', err);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [searchQuery, selectedOpponent]);

  const handleSelectOpponent = (user) => {
    setSelectedOpponent(user);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleRemoveOpponent = () => {
    setSelectedOpponent(null);
    setSearchQuery('');
  };

  const renderAvatar = (avatar, name) => {
    if (!avatar) return '👤';
    if (typeof avatar === 'string' && avatar.startsWith('http')) {
      return <img src={avatar} alt={name || 'user'} />;
    }
    return avatar;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedOpponent) {
      toast.error('Please select an opponent.');
      return;
    }
    if (!habitName.trim()) {
      toast.error('Please enter a habit name.');
      return;
    }
    if (!startDate || !endDate) {
      toast.error('Please select start and end dates.');
      return;
    }

    setSubmitting(true);
    try {
      await battlesAPI.create({
        opponentId: selectedOpponent._id,
        habitName: habitName.trim(),
        startDate,
        endDate
      });
      toast.success('Battle challenge sent! ⚔️');
      onCreated?.();
      onClose();
    } catch (error) {
      const msg = error.response?.data?.msg || 'Failed to create battle.';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="battle-modal-overlay"
      onMouseDown={(e) => {
        console.log('CreateBattleModal overlay onMouseDown target:', e.target);
        mouseDownTarget.current = e.target;
      }}
      onClick={(e) => {
        const timeSinceMount = Date.now() - mountTimeRef.current;
        console.log('CreateBattleModal overlay onClick target:', e.target, 'currentTarget:', e.currentTarget, 'mouseDownTarget:', mouseDownTarget.current, 'timeSinceMount:', timeSinceMount);
        if (timeSinceMount < 800) {
          console.log('Ignoring overlay click because it occurred within 800ms of mount (synthesized click prevention)');
          return;
        }
        if (e.target === e.currentTarget && mouseDownTarget.current === e.currentTarget) {
          console.log('CreateBattleModal calling onClose from overlay click');
          onClose();
        }
      }}
    >
      <div className="create-battle-modal">
        <div className="modal-header">
          <h2>⚔️ Challenge a Friend</h2>
          <button className="modal-close-btn" onClick={() => {
            console.log('CreateBattleModal close button clicked');
            onClose();
          }}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Opponent search */}
          <div className="modal-form-group">
            <label>Opponent</label>
            {!selectedOpponent ? (
              <>
                <input
                  type="text"
                  className="modal-input"
                  placeholder="Search by username..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                />
                {searching && (
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '6px' }}>
                    Searching...
                  </div>
                )}
                {searchResults.length > 0 && (
                  <div className="search-results">
                    {searchResults.map(user => (
                      <div
                        key={user._id}
                        className="search-result-item"
                        onClick={() => handleSelectOpponent(user)}
                      >
                        <div className="search-result-avatar">
                          {renderAvatar(user.avatar, user.username)}
                        </div>
                        <div className="search-result-info">
                          <div className="search-result-name">{user.username}</div>
                          <div className="search-result-level">Level {user.user_level || 1}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {searchQuery.trim() && !searching && searchResults.length === 0 && (
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '6px' }}>
                    No users found matching "{searchQuery}"
                  </div>
                )}
              </>
            ) : (
              <div className="selected-opponent">
                <div className="search-result-avatar">
                  {renderAvatar(selectedOpponent.avatar, selectedOpponent.username)}
                </div>
                <div className="selected-opponent-info">
                  <div className="selected-opponent-name">{selectedOpponent.username}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                    Level {selectedOpponent.user_level || 1}
                  </div>
                </div>
                <button type="button" className="btn-remove-opponent" onClick={handleRemoveOpponent}>
                  ✕
                </button>
              </div>
            )}
          </div>

          {/* Habit name */}
          <div className="modal-form-group">
            <label>Habit Name</label>
            <input
              type="text"
              className="modal-input"
              placeholder="e.g. Morning Meditation, Exercise, Reading..."
              value={habitName}
              onChange={(e) => setHabitName(e.target.value)}
            />
          </div>

          {/* Date range */}
          <div className="modal-date-row">
            <div className="modal-form-group">
              <label>Start Date</label>
              <input
                type="date"
                className="modal-input"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div className="modal-form-group">
              <label>End Date</label>
              <input
                type="date"
                className="modal-input"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate}
              />
            </div>
          </div>

          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
            ⏱ Duration must be between 3–30 days. Default is 7 days.
          </div>

          <button
            type="submit"
            className="btn-submit-battle"
            disabled={submitting || !selectedOpponent || !habitName.trim()}
          >
            {submitting ? '⏳ Sending Challenge...' : '⚔️ Send Challenge'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreateBattleModal;
