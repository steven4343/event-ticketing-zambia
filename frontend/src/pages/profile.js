import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useAuth } from '../context/AuthContext';
import { changePassword as changePasswordApi } from '../services/api';
import Breadcrumbs from '../components/Breadcrumbs';
import NotificationBell from '../components/NotificationBell';
import toast from 'react-hot-toast';

export default function Profile() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [changing, setChanging] = useState(false);

  if (!user) {
    router.push('/login');
    return null;
  }

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      return toast.error('Passwords do not match');
    }
    if (pwForm.newPassword.length < 8) {
      return toast.error('Password must be at least 8 characters');
    }
    setChanging(true);
    try {
      await changePasswordApi({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword });
      toast.success('Password changed. Please login again.');
      await logout();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to change password');
    } finally {
      setChanging(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <nav className="max-w-3xl mx-auto px-4 py-4 flex flex-wrap items-center gap-2">
          <Link href="/" className="text-lg sm:text-xl font-bold text-blue-600">EventHub Zambia</Link>
          <div className="flex items-center gap-2 sm:gap-4 ml-auto">
            <NotificationBell />
            <button onClick={logout} className="text-red-600 text-sm font-medium">Logout</button>
          </div>
        </nav>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <Breadcrumbs pathname={router.pathname} />
        <h1 className="text-2xl font-bold mb-6">My Profile</h1>

        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-500">Name</label>
              <p className="font-medium">{user.name}</p>
            </div>
            <div>
              <label className="text-sm text-gray-500">Email</label>
              <p className="font-medium">{user.email}</p>
            </div>
            <div>
              <label className="text-sm text-gray-500">Phone</label>
              <p className="font-medium">{user.phone}</p>
            </div>
            <div>
              <label className="text-sm text-gray-500">Role</label>
              <p className="font-medium capitalize">{user.role?.replace('_', ' ')}</p>
            </div>
            <div>
              <label className="text-sm text-gray-500">Member Since</label>
              <p className="font-medium">{new Date(user.created_at).toLocaleDateString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <button onClick={() => setShowPasswordForm(!showPasswordForm)}
            className="text-blue-600 font-medium hover:underline">
            {showPasswordForm ? 'Cancel' : 'Change Password'}
          </button>

          {showPasswordForm && (
            <form onSubmit={handleChangePassword} className="mt-4 space-y-4 max-w-md">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                <input type="password" value={pwForm.currentPassword}
                  onChange={(e) => setPwForm({ ...pwForm, currentPassword: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                <input type="password" value={pwForm.newPassword}
                  onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" required minLength={8} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                <input type="password" value={pwForm.confirmPassword}
                  onChange={(e) => setPwForm({ ...pwForm, confirmPassword: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" required />
              </div>
              <button type="submit" disabled={changing}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium disabled:opacity-50 hover:bg-blue-700">
                {changing ? 'Changing...' : 'Update Password'}
              </button>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
