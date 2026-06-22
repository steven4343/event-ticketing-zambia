import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';
import Breadcrumbs from '../../components/Breadcrumbs';
import toast from 'react-hot-toast';
import { listPendingOrganizers, reviewOrganizer } from '../../services/api';

export default function AdminOrganizers() {
  const { user } = useAuth();
  const [organizers, setOrganizers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetch = async () => {
    try {
      const { data } = await listPendingOrganizers();
      setOrganizers(data.organizers);
    } catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetch(); }, []);

  const handleReview = async (id, status) => {
    try {
      await reviewOrganizer(id, status);
      toast.success(`Organizer ${status}`);
      fetch();
    } catch { toast.error('Failed to update'); }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <nav className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/admin/dashboard" className="text-xl font-bold text-blue-600"><span aria-hidden="true">←</span> Admin</Link>
          <span className="text-sm text-gray-600 ml-auto">{user?.name}</span>
        </nav>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-8">
        <Breadcrumbs pathname="/admin/organizers" />
        <h1 className="text-2xl font-bold mb-6">Organizer Management</h1>
        {loading ? (
          <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-gray-100 animate-pulse rounded" />)}</div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Name</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Email</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Phone</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Status</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {organizers.map((org) => (
                  <tr key={org.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium">{org.name}</td>
                    <td className="px-6 py-4 text-sm">{org.email}</td>
                    <td className="px-6 py-4 text-sm">{org.phone}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        org.organizer_status === 'approved' ? 'bg-green-100 text-green-800' :
                        org.organizer_status === 'rejected' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>{org.organizer_status || 'pending'}</span>
                    </td>
                    <td className="px-6 py-4 flex gap-2">
                      <button onClick={() => handleReview(org.id, 'approved')}
                        className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700">Approve</button>
                      <button onClick={() => handleReview(org.id, 'rejected')}
                        className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700">Reject</button>
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
