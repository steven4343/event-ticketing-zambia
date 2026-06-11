import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/router';
import api from '../services/api';
import toast from 'react-hot-toast';

const AuthContext = createContext(null);
const SESSION_TIMEOUT_MS = 10 * 60 * 1000;
const WARNING_BEFORE = 60 * 1000;

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showWarning, setShowWarning] = useState(false);
  const inactivityTimer = useRef(null);
  const warningTimer = useRef(null);
  const router = useRouter();

  const clearTimers = () => {
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    if (warningTimer.current) clearTimeout(warningTimer.current);
  };

  const resetInactivityTimer = useCallback(() => {
    if (!user) return;
    clearTimers();
    warningTimer.current = setTimeout(() => {
      setShowWarning(true);
      toast('Session will expire due to inactivity', { icon: '⚠️', duration: 5000 });
    }, SESSION_TIMEOUT_MS - WARNING_BEFORE);
    inactivityTimer.current = setTimeout(async () => {
      setShowWarning(false);
      try {
        await api.post('/auth/logout');
      } catch {}
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      setUser(null);
      toast.error('Session expired. Please login again.');
      router.push('/login');
    }, SESSION_TIMEOUT_MS);
  }, [user, router]);

  useEffect(() => {
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'mousemove'];
    const handler = () => {
      if (user) {
        setShowWarning(false);
        resetInactivityTimer();
      }
    };
    events.forEach(e => window.addEventListener(e, handler));
    return () => events.forEach(e => window.removeEventListener(e, handler));
  }, [user, resetInactivityTimer]);

  useEffect(() => {
    const initAuth = async () => {
      const accessToken = localStorage.getItem('accessToken') || localStorage.getItem('token');
      if (!accessToken) {
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          try {
            const { data } = await api.post('/auth/refresh', { refreshToken });
            localStorage.setItem('accessToken', data.accessToken);
            localStorage.setItem('token', data.accessToken);
            localStorage.setItem('refreshToken', data.refreshToken);
            api.defaults.headers.common['Authorization'] = `Bearer ${data.accessToken}`;
            const me = await api.get('/auth/me');
            setUser(me.data);
          } catch {
            localStorage.removeItem('accessToken');
            localStorage.removeItem('token');
            localStorage.removeItem('refreshToken');
          }
        }
        setLoading(false);
        return;
      }
      api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
      try {
        const { data } = await api.get('/auth/me');
        setUser(data);
        resetInactivityTimer();
      } catch {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('token');
      }
      setLoading(false);
    };
    initAuth();
  }, [resetInactivityTimer]);

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('accessToken', data.token);
    localStorage.setItem('token', data.token);
    localStorage.setItem('refreshToken', data.refreshToken);
    api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
    setUser(data.user);
    resetInactivityTimer();
    return data;
  };

  const register = async (formData) => {
    const { data } = await api.post('/auth/register', formData);
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('token', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    api.defaults.headers.common['Authorization'] = `Bearer ${data.accessToken}`;
    setUser(data.user);
    return data;
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout', {
        refreshToken: localStorage.getItem('refreshToken'),
      });
    } catch {}
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    delete api.defaults.headers.common['Authorization'];
    setUser(null);
    clearTimers();
    setShowWarning(false);
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, showWarning, setShowWarning }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
