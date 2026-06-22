import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { validateTicket, checkIn, syncEventTickets as fetchSync, bulkCheckIn, getMyEvents } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const CACHE_KEY = 'scanner_cache';

function getCache() {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY) || 'null'); } catch { return null; }
}

function setCache(data) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(data)); } catch {} 
}

export default function Scanner() {
  const { user } = useAuth();
  const [ticketCode, setTicketCode] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [checkedIn, setCheckedIn] = useState(false);
  const [offline, setOffline] = useState(!navigator.onLine);
  const [syncMode, setSyncMode] = useState(false);
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [cacheInfo, setCacheInfo] = useState(getCache());
  const [pendingCheckins, setPendingCheckins] = useState([]);
  const [syncingPending, setSyncingPending] = useState(false);

  useEffect(() => {
    const handleOnline = () => setOffline(false);
    const handleOffline = () => setOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => { window.removeEventListener('online', handleOnline); window.removeEventListener('offline', handleOffline); };
  }, []);

  useEffect(() => {
    if (syncMode && user?.role === 'organizer') {
      getMyEvents({ limit: 100 }).then(({ data }) => setEvents(data.events)).catch(() => {});
    }
  }, [syncMode, user]);

  const handleSync = async () => {
    if (!selectedEvent) { toast.error('Select an event'); return; }
    setSyncing(true);
    try {
      const { data } = await fetchSync(selectedEvent);
      const cache = { event: data.event, tickets: data.tickets, synced_at: data.synced_at };
      setCache(cache);
      setCacheInfo(cache);
      toast.success(`Cached ${data.tickets.length} tickets for offline use`);
    } catch { toast.error('Sync failed'); }
    finally { setSyncing(false); }
  };

  const syncPending = async () => {
    if (pendingCheckins.length === 0) { toast('No pending check-ins to sync'); return; }
    setSyncingPending(true);
    try {
      const { data } = await bulkCheckIn(pendingCheckins);
      const synced = data.results.filter(r => r.success).length;
      setPendingCheckins([]);
      toast.success(`Synced ${synced} check-ins`);
    } catch { toast.error('Sync failed'); }
    finally { setSyncingPending(false); }
  };

  const handleValidate = async (e) => {
    e.preventDefault();
    if (!ticketCode.trim()) return;

    setLoading(true);
    setResult(null);
    setCheckedIn(false);

    const code = ticketCode.trim().toUpperCase();

    if (offline && cacheInfo) {
      const ticket = cacheInfo.tickets.find(t => t.ticket_code === code);
      if (ticket) {
        if (ticket.status === 'active') {
          setResult({
            valid: true,
            message: 'Valid ticket (offline)',
            ticket: { attendee_name: ticket.attendee_name, ticket_type: ticket.ticket_type_name, ticket_code: ticket.ticket_code, event_title: cacheInfo.event.title },
          });
        } else {
          setResult({
            valid: false,
            message: `Ticket already ${ticket.status}`,
            ticket: { attendee_name: ticket.attendee_name, checked_in_at: ticket.checked_in_at },
          });
        }
      } else {
        setResult({ valid: false, message: 'Ticket not found in offline cache', ticket: null });
      }
      setLoading(false);
      return;
    }

    try {
      const { data } = await validateTicket(code);
      setResult(data);
    } catch (err) {
      if (offline) {
        toast.error('No cached data for offline validation. Sync an event first.');
      } else {
        toast.error('Validation failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async () => {
    if (!result?.valid) return;

    if (offline && cacheInfo) {
      const updatedTickets = cacheInfo.tickets.map(t =>
        t.ticket_code === ticketCode.trim().toUpperCase()
          ? { ...t, status: 'used', checked_in_at: new Date().toISOString() }
          : t
      );
      setCache({ ...cacheInfo, tickets: updatedTickets });
      setCacheInfo({ ...cacheInfo, tickets: updatedTickets });
      setCheckedIn(true);
      setPendingCheckins(prev => [...prev, { ticket_code: ticketCode.trim().toUpperCase() }]);
      toast.success(`${result.ticket.attendee_name} checked in (offline)`);
      return;
    }

    try {
      const { data } = await checkIn(ticketCode.trim().toUpperCase());
      setCheckedIn(true);
      toast.success(`${data.attendee_name} checked in!`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Check-in failed');
    }
  };

  const handleReset = () => {
    setTicketCode('');
    setResult(null);
    setCheckedIn(false);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="bg-gray-900 border-b border-gray-800">
        <nav className="max-w-lg mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="text-lg font-bold text-blue-400">EventHub Scanner</Link>
          <div className="flex items-center gap-3">
            {offline && <span className="text-xs bg-yellow-600 px-2 py-0.5 rounded">Offline</span>}
            {cacheInfo && (
              <button onClick={() => setSyncMode(!syncMode)} className="text-sm text-blue-400 hover:underline">
                {syncMode ? 'Scan' : 'Sync'}
              </button>
            )}
          </div>
        </nav>
      </header>

      <main className="max-w-lg mx-auto px-4 py-8">
        {syncMode ? (
          <div className="space-y-4">
            <h2 className="text-xl font-bold">Offline Sync</h2>
            {user?.role === 'organizer' ? (
              <>
                <select value={selectedEvent} onChange={(e) => setSelectedEvent(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white">
                  <option value="">Select event</option>
                  {events.map(ev => <option key={ev.id} value={ev.id}>{ev.title}</option>)}
                </select>
                <button onClick={handleSync} disabled={syncing || !selectedEvent}
                  className="w-full py-3 bg-blue-600 rounded-lg font-semibold disabled:opacity-50 hover:bg-blue-700">
                  {syncing ? 'Syncing...' : 'Download Event Tickets for Offline'}
                </button>
                {cacheInfo && (
                  <div className="bg-gray-900 rounded-lg p-4 text-sm text-gray-400">
                    <p>Cached: {cacheInfo.event.title}</p>
                    <p>Tickets: {cacheInfo.tickets.length}</p>
                    <p>Synced: {new Date(cacheInfo.synced_at).toLocaleString()}</p>
                    {pendingCheckins.length > 0 && (
                      <div className="mt-2">
                        <p className="text-yellow-400">{pendingCheckins.length} pending check-in(s)</p>
                        <button onClick={syncPending} disabled={syncingPending}
                          className="mt-2 px-4 py-2 bg-green-600 rounded text-sm hover:bg-green-700 disabled:opacity-50">
                          {syncingPending ? 'Syncing...' : 'Sync Pending Check-ins'}
                        </button>
                      </div>
                    )}
                  </div>
                )}
                <button onClick={() => { localStorage.removeItem(CACHE_KEY); setCacheInfo(null); setPendingCheckins([]); }}
                  className="w-full py-2 text-red-400 text-sm hover:underline">Clear Cache</button>
              </>
            ) : (
              <p className="text-gray-400">Ask an organizer to sync event data for offline scanning.</p>
            )}
            <button onClick={() => setSyncMode(false)} className="w-full py-3 bg-gray-700 rounded-lg font-medium hover:bg-gray-600">
              Back to Scanner
            </button>
          </div>
        ) : (
          <>
            <form onSubmit={handleValidate} className="mb-8">
              <label className="block text-sm font-medium text-gray-400 mb-2">
                {offline && cacheInfo ? 'Offline Mode — Scan or Enter Ticket Code' : 'Scan or Enter Ticket Code'}
              </label>
              <div className="flex gap-2 flex-col sm:flex-row">
                <input type="text" value={ticketCode} onChange={(e) => setTicketCode(e.target.value.toUpperCase())}
                  placeholder="EVT-2026-XXXXXXXX"
                  className="flex-1 px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white font-mono text-base sm:text-lg focus:border-blue-500 focus:outline-none" autoFocus />
                <button type="submit" disabled={loading || !ticketCode.trim()}
                  className="px-6 py-3 bg-blue-600 rounded-lg font-semibold disabled:opacity-50 hover:bg-blue-700">
                  {loading ? '...' : 'Verify'}
                </button>
              </div>
            </form>

            {result && (
              <div className={`rounded-lg p-6 ${result.valid ? 'bg-green-900/50 border border-green-700' : 'bg-red-900/50 border border-red-700'}`}>
                {result.valid ? (
                  <>
                    <div className="text-center mb-6">
                      <div className="text-6xl mb-2">✅</div>
                      <h2 className="text-2xl font-bold text-green-400">Valid Ticket</h2>
                      <p className="text-green-300">{result.message}</p>
                    </div>
                    <div className="bg-gray-900 rounded-lg p-4 space-y-2 mb-6">
                      <p><span className="text-gray-400">Name:</span> <span className="font-semibold">{result.ticket.attendee_name}</span></p>
                      <p><span className="text-gray-400">Event:</span> {result.ticket.event_title}</p>
                      <p><span className="text-gray-400">Ticket Type:</span> {result.ticket.ticket_type}</p>
                      <p><span className="text-gray-400">Code:</span> <span className="font-mono text-sm">{result.ticket.ticket_code}</span></p>
                    </div>
                    {!checkedIn ? (
                      <button onClick={handleCheckIn}
                        className="w-full py-4 bg-green-600 text-white rounded-lg text-xl font-bold hover:bg-green-700 transition">
                        Check In Attendee
                      </button>
                    ) : (
                      <div className="text-center">
                        <p className="text-green-400 text-lg font-bold mb-4">✓ Checked In Successfully</p>
                        <button onClick={handleReset}
                          className="px-6 py-3 bg-gray-700 rounded-lg hover:bg-gray-600 transition">Scan Next Ticket</button>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="text-center mb-6">
                      <div className="text-6xl mb-2">❌</div>
                      <h2 className="text-2xl font-bold text-red-400">Invalid Ticket</h2>
                      <p className="text-red-300">{result.message}</p>
                    </div>
                    {result.ticket && (
                      <div className="bg-gray-900 rounded-lg p-4 space-y-2 mb-6">
                        <p><span className="text-gray-400">Attendee:</span> {result.ticket.attendee_name}</p>
                        {result.ticket.checked_in_at && (
                          <p><span className="text-gray-400">Checked in at:</span> {new Date(result.ticket.checked_in_at).toLocaleString()}</p>
                        )}
                      </div>
                    )}
                    <button onClick={handleReset}
                      className="w-full py-4 bg-gray-700 rounded-lg text-lg font-bold hover:bg-gray-600 transition">Try Again</button>
                  </>
                )}
              </div>
            )}

            {!result && (
              <div className="text-center text-gray-500 mt-12">
                <div className="text-6xl mb-4">📷</div>
                <p>Scan a ticket QR code or enter the code manually</p>
                {!cacheInfo && !offline && (
                  <p className="mt-4 text-sm text-blue-400">
                    <button onClick={() => setSyncMode(true)} className="hover:underline">Sync event data</button> for offline scanning
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
