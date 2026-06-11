import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '../../context/AuthContext';
import { getAdminEvents, approveEvent } from '../../services/api';
import Breadcrumbs from '../../components/Breadcrumbs';
import NotificationBell from '../../components/NotificationBell';
import EmptyState from '../../components/EmptyState';
import toast from 'react-hot-toast';

export default function AdminEvents() {
  const { user } = useAuth();
  const router = useRouter();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (statusFilter) params.status = statusFilter;
      const { data } = await getAdminEvents(params);
      setEvents(data.events);
      setTotal(data.total);
    } catch (err) {
      console.error('Failed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchEvents(); }, [page, statusFilter]);

  const handleApprove = async (id, status) => {
    try {
      await approveEvent(id, status);
      toast.success(`Event ${status}`);
      fetchEvents();
    } catch (err) {
      toast.error('Failed to update event');
    }
  };

  if (!user || user.role !== 'super_admin') {
    return <div className="min-h-screen flex items-center justify-center text-red-500">Access denied</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <nav className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/admin" className="text-xl font-bold text-blue-600"><span aria-hidden="true">←</span> Admin</Link>
          <span className="text-lg font-semibold">Events Management</span>
          <NotificationBell />
        </nav>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <Breadcrumbs pathname={router.pathname} />
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">All Events ({total})</h1>
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-4 py-2 border rounded-lg bg-white">
            <option value="">All Status</option>
            <option value="draft">Draft</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-4 space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-gray-100 animate-pulse rounded" />)}</div>
          ) : events.length === 0 ? (
            <EmptyState title="No events found" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Title</th>
                    <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Organizer</th>
                    <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Date</th>
                    <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Sold</th>
                    <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Revenue</th>
                    <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Status</th>
                    <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {events.map((event) => (
                    <tr key={event.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium">{event.title}</td>
                      <td className="px-6 py-4 text-sm">{event.organizer_name}</td>
                      <td className="px-6 py-4 text-sm">{new Date(event.event_date).toLocaleDateString()}</td>
                      <td className="px-6 py-4 text-sm">{parseInt(event.tickets_sold) || 0}</td>
                      <td className="px-6 py-4 text-sm">K{parseFloat(event.revenue || 0).toLocaleString()}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          event.status === 'approved' ? 'bg-green-100 text-green-800' :
                          event.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          event.status === 'draft' ? 'bg-gray-100 text-gray-800' :
                          event.status === 'rejected' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>{event.status}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <Link href={`/events/${event.id}`} className="text-blue-600 text-sm hover:underline">View</Link>
                          {event.status === 'pending' && (
                            <>
                              <button onClick={() => handleApprove(event.id, 'approved')}
                                className="text-green-600 text-sm hover:underline">Approve</button>
                              <button onClick={() => handleApprove(event.id, 'rejected')}
                                className="text-red-600 text-sm hover:underline">Reject</button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {total > 20 && (
            <div className="flex justify-center items-center gap-4 p-4 border-t">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="px-3 py-1 border rounded text-sm disabled:opacity-50"><span aria-hidden="true">←</span> Prev</button>
              <span className="text-sm text-gray-600">{page} of {Math.ceil(total / 20)}</span>
              <button onClick={() => setPage(p => p + 1)} disabled={page >= Math.ceil(total / 20)}
                className="px-3 py-1 border rounded text-sm disabled:opacity-50">Next <span aria-hidden="true">→</span></button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
