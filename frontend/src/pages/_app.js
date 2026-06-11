import { useEffect } from 'react';
import { useRouter } from 'next/router';
import '../styles/globals.css';
import { Toaster } from 'react-hot-toast';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { connectSocket, disconnectSocket } from '../services/socket';

const publicPaths = ['/', '/login', '/register', '/events/', '/events/[id]'];

function AuthGuard({ children }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const isPublic = publicPaths.some(p => router.pathname === p || router.pathname.startsWith(p));

  useEffect(() => {
    if (!loading && !user && !isPublic) {
      router.push('/login');
    }
  }, [user, loading, isPublic, router]);

  useEffect(() => {
    if (user) {
      const token = localStorage.getItem('accessToken');
      const s = connectSocket(token);
      return () => { disconnectSocket(); };
    }
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500" />
      </div>
    );
  }

  return children;
}

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';

function App({ Component, pageProps }) {
  const content = (
    <AuthProvider>
      <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
      <AuthGuard>
        <Component {...pageProps} />
      </AuthGuard>
    </AuthProvider>
  );

  if (!GOOGLE_CLIENT_ID) return content;

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      {content}
    </GoogleOAuthProvider>
  );
}

export default App;
