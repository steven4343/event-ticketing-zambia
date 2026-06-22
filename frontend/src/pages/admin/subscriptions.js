import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';
import Breadcrumbs from '../../components/Breadcrumbs';
import toast from 'react-hot-toast';
import { listAllSubscriptions } from '../../services/api';

export default function AdminSubscriptions() {
  const { user } = useAuth();
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listAllSubscriptions().then(({ data }) => setSubscriptions(data.subscriptions))
      .catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <nav className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/admin/dashboard" className="text-xl font-bold text-blue-600"><span aria-hidden="true">←</span> Admin</Link>
          <Link href="/admin/subscriptions" className="text-blue-600 text-sm font-medium ml-auto">Subscriptions</Link>
          <span className="text-sm text-gray-600">{user?.name}</span>
        </nav>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-8">
        <Breadcrumbs pathname="/admin/subscriptions" />
        <h1 className="text-2xl font-bold mb-6">Organizer Subscriptions</h1>
        {loading ? (
          <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-gray-100 animate-pulse rounded" />)}</div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Organizer</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Email</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Plan</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Amount</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Start</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">End</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {subscriptions.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium">{s.organizer_name}</td>
                    <td className="px-6 py-4 text-sm">{s.organizer_email}</td>
                    <td className="px-6 py-4 capitalize">{s.plan}</td>
                    <td className="px-6 py-4">K{parseFloat(s.amount).toFixed(2)}</td>
                    <td className="px-6 py-4 text-sm">{new Date(s.start_date).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-sm">{new Date(s.end_date).toLocaleDateString()}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        s.status === 'active' ? 'bg-green-100 text-green-800' :
                        s.status === 'expired' ? 'bg-gray-100 text-gray-800' :
                        'bg-red-100 text-red-800'
                      }`}>{s.status}</span>
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
