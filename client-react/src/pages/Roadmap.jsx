import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { habitsAPI } from '../services/api';
import { subscribeToDataChanges } from '../services/socket';
import RoadmapDisplay from '../components/RoadmapDisplay';
import Navbar from '../components/Navbar';
import { FiArrowLeft, FiMapPin, FiChevronDown } from 'react-icons/fi';
import '../styles/Roadmap.css';

const Roadmap = () => {
  const { habitId } = useParams();
  const navigate = useNavigate();
  const [habits, setHabits] = useState([]);
  const [selectedHabit, setSelectedHabit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showDropdown, setShowDropdown] = useState(false);

  const getHabitId = (habit) => habit?._id?.toString?.() || habit?.id?.toString?.() || habit?.id || habit?._id;

  useEffect(() => {
    fetchHabits();
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToDataChanges((event) => {
      if (!event?.scope) return;
      if (event.scope === 'habits') {
        fetchHabits();
      }
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    // If habitId is provided, select that habit
    if (habitId && habits.length > 0) {
      const habit = habits.find(h => String(getHabitId(h)) === String(habitId));
      if (habit) {
        setSelectedHabit(habit);
      }
    }
  }, [habitId, habits]);

  const fetchHabits = async () => {
    try {
      const response = await habitsAPI.getAll();
      // Filter only habits with roadmaps
      const habitsWithRoadmaps = response.data.filter(
        habit => habit.roadmap && Array.isArray(habit.roadmap) && habit.roadmap.length > 0
      );
      setHabits(habitsWithRoadmaps);
      
      // Auto-select habit if habitId provided
      if (habitId) {
        const habit = habitsWithRoadmaps.find(h => String(getHabitId(h)) === String(habitId));
        if (habit) {
          setSelectedHabit(habit);
        } else if (habitsWithRoadmaps.length > 0) {
          setSelectedHabit(habitsWithRoadmaps[0]);
        }
      } else if (habitsWithRoadmaps.length > 0) {
        setSelectedHabit(habitsWithRoadmaps[0]);
      }
    } catch (error) {
      console.error('Failed to fetch habits:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleHabitSelect = (habit) => {
    setSelectedHabit(habit);
    setShowDropdown(false);
    // Update URL without full page reload
    window.history.pushState({}, '', `/roadmap/${getHabitId(habit)}`);
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

  if (habits.length === 0) {
    return (
      <div>
        <Navbar />
        <div className="roadmap-error-container">
          <div className="roadmap-error-card">
            <div className="error-icon">🗺️</div>
            <h2>No Roadmaps Yet</h2>
            <p>Create a habit with AI Roadmap enabled to see your personalized journey here!</p>
            <button 
              className="btn-back-to-dashboard" 
              onClick={() => navigate('/dashboard')}
            >
              <FiArrowLeft />
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Navbar />
      
      <div className="roadmap-page-with-sidebar">
        {/* Left Sidebar */}
        <div className="roadmap-sidebar">
          <div className="sidebar-header">
            <button 
              className="sidebar-back-btn"
              onClick={() => navigate('/dashboard')}
            >
              <FiArrowLeft />
              <span>Back</span>
            </button>
            <h2 className="sidebar-title">My Roadmaps</h2>
          </div>

          <div className="sidebar-habits-list">
            {habits.map((habit) => (
              <motion.div
                key={getHabitId(habit)}
                className={`sidebar-habit-card ${String(getHabitId(selectedHabit)) === String(getHabitId(habit)) ? 'active' : ''}`}
                onClick={() => handleHabitSelect(habit)}
                whileHover={{ x: 4 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="sidebar-habit-content">
                  <h3 className="sidebar-habit-title">{habit.habitTitle}</h3>
                  {habit.habitCategory && (
                    <span className="sidebar-habit-category">{habit.habitCategory}</span>
                  )}
                  <div className="sidebar-habit-meta">
                    <FiMapPin size={14} />
                    <span>{habit.roadmap?.length || 0} checkpoints</span>
                  </div>
                </div>
                {String(getHabitId(selectedHabit)) === String(getHabitId(habit)) && (
                  <div className="sidebar-active-indicator" />
                )}
              </motion.div>
            ))}
          </div>
        </div>

        {/* Right Content Area */}
        <div className="roadmap-main-area">
          {selectedHabit && (
            <motion.div
              key={getHabitId(selectedHabit)}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4 }}
            >
              <RoadmapDisplay 
                roadmap={selectedHabit.roadmap}
                habitId={getHabitId(selectedHabit)}
                aiDescription={selectedHabit.aiDescription}
                roadmapProgress={selectedHabit.roadmapProgress}
              />
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Roadmap;
