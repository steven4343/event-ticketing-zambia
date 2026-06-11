import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { getMyTickets } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { QRCodeSVG } from 'qrcode.react';
import Breadcrumbs from '../components/Breadcrumbs';
import NotificationBell from '../components/NotificationBell';
import EmptyState from '../components/EmptyState';

export default function MyTickets() {
  const { user } = useAuth();
  const router = useRouter();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [expandedCodes, setExpandedCodes] = useState({});

  useEffect(() => {
    const fetchTickets = async () => {
      try {
        const { data } = await getMyTickets({ page, limit: 10 });
        setTickets(data.tickets);
        setTotal(data.total);
      } catch (err) {
        console.error('Failed to fetch tickets:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchTickets();
  }, [page]);

  const toggleCode = (id) => {
    setExpandedCodes(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <nav className="max-w-7xl mx-auto px-4 py-4 flex flex-wrap items-center gap-2">
          <Link href="/" className="text-lg sm:text-xl font-bold text-blue-600">EventHub Zambia</Link>
          <div className="flex items-center gap-2 sm:gap-4 ml-auto">
            <span className="text-xs sm:text-sm text-gray-600 truncate max-w-[80px]">{user?.name}</span>
            <NotificationBell />
            <Link href="/profile" className="text-blue-600 text-xs sm:text-sm">Profile</Link>
          </div>
        </nav>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <Breadcrumbs pathname={router.pathname} />
        <h1 className="text-2xl font-bold mb-6">My Tickets ({total})</h1>

        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg shadow-sm h-28 animate-pulse" />
            ))}
          </div>
        ) : tickets.length === 0 ? (
          <EmptyState icon="🎫" title="No tickets purchased yet" actionLabel="Browse Events" actionHref="/" />
        ) : (
          <>
            <div className="space-y-4">
              {tickets.map((ticket) => (
                <div key={ticket.id} className="bg-white rounded-lg shadow-sm p-4 md:p-6">
                  <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
                    <div className="flex-shrink-0 cursor-pointer" onClick={() => toggleCode(ticket.id)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') toggleCode(ticket.id); }} aria-label={expandedCodes[ticket.id] ? 'Hide QR code' : 'Show QR code'}>
                      {expandedCodes[ticket.id] ? (
                        <QRCodeSVG value={JSON.stringify({ ticket_code: ticket.ticket_code })} size={100} />
                      ) : (
                        <div className="w-[100px] h-[100px] bg-gray-100 rounded flex items-center justify-center text-gray-400 text-sm">
                          Tap to show QR
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-lg truncate">{ticket.event_title}</h3>
                      <p className="text-sm text-gray-600">
                        {new Date(ticket.event_date).toLocaleDateString()} at {ticket.event_time?.substring(0, 5)} • {ticket.venue}
                      </p>
                      <p className="text-sm text-gray-600">{ticket.ticket_type_name} • K{parseFloat(ticket.price).toFixed(2)}</p>
                      <p className="text-xs text-gray-400 font-mono mt-1">{ticket.ticket_code}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap ${
                        ticket.status === 'active' ? 'bg-green-100 text-green-800' :
                        ticket.status === 'used' ? 'bg-gray-100 text-gray-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {ticket.status === 'active' ? 'Active' : ticket.status === 'used' ? 'Used' : 'Cancelled'}
                      </span>
                      <button onClick={() => toggleCode(ticket.id)}
                        className="text-blue-600 text-sm hover:underline whitespace-nowrap">
                        {expandedCodes[ticket.id] ? 'Hide QR' : 'Show QR'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {total > 10 && (
              <div className="flex justify-center items-center gap-4 mt-6">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="px-4 py-2 border rounded-lg disabled:opacity-50 hover:bg-gray-100">
                  <span aria-hidden="true">←</span> Previous
                </button>
                <span className="text-sm text-gray-600">Page {page} of {Math.ceil(total / 10)}</span>
                <button onClick={() => setPage(p => p + 1)} disabled={page >= Math.ceil(total / 10)}
                  className="px-4 py-2 border rounded-lg disabled:opacity-50 hover:bg-gray-100">
                  Next <span aria-hidden="true">→</span>
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
