import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { useEffect } from 'react';
import PrivateRoute from './components/PrivateRoute';
import ErrorBoundary from './components/ErrorBoundary';
import Landing from './pages/Landing';
import Login from './pages/Login';
import AuthCallback from './pages/AuthCallback';
import Dashboard from './pages/Dashboard';
import Community from './pages/Community';
import Leaderboard from './pages/Leaderboard';
import Roadmap from './pages/Roadmap';
import Profile from './pages/Profile';
import EditProfile from './pages/EditProfile';
import './style.css';

function App() {
  useEffect(() => {
    localStorage.setItem('theme', 'dark');
    document.body.classList.remove('light-mode');
    document.body.classList.add('dark-mode');
  }, []);

  return (
    <Router>
      <AuthProvider>
        <ToastProvider>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route 
            path="/dashboard" 
            element={
              <PrivateRoute>
                <ErrorBoundary>
                  <Dashboard />
                </ErrorBoundary>
              </PrivateRoute>
            } 
          />
          <Route 
            path="/community" 
            element={
              <PrivateRoute>
                <ErrorBoundary>
                  <Community />
                </ErrorBoundary>
              </PrivateRoute>
            } 
          />
          <Route 
            path="/leaderboard" 
            element={
              <PrivateRoute>
                <ErrorBoundary>
                  <Leaderboard />
                </ErrorBoundary>
              </PrivateRoute>
            } 
          />
          <Route 
            path="/roadmap" 
            element={
              <PrivateRoute>
                <Roadmap />
              </PrivateRoute>
            } 
          />
          <Route 
            path="/roadmap/:habitId" 
            element={
              <PrivateRoute>
                <Roadmap />
              </PrivateRoute>
            } 
          />
          <Route 
            path="/profile" 
            element={
              <PrivateRoute>
                <ErrorBoundary>
                  <Profile />
                </ErrorBoundary>
              </PrivateRoute>
            } 
          />
          <Route 
            path="/profile/edit" 
            element={
              <PrivateRoute>
                <ErrorBoundary>
                  <EditProfile />
                </ErrorBoundary>
              </PrivateRoute>
            } 
          />
          <Route 
            path="/profile/:id"
            element={
              <PrivateRoute>
                <ErrorBoundary>
                  <Profile />
                </ErrorBoundary>
              </PrivateRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </ToastProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
