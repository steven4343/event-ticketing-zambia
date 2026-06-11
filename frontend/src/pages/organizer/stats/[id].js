import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getEventStats, exportAttendees, getSalesReport } from '../../services/api';
import toast from 'react-hot-toast';

export default function EventStats() {
  const router = useRouter();
  const { id } = router.query;
  const [stats, setStats] = useState(null);
  const [salesReport, setSalesReport] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!id) return;
    const fetchStats = async () => {
      try {
        const [statsRes, salesRes] = await Promise.all([
          getEventStats(id),
          getSalesReport(id, { period: 'daily' }).catch(() => ({ data: { sales: [] } })),
        ]);
        setStats(statsRes.data);
        setSalesReport(salesRes.data?.sales || []);
      } catch (err) {
        console.error('Failed to load stats:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [id]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const response = await exportAttendees(id);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `attendees-${stats?.event_title || 'event'}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Attendee list exported');
    } catch {
      toast.error('Export failed');
    } finally {
      setExporting(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500" /></div>;
  if (!stats) return <div className="min-h-screen flex items-center justify-center text-gray-500">Stats not found</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <nav className="max-w-4xl mx-auto px-4 py-4">
          <Link href="/organizer/dashboard" className="text-xl font-bold text-blue-600"><span aria-hidden="true">←</span> Dashboard</Link>
        </nav>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">{stats.event_title} - Statistics</h1>
          <button onClick={handleExport} disabled={exporting}
            className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-green-700">
            {exporting ? 'Exporting...' : 'Export Attendees (CSV)'}
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6 text-center">
            <p className="text-3xl font-bold text-blue-600">{stats.tickets_sold}</p>
            <p className="text-sm text-gray-500 mt-1">Tickets Sold</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6 text-center">
            <p className="text-3xl font-bold text-green-600">K{parseFloat(stats.total_revenue).toLocaleString()}</p>
            <p className="text-sm text-gray-500 mt-1">Revenue</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6 text-center">
            <p className="text-3xl font-bold text-purple-600">{stats.checked_in}</p>
            <p className="text-sm text-gray-500 mt-1">Checked In</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6 text-center">
            <p className="text-3xl font-bold text-orange-600">{stats.active_tickets}</p>
            <p className="text-sm text-gray-500 mt-1">Active Tickets</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <h2 className="font-semibold text-lg p-6 border-b">Sales by Ticket Type</h2>
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Ticket Type</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Total</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Sold</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Available</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {stats.ticket_types?.map((tt, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium">{tt.name}</td>
                  <td className="px-6 py-4">{tt.quantity}</td>
                  <td className="px-6 py-4">{tt.sold}</td>
                  <td className="px-6 py-4">{tt.available}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {salesReport.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden mt-6">
            <h2 className="font-semibold text-lg p-6 border-b">Sales Over Time</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Period</th>
                    <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Orders</th>
                    <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Tickets</th>
                    <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {salesReport.map((row, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-6 py-4">{row.period}</td>
                      <td className="px-6 py-4">{row.orders}</td>
                      <td className="px-6 py-4">{row.tickets}</td>
                      <td className="px-6 py-4">K{parseFloat(row.revenue).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
