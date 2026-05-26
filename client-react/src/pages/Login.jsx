import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import CountUp from 'react-countup';
import { FiArrowRight, FiMail, FiLock, FiUser, FiCheck, FiAlertCircle, FiSun, FiMoon } from 'react-icons/fi';
import axios from 'axios';
import '../Login.css';

const API_ORIGIN = import.meta.env.PROD ? '' : 'http://localhost:3000';

const Login = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [showOTPVerification, setShowOTPVerification] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
  });
  const [otpData, setOtpData] = useState({
    otp: '',
    email: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [otpTimer, setOtpTimer] = useState(0);
  const [stats, setStats] = useState({ totalUsers: 0, totalHabits: 0, totalCheckins: 0 });

  const { login, register, isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await axios.get(`${API_ORIGIN}/api/stats/public`);

        // Defensive: ensure the response is an object with numeric fields.
        const data = response?.data;
        if (data && typeof data === 'object') {
          // coerce to numbers where possible
          const parsed = {
            totalUsers: Number(data.totalUsers) || 0,
            totalHabits: Number(data.totalHabits) || 0,
            totalCheckins: Number(data.totalCheckins) || 0
          };
          setStats(parsed);
        } else {
          console.warn('Unexpected stats response, using defaults:', data);
          setStats({ totalUsers: 0, totalHabits: 0, totalCheckins: 0 });
        }
      } catch (error) {
        console.error('Failed to fetch stats:', error);
        setStats({ totalUsers: 0, totalHabits: 0, totalCheckins: 0 });
      }
    };
    fetchStats();
  }, []);

  useEffect(() => {
    document.body.classList.remove('light-mode');
    document.body.classList.add('dark-mode');
  }, []);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, authLoading, navigate]);

  // OTP Timer countdown - MUST be before any conditional returns
  useEffect(() => {
    if (otpTimer > 0 && showOTPVerification) {
      const interval = setInterval(() => {
        setOtpTimer(prev => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [otpTimer, showOTPVerification]);

  if (authLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div className="loading-spinner"></div>
      </div>
    );
  }

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError('');
  };

  const validateForm = () => {
    if (!formData.email || !formData.password) {
      setError('Email and password are required');
      return false;
    }
    if (!isLogin && !formData.username) {
      setError('Username is required');
      return false;
    }
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      return false;
    }
    return true;
  };



  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      if (isLogin) {
        await login({
          email: formData.email,
          password: formData.password,
        });
        navigate('/dashboard');
      } else {
        // Send OTP for registration
        const response = await axios.post(`${API_ORIGIN}/api/users/register/send-otp`, {
          username: formData.username,
          email: formData.email,
          password: formData.password,
        });
        
        setOtpData({ ...otpData, email: formData.email });
        setShowOTPVerification(true);
        setSuccess('✅ OTP sent! Check your inbox and spam folder.');
        setOtpTimer(600); // 10 minutes in seconds
      }
    } catch (err) {
      console.error('Auth error:', err);
      const errorMessage = err.response?.data?.message || err.response?.data?.msg || err.message || 'An error occurred. Please try again.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleOTPVerify = async (e) => {
    e.preventDefault();
    
    if (!otpData.otp || otpData.otp.length !== 6) {
      setError('Please enter a valid 6-digit OTP');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await axios.post(`${API_ORIGIN}/api/users/register/verify-otp`, {
        email: otpData.email,
        otp: otpData.otp,
      });

      // Store token and update auth context
      localStorage.setItem('token', response.data.token);
      setSuccess('Account created successfully!');
      
      // Navigate to dashboard after short delay
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 1000);

    } catch (err) {
      console.error('OTP verification error:', err);
      const errorMessage = err.response?.data?.message || err.response?.data?.msg || err.message || 'Invalid OTP. Please try again.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await axios.post(`${API_ORIGIN}/api/users/register/resend-otp`, {
        email: otpData.email,
      });
      
      setSuccess(response.data.message);
      setOtpTimer(600); // Reset timer to 10 minutes
      setOtpData({ ...otpData, otp: '' }); // Clear OTP input

    } catch (err) {
      console.error('Resend OTP error:', err);
      const errorMessage = err.response?.data?.message || err.response?.data?.msg || err.message || 'Failed to resend OTP.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="auth-page">
      <motion.nav
        className="navbar"
        initial={{ y: -80 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="nav-container">
          <Link to="/" className="brand">
            Aadat<span className="neon-dot"></span>
          </Link>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>

            <Link to="/" className="back-link" style={{ textDecoration: 'none', fontWeight: 500 }}>Back</Link>
          </div>
        </div>
      </motion.nav>



      <div className="auth-container">
        <div className="auth-content">
          {/* Left Side - Branding */}
          <motion.div
            className="auth-branding"
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
          >
            <div className="branding-content">
              <motion.div
                className="brand-logo"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.4 }}
              >
                <span className="logo-text">Aadat</span>
                <span className="neon-dot-large"></span>
              </motion.div>
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.6 }}
              >
                Build habits that actually stick
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.7 }}
              >
                Join {stats.totalUsers > 0 && <CountUp end={stats.totalUsers} duration={2} separator="," />}{stats.totalUsers > 0 && '+'} users who are transforming their lives, one habit at a time.
              </motion.p>

              <motion.div
                className="auth-stats"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.8 }}
              >
                <div className="auth-stat">
                  <div className="stat-num">{stats.totalUsers > 0 ? <CountUp end={stats.totalUsers} duration={2.5} separator="," /> : '...'}</div>
                  <div className="stat-txt">Active users</div>
                </div>
                <div className="auth-stat">
                  <div className="stat-num">{stats.totalHabits > 0 ? <CountUp end={stats.totalHabits} duration={2.5} separator="," /> : '...'}</div>
                  <div className="stat-txt">Habits tracked</div>
                </div>
                <div className="auth-stat">
                  <div className="stat-num">{stats.totalCheckins > 0 ? <CountUp end={stats.totalCheckins} duration={2.5} separator="," /> : '...'}</div>
                  <div className="stat-txt">Check-ins</div>
                </div>
              </motion.div>

              <motion.div
                className="live-activity"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 1 }}
              >
                <div className="live-pulse"></div>
                <span>{Math.floor(stats.totalUsers / 50)} people started their journey today</span>
              </motion.div>
            </div>
          </motion.div>

          {/* Right Side - Auth Forms */}
          <motion.div
            className="auth-forms"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
          >
            <div className="form-wrapper">
              <div className="auth-tabs">
                <motion.button
                  className={`auth-tab ${isLogin ? 'active' : ''}`}
                  onClick={() => setIsLogin(true)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Sign in
                </motion.button>
                <motion.button
                  className={`auth-tab ${!isLogin ? 'active' : ''}`}
                  onClick={() => setIsLogin(false)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Sign up
                </motion.button>
              </div>

              <div className="form-section active">
                {showOTPVerification && !isLogin ? (
                  // OTP Verification Form
                  <>
                    <div className="form-header">
                      <h2>🔐 Verify Your Email</h2>
                      <p>Enter the 6-digit code sent to {otpData.email}</p>
                      <div style={{ 
                        background: 'rgba(255, 193, 7, 0.1)', 
                        border: '1px solid rgba(255, 193, 7, 0.3)',
                        borderRadius: '8px',
                        padding: '10px 15px',
                        marginTop: '12px',
                        fontSize: '13px',
                        color: '#ffc107',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        <FiMail />
                        <span>📧 Check your <strong>spam folder</strong> if you don't see the email</span>
                      </div>
                    </div>

                    <form onSubmit={handleOTPVerify}>
                      <motion.div
                        className="input-group"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                      >
                        <label htmlFor="otp">Verification Code</label>
                        <input
                          type="text"
                          id="otp"
                          name="otp"
                          placeholder="000000"
                          value={otpData.otp}
                          onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                            setOtpData({ ...otpData, otp: value });
                            setError('');
                          }}
                          maxLength={6}
                          style={{ 
                            fontSize: '24px', 
                            letterSpacing: '8px', 
                            textAlign: 'center',
                            fontFamily: 'monospace',
                            fontWeight: 'bold'
                          }}
                          required
                          autoFocus
                        />
                        {otpTimer > 0 && (
                          <div className="password-hint" style={{ color: '#00ff88', fontWeight: '600' }}>
                            ⏱️ Code expires in {formatTime(otpTimer)}
                          </div>
                        )}
                        {otpTimer === 0 && (
                          <div className="password-hint" style={{ color: '#e53e3e', fontWeight: '600' }}>
                            ⚠️ Code expired. Please request a new one.
                          </div>
                        )}
                      </motion.div>

                      <AnimatePresence mode="wait">
                        {success && (
                          <motion.div
                            className="error-message"
                            style={{
                              color: '#00ff88',
                              background: 'rgba(0, 255, 136, 0.1)',
                              padding: '12px',
                              borderRadius: '8px',
                              marginBottom: '1rem',
                              border: '1px solid rgba(0, 255, 136, 0.3)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px'
                            }}
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                          >
                            <FiCheck />
                            {success}
                          </motion.div>
                        )}
                        {error && (
                          <motion.div
                            className="error-message"
                            style={{
                              color: '#ff4444',
                              background: 'rgba(255, 68, 68, 0.1)',
                              padding: '12px',
                              borderRadius: '8px',
                              marginBottom: '1rem',
                              border: '1px solid rgba(255, 68, 68, 0.3)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px'
                            }}
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                          >
                            <FiAlertCircle />
                            {error}
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <motion.button
                        type="submit"
                        className="btn-submit"
                        disabled={loading || otpData.otp.length !== 6 || otpTimer === 0}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        {loading ? (
                          <>
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                              style={{ display: 'inline-block' }}
                            >
                              ⏳
                            </motion.div>
                            Verifying...
                          </>
                        ) : (
                          <>
                            Verify & Create Account
                            <FiCheck />
                          </>
                        )}
                      </motion.button>

                      <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                        <button
                          type="button"
                          onClick={handleResendOTP}
                          disabled={loading || otpTimer > 540}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: otpTimer > 540 ? '#999' : '#00ff88',
                            cursor: otpTimer > 540 ? 'not-allowed' : 'pointer',
                            fontSize: '14px',
                            fontWeight: '600',
                            textDecoration: 'underline'
                          }}
                        >
                          {otpTimer > 540 ? 'Resend available in ' + formatTime(otpTimer - 540) : 'Resend Code'}
                        </button>
                        <span style={{ margin: '0 1rem', color: '#999' }}>|</span>
                        <button
                          type="button"
                          onClick={() => {
                            setShowOTPVerification(false);
                            setOtpData({ otp: '', email: '' });
                            setOtpTimer(0);
                            setError('');
                            setSuccess('');
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#999',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: '600',
                            textDecoration: 'underline'
                          }}
                        >
                          Change Email
                        </button>
                      </div>
                    </form>
                  </>
                ) : (
                  // Regular Login/Signup Form
                  <>
                    <div className="form-header">
                      <h2>{isLogin ? 'Welcome back' : 'Create an account'}</h2>
                      <p>
                        {isLogin
                          ? 'Enter your credentials to access your account'
                          : 'Start building better habits today'}
                      </p>
                    </div>

                    <form onSubmit={handleSubmit}>
                  <AnimatePresence mode="wait">
                    {!isLogin && (
                      <motion.div
                        className="input-group"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <label htmlFor="username"><FiUser /> Username</label>
                        <input
                          type="text"
                          id="username"
                          name="username"
                          placeholder="johndoe"
                          value={formData.username}
                          onChange={handleChange}
                          required={!isLogin}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <motion.div
                    className="input-group"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                  >
                    <label htmlFor="email"><FiMail /> Email address</label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      placeholder="you@example.com"
                      value={formData.email}
                      onChange={handleChange}
                      required
                    />
                  </motion.div>

                  <motion.div
                    className="input-group"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    <label htmlFor="password"><FiLock /> Password</label>
                    <input
                      type="password"
                      id="password"
                      name="password"
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={handleChange}
                      required
                    />
                    {!isLogin && (
                      <div className="password-hint">At least 8 characters</div>
                    )}
                  </motion.div>

                  <AnimatePresence mode="wait">
                    {success && (
                      <motion.div
                        className="error-message"
                        style={{
                          color: '#00ff88',
                          background: 'rgba(0, 255, 136, 0.1)',
                          padding: '12px',
                          borderRadius: '8px',
                          marginBottom: '1rem',
                          border: '1px solid rgba(0, 255, 136, 0.3)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                      >
                        <FiCheck />
                        {success}
                      </motion.div>
                    )}
                    {error && (
                      <motion.div
                        className="error-message"
                        style={{
                          color: '#ff4444',
                          background: 'rgba(255, 68, 68, 0.1)',
                          padding: '12px',
                          borderRadius: '8px',
                          marginBottom: '1rem',
                          border: '1px solid rgba(255, 68, 68, 0.3)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                      >
                        <FiAlertCircle />
                        {error}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {isLogin && (
                    <div className="form-footer">
                      <label className="checkbox-label">
                        <input type="checkbox" name="remember" />
                        <span>Remember me</span>
                      </label>
                      <a href="#" className="forgot-link">Forgot password?</a>
                    </div>
                  )}

                  <motion.button
                    type="submit"
                    className="btn-submit"
                    disabled={loading}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {loading ? (
                      <>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          style={{ display: 'inline-block' }}
                        >
                          ⏳
                        </motion.div>
                        Loading...
                      </>
                    ) : (
                      <>
                        {isLogin ? 'Sign in' : 'Create account'}
                        <FiArrowRight />
                      </>
                    )}
                  </motion.button>
                </form>
                </>
                )}
              </div>

              {!showOTPVerification && (
                <>
                  <div className="divider">
                    <span>Or continue with</span>
                  </div>


              <div className="social-buttons">
                {/** Use the shared API base for production or local dev */}
                {(() => {
                  return <>
                    <motion.button
                      className="social-btn"
                      onClick={() => window.location.href = `${API_ORIGIN}/api/users/auth/google`}
                      whileTap={{ scale: 0.98 }}
                    >
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M10.2 8.3V12h5.3c-.2 1.2-1.4 3.5-5.3 3.5-3.2 0-5.8-2.6-5.8-5.8s2.6-5.8 5.8-5.8c1.8 0 3 .8 3.7 1.4l2.9-2.8C14.6 1 12.6 0 10.2 0 4.6 0 0 4.6 0 10.2s4.6 10.2 10.2 10.2c5.9 0 9.8-4.1 9.8-9.9 0-.7-.1-1.2-.1-1.7h-9.7z" />
                      </svg>
                      Google
                    </motion.button>
                    <motion.button
                      className="social-btn"
                      onClick={() => window.location.href = `${API_ORIGIN}/api/users/auth/github`}
                      whileTap={{ scale: 0.98 }}
                    >
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M10 0C4.477 0 0 4.477 0 10c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0110 4.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C17.137 18.165 20 14.418 20 10c0-5.523-4.477-10-10-10z" />
                      </svg>
                      GitHub
                    </motion.button>
                  </>;
                })()}
              </div>
              </>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div >
  );
};

export default Login;
