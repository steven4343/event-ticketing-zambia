import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';
import Breadcrumbs from '../../components/Breadcrumbs';
import toast from 'react-hot-toast';
import { getSettings, updatePlatformSettings } from '../../services/api';

export default function AdminSettings() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    commission_percentage: '5',
    basic_plan_price: '100',
    professional_plan_price: '300',
    platform_name: 'EventHub Zambia',
    support_email: '',
  });

  useEffect(() => {
    getSettings().then(({ data }) => {
      setSettings(prev => ({ ...prev, ...data }));
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updatePlatformSettings(settings);
      toast.success('Settings saved');
    } catch { toast.error('Failed to save'); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500" /></div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <nav className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/admin/dashboard" className="text-xl font-bold text-blue-600"><span aria-hidden="true">←</span> Admin</Link>
          <span className="text-sm text-gray-600 ml-auto">{user?.name}</span>
        </nav>
      </header>
      <main className="max-w-4xl mx-auto px-4 py-8">
        <Breadcrumbs pathname="/admin/settings" />
        <h1 className="text-2xl font-bold mb-6">Platform Settings</h1>
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Platform Name</label>
              <input type="text" value={settings.platform_name} onChange={(e) => setSettings({ ...settings, platform_name: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Support Email</label>
              <input type="email" value={settings.support_email} onChange={(e) => setSettings({ ...settings, support_email: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Commission %</label>
              <input type="number" value={settings.commission_percentage} onChange={(e) => setSettings({ ...settings, commission_percentage: e.target.value })} min="0" max="100" step="0.1"
                className="w-full px-4 py-2 border rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Basic Plan Price (K)</label>
              <input type="number" value={settings.basic_plan_price} onChange={(e) => setSettings({ ...settings, basic_plan_price: e.target.value })} min="0" step="0.01"
                className="w-full px-4 py-2 border rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Professional Plan Price (K)</label>
              <input type="number" value={settings.professional_plan_price} onChange={(e) => setSettings({ ...settings, professional_plan_price: e.target.value })} min="0" step="0.01"
                className="w-full px-4 py-2 border rounded-lg" />
            </div>
          </div>
          <button type="submit" disabled={saving}
            className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold disabled:opacity-50 hover:bg-blue-700">
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </form>
      </main>
    </div>
  );
}
