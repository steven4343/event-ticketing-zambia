import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '../../context/AuthContext';
import { getAdminStats } from '../../services/api';
import Breadcrumbs from '../../components/Breadcrumbs';
import NotificationBell from '../../components/NotificationBell';

export default function AdminDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data } = await getAdminStats();
        setStats(data);
      } catch (err) {
        console.error('Failed to load stats:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (!user || user.role !== 'super_admin') {
    return <div className="min-h-screen flex items-center justify-center text-red-500">Access denied</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <nav className="max-w-7xl mx-auto px-4 py-4 flex flex-wrap items-center gap-2">
          <Link href="/" className="text-lg sm:text-xl font-bold text-blue-600">EventHub Admin</Link>
          <div className="flex items-center gap-2 sm:gap-4 ml-auto flex-wrap">
            <NotificationBell />
            <Link href="/admin/users" className="text-blue-600 text-xs sm:text-sm">Users</Link>
            <Link href="/admin/events" className="text-blue-600 text-xs sm:text-sm">Events</Link>
            <span className="text-xs sm:text-sm text-gray-600 truncate max-w-[80px]">{user?.name}</span>
          </div>
        </nav>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <Breadcrumbs pathname={router.pathname} />
        <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => <div key={i} className="bg-white rounded-lg shadow-sm h-24 animate-pulse" />)}
          </div>
        ) : stats ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <StatCard label="Total Users" value={stats.total_users} color="blue" />
              <StatCard label="Organizers" value={stats.total_organizers} color="green" />
              <StatCard label="Customers" value={stats.total_customers} color="purple" />
              <StatCard label="Total Events" value={stats.total_events} color="orange" />
              <StatCard label="Approved" value={stats.approved_events} color="green" />
              <StatCard label="Pending" value={stats.pending_events} color="yellow" />
              <StatCard label="Active Tickets" value={stats.active_tickets} color="blue" />
              <StatCard label="Checked In" value={stats.checked_in_tickets} color="purple" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="font-semibold mb-2">Revenue</h2>
                <p className="text-3xl font-bold text-green-600">K{parseFloat(stats.total_revenue).toLocaleString()}</p>
                <p className="text-sm text-gray-500 mt-1">Total platform revenue</p>
              </div>
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="font-semibold mb-2">Commissions</h2>
                <p className="text-3xl font-bold text-blue-600">K{parseFloat(stats.total_commissions).toLocaleString()}</p>
                <p className="text-sm text-gray-500 mt-1">Total commissions collected</p>
              </div>
            </div>

            {stats.top_events?.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="font-semibold mb-4">Top Selling Events</h2>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left px-4 py-2 text-sm font-medium text-gray-500">Event</th>
                        <th className="text-left px-4 py-2 text-sm font-medium text-gray-500">Tickets Sold</th>
                        <th className="text-left px-4 py-2 text-sm font-medium text-gray-500">Revenue</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {stats.top_events.map((ev, i) => (
                        <tr key={ev.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium">
                            <Link href={`/events/${ev.id}`} className="text-blue-600 hover:underline">{ev.title}</Link>
                          </td>
                          <td className="px-4 py-3">{parseInt(ev.tickets_sold) || 0}</td>
                          <td className="px-4 py-3">K{parseFloat(ev.revenue || 0).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        ) : (
          <p className="text-red-500">Failed to load statistics</p>
        )}
      </main>
    </div>
  );
}

function StatCard({ label, value, color }) {
  const colorMap = {
    blue: 'text-blue-600', green: 'text-green-600', purple: 'text-purple-600',
    orange: 'text-orange-600', yellow: 'text-yellow-600',
  };
  return (
    <div className="bg-white rounded-lg shadow-sm p-4 text-center">
      <p className={`text-2xl font-bold ${colorMap[color]}`}>{value}</p>
      <p className="text-xs text-gray-500 mt-1">{label}</p>
    </div>
  );
}
