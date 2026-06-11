import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { getMyEvents, getOrganizerStats } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { getSocket } from '../../services/socket';
import Breadcrumbs from '../../components/Breadcrumbs';
import NotificationBell from '../../components/NotificationBell';
import EmptyState from '../../components/EmptyState';

export default function OrganizerDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [events, setEvents] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');

  const fetchData = async () => {
    try {
      const params = { page, limit: 15 };
      if (statusFilter) params.status = statusFilter;
      const [eventsRes, statsRes] = await Promise.all([
        getMyEvents(params),
        getOrganizerStats(),
      ]);
      setEvents(eventsRes.data.events);
      setTotal(eventsRes.data.total);
      setStats(statsRes.data);
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [page, statusFilter]);

  useEffect(() => {
    const socket = getSocket();
    if (socket) {
      socket.on('ticket-sold', (data) => {
        fetchData();
      });
      socket.on('event-status', (data) => {
        fetchData();
      });
      return () => {
        socket.off('ticket-sold');
        socket.off('event-status');
      };
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <nav className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="text-xl font-bold text-blue-600">EventHub Zambia</Link>
          <div className="flex items-center gap-4">
            <NotificationBell />
            <Link href="/organizer/create" className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700">+ Create Event</Link>
            <span className="text-sm text-gray-600">{user?.name}</span>
            <Link href="/profile" className="text-blue-600 text-sm">Profile</Link>
          </div>
        </nav>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <Breadcrumbs pathname={router.pathname} />
        <h1 className="text-2xl font-bold mb-6">Organizer Dashboard</h1>

        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            <div className="bg-white rounded-lg shadow-sm p-4 text-center">
              <p className="text-2xl font-bold text-blue-600">{stats.total_events}</p>
              <p className="text-xs text-gray-500 mt-1">Total Events</p>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-4 text-center">
              <p className="text-2xl font-bold text-green-600">{stats.approved_events}</p>
              <p className="text-xs text-gray-500 mt-1">Approved</p>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-4 text-center">
              <p className="text-2xl font-bold text-purple-600">{stats.tickets_sold}</p>
              <p className="text-xs text-gray-500 mt-1">Tickets Sold</p>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-4 text-center">
              <p className="text-2xl font-bold text-orange-600">{stats.checked_in}</p>
              <p className="text-xs text-gray-500 mt-1">Checked In</p>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-4 text-center">
              <p className="text-2xl font-bold text-red-600">K{parseFloat(stats.total_revenue || 0).toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-1">Revenue</p>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="p-4 border-b flex justify-between items-center">
            <h2 className="font-semibold">Your Events</h2>
            <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="px-3 py-1 border rounded-lg text-sm bg-white">
              <option value="">All Status</option>
              <option value="draft">Draft</option>
              <option value="approved">Approved</option>
              <option value="pending">Pending</option>
              <option value="rejected">Rejected</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {loading ? (
            <div className="space-y-2 p-4">
              {[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-gray-100 animate-pulse rounded" />)}
            </div>
          ) : events.length === 0 ? (
            <EmptyState icon="🎪" title="No events yet" message="Create your first event to get started" actionLabel="Create Event" actionHref="/organizer/create" />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Event</th>
                      <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Date</th>
                      <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Status</th>
                      <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Sold</th>
                      <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Revenue</th>
                      <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {events.map((event) => (
                      <tr key={event.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 font-medium">{event.title}</td>
                        <td className="px-6 py-4 text-sm text-gray-500">{new Date(event.event_date).toLocaleDateString()}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            event.status === 'approved' ? 'bg-green-100 text-green-800' :
                            event.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            event.status === 'draft' ? 'bg-gray-100 text-gray-800' :
                            event.status === 'rejected' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>{event.status}</span>
                        </td>
                        <td className="px-6 py-4 text-sm">{parseInt(event.tickets_sold) || 0}</td>
                        <td className="px-6 py-4 text-sm">K{parseFloat(event.revenue || 0).toLocaleString()}</td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2 flex-wrap">
                            <Link href={`/events/${event.id}`} className="text-blue-600 text-sm hover:underline">View</Link>
                            <Link href={`/organizer/stats/${event.id}`} className="text-blue-600 text-sm hover:underline">Stats</Link>
                            <Link href={`/organizer/create?id=${event.id}`} className="text-blue-600 text-sm hover:underline">Edit</Link>
                            {event.is_draft && (
                              <Link href={`/organizer/create?id=${event.id}`} className="text-green-600 text-sm hover:underline">Edit Draft</Link>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {total > 15 && (
                <div className="flex justify-center items-center gap-4 p-4 border-t">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                    className="px-3 py-1 border rounded text-sm disabled:opacity-50"><span aria-hidden="true">←</span> Prev</button>
                  <span className="text-sm text-gray-600">Page {page} of {Math.ceil(total / 15)}</span>
                  <button onClick={() => setPage(p => p + 1)} disabled={page >= Math.ceil(total / 15)}
                    className="px-3 py-1 border rounded text-sm disabled:opacity-50">Next <span aria-hidden="true">→</span></button>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
