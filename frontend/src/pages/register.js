import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useAuth } from '../context/AuthContext';
import { GoogleLogin } from '@react-oauth/google';
import toast from 'react-hot-toast';

export default function Register() {
  const router = useRouter();
  const { register, user } = useAuth();
  const [googleLoading, setGoogleLoading] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirmPassword: '', role: 'customer' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) router.push('/');
  }, [user, router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      return toast.error('Passwords do not match');
    }
    if (form.password.length < 8) {
      return toast.error('Password must be at least 8 characters');
    }
    setLoading(true);
    try {
      await register({
        name: form.name,
        email: form.email,
        phone: form.phone,
        password: form.password,
        role: form.role,
      });
      toast.success('Registration successful!');
      router.push('/');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white p-6 sm:p-8 rounded-lg shadow-sm w-full max-w-md">
        <h1 className="text-2xl font-bold text-center mb-6">Create Account</h1>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" required />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" required />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone (0977XXXXXX)</label>
            <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" required />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Password (min 8 chars)</label>
            <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" required minLength={8} />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
            <input type="password" value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" required />
          </div>
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">I want to...</label>
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg bg-white">
              <option value="customer">Buy Tickets</option>
              <option value="organizer">Sell Tickets (Organizer)</option>
            </select>
          </div>
          <button type="submit" disabled={loading}
            className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold disabled:opacity-50 hover:bg-blue-700 transition">
            {loading ? <span className="flex items-center justify-center gap-2"><span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" /> Creating account...</span> : 'Register'}
          </button>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
          <div className="relative flex justify-center"><span className="bg-white px-4 text-sm text-gray-500">or continue with</span></div>
        </div>

        <div className="flex justify-center">
          {googleLoading ? (
            <span className="flex items-center gap-2 px-6 py-2 border rounded-lg text-sm text-gray-500">
              <span className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full" />
              Connecting...
            </span>
          ) : (
            <GoogleLogin
              onSuccess={async (credentialResponse) => {
                setGoogleLoading(true);
                try {
                  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/google`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ credential: credentialResponse.credential }),
                  });
                  const data = await res.json();
                  if (!res.ok) throw new Error(data.error);
                  localStorage.setItem('accessToken', data.token);
                  localStorage.setItem('refreshToken', data.refreshToken);
                  window.location.href = '/tickets';
                } catch (err) {
                  toast.error(err.message || 'Google sign-up failed');
                } finally {
                  setGoogleLoading(false);
                }
              }}
              onError={() => toast.error('Google sign-up failed')}
              theme="outline"
              size="large"
              text="signup_with"
              shape="rectangular"
            />
          )}
        </div>

        <p className="text-center mt-4 text-sm text-gray-600">
          Already have an account? <Link href="/login" className="text-blue-600 font-medium hover:underline">Login</Link>
        </p>
      </div>
    </div>
  );
}
