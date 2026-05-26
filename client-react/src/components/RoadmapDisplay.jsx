import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiCheck, FiCircle, FiCheckCircle, FiLock, FiArrowLeft, FiCheckSquare, FiBookOpen, FiTarget, FiClock } from 'react-icons/fi';
import '../styles/RoadmapDisplay.css';

import { habitsAPI } from '../services/api';

const RoadmapDisplay = ({ roadmap, habitId, aiDescription, roadmapProgress }) => {
  const [selectedCheckpoint, setSelectedCheckpoint] = useState(null);
  const [completedCheckpoints, setCompletedCheckpoints] = useState([]);
  const [currentCheckpoint, setCurrentCheckpoint] = useState(0);
  const [completedSteps, setCompletedSteps] = useState({});

  useEffect(() => {
    if (roadmapProgress) {
      setCompletedCheckpoints(roadmapProgress.completed || []);
      setCurrentCheckpoint(roadmapProgress.current || 0);
      setCompletedSteps(roadmapProgress.completedSteps || {});
    } else {
      // Fallback/Legacy local storage read
      const savedProgress = localStorage.getItem(`roadmap_progress_${habitId}`);
      if (savedProgress) {
        const progress = JSON.parse(savedProgress);
        setCompletedCheckpoints(progress.completed || []);
        setCurrentCheckpoint(progress.current || 0);
        setCompletedSteps(progress.completedSteps || {});
      } else {
        setCompletedCheckpoints([]);
        setCurrentCheckpoint(0);
        setCompletedSteps({});
      }
    }
  }, [habitId, roadmapProgress]);

  const saveProgress = async (completed, current, steps = completedSteps) => {
    const progress = {
      completed,
      current,
      completedSteps: steps
    };
    
    // Update local state first (optimistic UI)
    setCompletedCheckpoints(completed);
    setCurrentCheckpoint(current);
    setCompletedSteps(steps);

    // Write to localStorage as quick fallback
    localStorage.setItem(`roadmap_progress_${habitId}`, JSON.stringify(progress));

    // Save to database
    try {
      await habitsAPI.update(habitId, { roadmapProgress: progress });
    } catch (error) {
      console.error('Failed to sync roadmap progress to DB:', error);
    }
  };

  if (!roadmap || roadmap.length === 0) {
    return (
      <div className="roadmap-empty">
        <div className="empty-icon">🗺️</div>
        <p>No roadmap available</p>
      </div>
    );
  }

  const handleCheckpointClick = (checkpoint, index) => {
    if (index <= currentCheckpoint) {
      setSelectedCheckpoint({ ...checkpoint, index });
    }
  };

  const handleCompleteCheckpoint = () => {
    const index = selectedCheckpoint.index;
    if (!completedCheckpoints.includes(index)) {
      const newCompleted = [...completedCheckpoints, index];
      const newCurrent = Math.max(currentCheckpoint, index + 1);
      setCompletedCheckpoints(newCompleted);
      setCurrentCheckpoint(newCurrent);
      saveProgress(newCompleted, newCurrent, completedSteps);
    }
    setSelectedCheckpoint(null);
  };

  const toggleStep = (checkpointIndex, stepIndex) => {
    const key = `${checkpointIndex}-${stepIndex}`;
    const newCompletedSteps = {
      ...completedSteps,
      [key]: !completedSteps[key]
    };
    setCompletedSteps(newCompletedSteps);
    saveProgress(completedCheckpoints, currentCheckpoint, newCompletedSteps);
  };

  const getStepCompletion = (checkpointIndex) => {
    if (!roadmap[checkpointIndex]?.actionSteps) return { completed: 0, total: 0 };
    const steps = roadmap[checkpointIndex].actionSteps;
    const completed = steps.filter((_, i) => completedSteps[`${checkpointIndex}-${i}`]).length;
    return { completed, total: steps.length };
  };

  const getStatus = (index) => {
    if (completedCheckpoints.includes(index)) return 'completed';
    if (index === currentCheckpoint) return 'active';
    if (index < currentCheckpoint) return 'available';
    return 'locked';
  };

  return (
    <div className="roadmap-display">
      {aiDescription && (
        <div className="ai-description-banner">
          <div className="ai-badge">🤖 AI Generated</div>
          <p>{aiDescription}</p>
        </div>
      )}

      <div className="roadmap-progress-bar">
        <div 
          className="progress-fill"
          style={{ width: `${(completedCheckpoints.length / roadmap.length) * 100}%` }}
        />
        <div className="progress-text">
          {completedCheckpoints.length} / {roadmap.length} Complete
        </div>
      </div>

      <div className="checkpoints-container">
        {roadmap.map((checkpoint, index) => {
          const status = getStatus(index);
          const isLocked = status === 'locked';
          const isActive = status === 'active';
          const isCompleted = status === 'completed';

          return (
            <motion.div
              key={index}
              className={`checkpoint-item checkpoint-${status}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <div className="checkpoint-icon-wrapper">
                <div 
                  className="checkpoint-icon"
                  onClick={() => !isLocked && handleCheckpointClick(checkpoint, index)}
                >
                  {isCompleted ? (
                    <FiCheckCircle />
                  ) : isLocked ? (
                    <FiLock />
                  ) : (
                    <FiCircle />
                  )}
                </div>
                {index < roadmap.length - 1 && (
                  <div className={`checkpoint-connector ${isCompleted ? 'completed' : ''}`} />
                )}
              </div>

              <div className="checkpoint-content">
                <div className="checkpoint-header">
                  <div className="checkpoint-meta">
                    <span className="checkpoint-number">#{checkpoint.checkpoint}</span>
                    <span className="checkpoint-day">Day {checkpoint.day}</span>
                  </div>
                  {isActive && <span className="active-badge">Current</span>}
                  {isCompleted && <span className="completed-badge">Done</span>}
                </div>

                <h3 className="checkpoint-title">{checkpoint.title}</h3>
                
                {!isLocked && (
                  <p className="checkpoint-preview">
                    {checkpoint.overview?.substring(0, 80)}...
                  </p>
                )}

                {isLocked ? (
                  <div className="locked-message">
                    <FiLock size={14} />
                    <span>Complete previous checkpoint to unlock</span>
                  </div>
                ) : (
                  <button 
                    className="view-details-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCheckpointClick(checkpoint, index);
                    }}
                  >
                    View Details →
                  </button>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Detail Side Panel - COMPLETELY REDESIGNED */}
      <AnimatePresence>
        {selectedCheckpoint && (
          <>
            {/* Dark Overlay */}
            <motion.div
              className="detail-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedCheckpoint(null)}
            />
            
            {/* Slide-in Panel */}
            <motion.div
              className="detail-panel"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
              {/* Panel Header */}
              <div className="panel-header">
                <button 
                  className="panel-back-btn" 
                  onClick={() => setSelectedCheckpoint(null)}
                >
                  <FiArrowLeft />
                  <span>Back to Roadmap</span>
                </button>
                
                <div className="panel-meta">
                  <div className="panel-checkpoint-badge">
                    Checkpoint {selectedCheckpoint.checkpoint}
                  </div>
                  <div className="panel-day-badge">
                    <FiClock size={14} />
                    Day {selectedCheckpoint.day}
                  </div>
                </div>

                <h1 className="panel-title">{selectedCheckpoint.title}</h1>

                <div className="panel-tags">
                  {selectedCheckpoint.difficulty && (
                    <span className={`panel-difficulty ${selectedCheckpoint.difficulty.toLowerCase()}`}>
                      {selectedCheckpoint.difficulty}
                    </span>
                  )}
                  {completedCheckpoints.includes(selectedCheckpoint.index) && (
                    <span className="panel-status-completed">
                      <FiCheckCircle size={14} />
                      Completed
                    </span>
                  )}
                  {selectedCheckpoint.index === currentCheckpoint && (
                    <span className="panel-status-current">
                      <div className="pulse-dot" />
                      Current
                    </span>
                  )}
                </div>
              </div>

              {/* Panel Content - Scrollable */}
              <div className="panel-content">
                {/* Overview Section */}
                {selectedCheckpoint.overview && (
                  <div className="panel-section">
                    <div className="section-icon-header">
                      <div className="section-icon">
                        <FiBookOpen />
                      </div>
                      <h3>Overview</h3>
                    </div>
                    <p className="overview-text">{selectedCheckpoint.overview}</p>
                  </div>
                )}

                {/* Action Steps Section */}
                {selectedCheckpoint.actionSteps && selectedCheckpoint.actionSteps.length > 0 && (
                  <div className="panel-section">
                    <div className="section-icon-header">
                      <div className="section-icon">
                        <FiTarget />
                      </div>
                      <h3>Action Steps</h3>
                      <span className="steps-counter">
                        {getStepCompletion(selectedCheckpoint.index).completed} / {getStepCompletion(selectedCheckpoint.index).total} completed
                      </span>
                    </div>
                    <div className="action-steps-container">
                      {selectedCheckpoint.actionSteps.map((step, i) => {
                        const isCompleted = completedSteps[`${selectedCheckpoint.index}-${i}`];
                        return (
                          <motion.div
                            key={i}
                            className={`action-step-item ${isCompleted ? 'completed' : ''}`}
                            onClick={() => toggleStep(selectedCheckpoint.index, i)}
                            whileHover={{ x: 4 }}
                            whileTap={{ scale: 0.98 }}
                          >
                            <div className="step-checkbox">
                              {isCompleted && <FiCheck />}
                            </div>
                            <span className="step-text">{step}</span>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Tips & Resources Section */}
                {selectedCheckpoint.tips && selectedCheckpoint.tips.length > 0 && (
                  <div className="panel-section">
                    <div className="section-icon-header">
                      <div className="section-icon">💡</div>
                      <h3>Tips & Resources</h3>
                    </div>
                    <div className="tips-container">
                      {selectedCheckpoint.tips.map((tip, i) => (
                        <div key={i} className="tip-item">
                          <div className="tip-bullet" />
                          <p>{tip}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Completion Progress Card */}
                {selectedCheckpoint.actionSteps && selectedCheckpoint.actionSteps.length > 0 && (
                  <div className="progress-summary-card">
                    <div className="progress-circle-container">
                      <svg className="progress-ring" width="80" height="80">
                        <circle
                          className="progress-ring-circle-bg"
                          cx="40"
                          cy="40"
                          r="36"
                        />
                        <circle
                          className="progress-ring-circle"
                          cx="40"
                          cy="40"
                          r="36"
                          style={{
                            strokeDasharray: `${2 * Math.PI * 36}`,
                            strokeDashoffset: `${2 * Math.PI * 36 * (1 - getStepCompletion(selectedCheckpoint.index).completed / getStepCompletion(selectedCheckpoint.index).total)}`
                          }}
                        />
                      </svg>
                      <div className="progress-percentage">
                        {Math.round((getStepCompletion(selectedCheckpoint.index).completed / getStepCompletion(selectedCheckpoint.index).total) * 100)}%
                      </div>
                    </div>
                    <div className="progress-summary-text">
                      <h4>Your Progress</h4>
                      <p>
                        {getStepCompletion(selectedCheckpoint.index).completed === getStepCompletion(selectedCheckpoint.index).total
                          ? "🎉 All steps completed! Mark this checkpoint as done."
                          : `${getStepCompletion(selectedCheckpoint.index).total - getStepCompletion(selectedCheckpoint.index).completed} step${getStepCompletion(selectedCheckpoint.index).total - getStepCompletion(selectedCheckpoint.index).completed !== 1 ? 's' : ''} remaining to complete this checkpoint.`
                        }
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Panel Footer - Sticky */}
              {!completedCheckpoints.includes(selectedCheckpoint.index) && (
                <div className="panel-footer">
                  <button 
                    className="panel-complete-btn" 
                    onClick={handleCompleteCheckpoint}
                  >
                    <FiCheckSquare size={20} />
                    Mark Checkpoint as Complete
                  </button>
                  <p className="panel-footer-note">
                    You can mark this complete even with pending steps
                  </p>
                </div>
              )}

              {completedCheckpoints.includes(selectedCheckpoint.index) && (
                <div className="panel-footer completed">
                  <div className="completion-badge">
                    <FiCheckCircle size={24} />
                    <div>
                      <h4>Checkpoint Completed!</h4>
                      <p>Great work! Continue to the next checkpoint.</p>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {completedCheckpoints.length === roadmap.length && (
        <motion.div
          className="completion-celebration"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200 }}
        >
          <div className="celebration-icon">🎉</div>
          <h3>Roadmap Complete!</h3>
          <p>Congratulations on completing your journey!</p>
        </motion.div>
      )}
    </div>
  );
};

export default RoadmapDisplay;
