import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '../../context/AuthContext';
import { listDiscountCodes, createDiscountCode, updateDiscountCode, deleteDiscountCode, getMyEvents } from '../../services/api';
import Breadcrumbs from '../../components/Breadcrumbs';
import toast from 'react-hot-toast';

export default function DiscountCodes() {
  const router = useRouter();
  const [codes, setCodes] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ event_id: '', code: '', discount_type: 'percentage', discount_value: '', max_uses: '', expires_at: '' });

  const fetch = async () => {
    try {
      const [codesRes, eventsRes] = await Promise.all([listDiscountCodes(), getMyEvents({ limit: 100 })]);
      setCodes(codesRes.data.codes);
      setEvents(eventsRes.data.events);
    } catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetch(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await createDiscountCode({
        ...form,
        discount_value: parseFloat(form.discount_value),
        max_uses: form.max_uses ? parseInt(form.max_uses) : null,
        event_id: form.event_id || null,
        expires_at: form.expires_at || null,
      });
      toast.success('Discount code created');
      setShowForm(false);
      setForm({ event_id: '', code: '', discount_type: 'percentage', discount_value: '', max_uses: '', expires_at: '' });
      fetch();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to create'); }
  };

  const toggleActive = async (code) => {
    try {
      await updateDiscountCode(code.id, { is_active: !code.is_active });
      toast.success(`Code ${code.is_active ? 'deactivated' : 'activated'}`);
      fetch();
    } catch { toast.error('Failed to update'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this discount code?')) return;
    try {
      await deleteDiscountCode(id);
      toast.success('Deleted');
      fetch();
    } catch { toast.error('Failed to delete'); }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <nav className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/organizer/dashboard" className="text-xl font-bold text-blue-600"><span aria-hidden="true">←</span> Dashboard</Link>
          <button onClick={() => setShowForm(!showForm)} className="ml-auto px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
            {showForm ? 'Cancel' : '+ New Code'}
          </button>
        </nav>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-8">
        <Breadcrumbs pathname={router.pathname} />
        <h1 className="text-2xl font-bold mb-6">Discount Codes</h1>

        {showForm && (
          <form onSubmit={handleCreate} className="bg-white rounded-lg shadow-sm p-6 mb-6 space-y-4">
            <h2 className="font-semibold">Create Discount Code</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Code</label>
                <input type="text" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required
                  className="w-full px-4 py-2 border rounded-lg uppercase" placeholder="SAVE20" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Event (optional)</label>
                <select value={form.event_id} onChange={(e) => setForm({ ...form, event_id: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg bg-white">
                  <option value="">All events</option>
                  {events.map(ev => <option key={ev.id} value={ev.id}>{ev.title}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select value={form.discount_type} onChange={(e) => setForm({ ...form, discount_type: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg bg-white">
                  <option value="percentage">Percentage (%)</option>
                  <option value="fixed">Fixed (K)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Value</label>
                <input type="number" value={form.discount_value} onChange={(e) => setForm({ ...form, discount_value: e.target.value })} required min="0" step="0.01"
                  className="w-full px-4 py-2 border rounded-lg" placeholder={form.discount_type === 'percentage' ? 'e.g. 20' : 'e.g. 50'} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max Uses</label>
                <input type="number" value={form.max_uses} onChange={(e) => setForm({ ...form, max_uses: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg" placeholder="Unlimited" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Expires At</label>
                <input type="date" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg" />
              </div>
            </div>
            <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700">Create Code</button>
          </form>
        )}

        {loading ? (
          <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-gray-100 animate-pulse rounded" />)}</div>
        ) : codes.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center text-gray-500">
            No discount codes yet. Create one to offer promotions.
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Code</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Event</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Discount</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Uses</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Expires</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Status</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {codes.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-mono font-bold">{c.code}</td>
                    <td className="px-6 py-4 text-sm">{c.event_title || 'All events'}</td>
                    <td className="px-6 py-4 text-sm">{c.discount_type === 'percentage' ? `${c.discount_value}%` : `K${c.discount_value}`}</td>
                    <td className="px-6 py-4 text-sm">{c.current_uses}/{c.max_uses || '∞'}</td>
                    <td className="px-6 py-4 text-sm">{c.expires_at ? new Date(c.expires_at).toLocaleDateString() : 'Never'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${c.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                        {c.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 flex gap-2">
                      <button onClick={() => toggleActive(c)} className="text-blue-600 text-sm hover:underline">
                        {c.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                      <button onClick={() => handleDelete(c.id)} className="text-red-600 text-sm hover:underline">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
