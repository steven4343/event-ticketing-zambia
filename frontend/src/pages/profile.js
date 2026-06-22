import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Breadcrumbs from '../components/Breadcrumbs';
import NotificationBell from '../components/NotificationBell';
import toast from 'react-hot-toast';
import { getMyProfile, updateMyProfile } from '../services/api';

export default function Profile() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '' });
  const [bank, setBank] = useState({ bank_name: '', account_name: '', account_number: '', branch: '' });

  useEffect(() => {
    getMyProfile().then(({ data }) => {
      setForm({ name: data.user.name, phone: data.user.phone });
      if (data.bank_details) setBank(data.bank_details);
    }).catch(() => toast.error('Failed to load profile'))
    .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateMyProfile({ ...form, bank_details: bank });
      toast.success('Profile updated');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Update failed');
    } finally { setSaving(false); }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500" /></div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <nav className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/" className="text-xl font-bold text-blue-600">EventHub Zambia</Link>
          <div className="ml-auto"><NotificationBell /></div>
        </nav>
      </header>
      <main className="max-w-4xl mx-auto px-4 py-8">
        <Breadcrumbs pathname={router.pathname} />
        <h1 className="text-2xl font-bold mb-6">My Profile</h1>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm p-6 space-y-4">
            <h2 className="font-semibold text-lg">Personal Info</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required
                className="w-full px-4 py-2 border rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required
                className="w-full px-4 py-2 border rounded-lg" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 space-y-4">
            <h2 className="font-semibold text-lg">Bank Details (for payouts)</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bank Name</label>
                <input type="text" value={bank.bank_name} onChange={(e) => setBank({ ...bank, bank_name: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Account Name</label>
                <input type="text" value={bank.account_name} onChange={(e) => setBank({ ...bank, account_name: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Account Number</label>
                <input type="text" value={bank.account_number} onChange={(e) => setBank({ ...bank, account_number: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
                <input type="text" value={bank.branch} onChange={(e) => setBank({ ...bank, branch: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg" />
              </div>
            </div>
          </div>

          <button type="submit" disabled={saving}
            className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold disabled:opacity-50 hover:bg-blue-700">
            {saving ? 'Saving...' : 'Update Profile'}
          </button>
        </form>
      </main>
    </div>
  );
}
