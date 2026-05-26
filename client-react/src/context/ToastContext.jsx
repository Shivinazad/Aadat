import { createContext, useContext, useState, useCallback, useEffect } from 'react';

const ToastContext = createContext(null);

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback(({ message, type = 'error', duration = 5000 }) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const toast = {
    error: (message, duration) => addToast({ message, type: 'error', duration }),
    warn: (message, duration) => addToast({ message, type: 'warn', duration }),
    success: (message, duration) => addToast({ message, type: 'success', duration }),
    info: (message, duration) => addToast({ message, type: 'info', duration }),
  };

  // Bridge: listen for toast events from non-React code (e.g. axios interceptors)
  useEffect(() => {
    const handler = (e) => {
      const { message, type } = e.detail || {};
      if (message) addToast({ message, type: type || 'error' });
    };
    window.addEventListener('app-toast', handler);
    return () => window.removeEventListener('app-toast', handler);
  }, [addToast]);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
};

const ICONS = {
  error: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M10 6v4M10 13.5v.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  warn: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M9.134 3.5L1.6 16.5A1 1 0 002.466 18h15.068a1 1 0 00.866-1.5L10.866 3.5a1 1 0 00-1.732 0z" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M10 8v4M10 14.5v.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  success: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M6 10l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  info: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M10 9v5M10 6.5v.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
};

const TYPE_STYLES = {
  error: {
    accent: '#ff4d4d',
    bg: 'rgba(255, 77, 77, 0.08)',
    border: 'rgba(255, 77, 77, 0.3)',
    label: 'Error',
  },
  warn: {
    accent: '#f59e0b',
    bg: 'rgba(245, 158, 11, 0.08)',
    border: 'rgba(245, 158, 11, 0.3)',
    label: 'Warning',
  },
  success: {
    accent: '#39e096',
    bg: 'rgba(57, 224, 150, 0.08)',
    border: 'rgba(57, 224, 150, 0.3)',
    label: 'Success',
  },
  info: {
    accent: '#60a5fa',
    bg: 'rgba(96, 165, 250, 0.08)',
    border: 'rgba(96, 165, 250, 0.3)',
    label: 'Info',
  },
};

const ToastContainer = ({ toasts, onRemove }) => {
  if (!toasts.length) return null;

  return (
    <div style={{
      position: 'fixed',
      top: '80px',
      right: '20px',
      zIndex: 99999,
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      maxWidth: '420px',
      width: 'calc(100vw - 40px)',
      pointerEvents: 'none',
    }}>
      {toasts.map(toast => {
        const style = TYPE_STYLES[toast.type] || TYPE_STYLES.info;
        return (
          <div
            key={toast.id}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '14px',
              background: 'rgba(12, 12, 16, 0.96)',
              border: `1px solid ${style.border}`,
              borderLeft: `4px solid ${style.accent}`,
              borderRadius: '12px',
              padding: '16px 18px',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              boxShadow: `0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04), inset 0 1px 0 rgba(255,255,255,0.06)`,
              pointerEvents: 'all',
              animation: 'toastSlideIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}
          >
            {/* Icon */}
            <div style={{
              color: style.accent,
              flexShrink: 0,
              marginTop: '1px',
            }}>
              {ICONS[toast.type]}
            </div>

            {/* Content */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: '12px',
                fontWeight: '700',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: style.accent,
                marginBottom: '4px',
              }}>
                {style.label}
              </div>
              <div style={{
                fontSize: '14px',
                color: '#e2e8f0',
                lineHeight: '1.5',
                wordBreak: 'break-word',
              }}>
                {toast.message}
              </div>
            </div>

            {/* Close button */}
            <button
              onClick={() => onRemove(toast.id)}
              style={{
                background: 'none',
                border: 'none',
                color: '#666',
                cursor: 'pointer',
                padding: '2px',
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '4px',
                transition: 'color 0.2s',
                lineHeight: 1,
                fontSize: '18px',
              }}
              onMouseEnter={e => e.currentTarget.style.color = '#aaa'}
              onMouseLeave={e => e.currentTarget.style.color = '#666'}
            >
              ×
            </button>
          </div>
        );
      })}

      <style>{`
        @keyframes toastSlideIn {
          from { opacity: 0; transform: translateX(24px) scale(0.95); }
          to   { opacity: 1; transform: translateX(0) scale(1); }
        }
      `}</style>
    </div>
  );
};
