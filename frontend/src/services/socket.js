import { io } from 'socket.io-client';
import toast from 'react-hot-toast';

let socket = null;

export const connectSocket = (token) => {
  if (socket?.connected) return socket;

  const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';

  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ['polling', 'websocket'],
  });

  socket.on('connect', () => {
    console.log('Socket connected');
  });

  socket.on('notification', (data) => {
    toast(data.title, { icon: '🔔', duration: 4000 });
  });

  socket.on('payment-confirmed', (data) => {
    toast.success('Payment confirmed! Tickets ready.');
  });

  socket.on('payment-failed', () => {
    toast.error('Payment failed. Please try again.');
  });

  socket.on('event-status', (data) => {
    toast(`Event "${data.title}" ${data.status}`, {
      icon: data.status === 'approved' ? '✅' : '❌',
    });
  });

  socket.on('disconnect', () => {
    console.log('Socket disconnected');
  });

  socket.on('connect_error', (err) => {
    console.warn('Socket connection error:', err.message);
  });

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const getSocket = () => socket;

export const joinEventRoom = (eventId) => {
  if (socket?.connected) socket.emit('join-event', eventId);
};

export const leaveEventRoom = (eventId) => {
  if (socket?.connected) socket.emit('leave-event', eventId);
};

export default socket;
