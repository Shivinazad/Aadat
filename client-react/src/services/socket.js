import { io } from 'socket.io-client';

let socketInstance = null;

const resolveSocketUrl = () => {
  const explicit = import.meta.env.VITE_SOCKET_URL;
  if (explicit) return explicit;

  const apiBase = import.meta.env.VITE_API_BASE_URL;
  if (apiBase) {
    return apiBase.replace(/\/api\/?$/, '');
  }

  if (import.meta.env.PROD) {
    return window.location.origin;
  }

  return 'http://localhost:3000';
};

const getSocket = () => {
  if (!socketInstance) {
    socketInstance = io(resolveSocketUrl(), {
      autoConnect: false,
      transports: ['websocket', 'polling'],
      withCredentials: true
    });
  }

  return socketInstance;
};

export const connectSocket = () => {
  const socket = getSocket();
  const token = localStorage.getItem('token');

  // If token has changed, update auth and reconnect to re-authenticate
  if (socket.auth?.token !== token) {
    socket.auth = token ? { token } : {};
    if (socket.connected) {
      socket.disconnect();
    }
  }

  if (!socket.connected) {
    socket.connect();
  }

  return socket;
};

export const subscribeToDataChanges = (handler) => {
  const socket = connectSocket();
  socket.on('data:changed', handler);

  return () => {
    socket.off('data:changed', handler);
  };
};

export const disconnectSocket = () => {
  if (socketInstance?.connected) {
    socketInstance.disconnect();
  }
};
