import { useState } from 'react';
import Link from 'next/link';
import { validateTicket, checkIn } from '../../services/api';
import toast from 'react-hot-toast';

export default function Scanner() {
  const [ticketCode, setTicketCode] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [checkedIn, setCheckedIn] = useState(false);

  const handleValidate = async (e) => {
    e.preventDefault();
    if (!ticketCode.trim()) return;

    setLoading(true);
    setResult(null);
    setCheckedIn(false);

    try {
      const { data } = await validateTicket(ticketCode.trim());
      setResult(data);
    } catch (err) {
      toast.error('Validation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async () => {
    if (!result?.valid) return;

    try {
      const { data } = await checkIn(ticketCode.trim());
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
          <span className="text-sm text-gray-400">Entry Gate</span>
        </nav>
      </header>

      <main className="max-w-lg mx-auto px-4 py-8">
        <form onSubmit={handleValidate} className="mb-8">
          <label className="block text-sm font-medium text-gray-400 mb-2">Scan or Enter Ticket Code</label>
          <div className="flex gap-2 flex-col sm:flex-row">
            <input
              type="text"
              value={ticketCode}
              onChange={(e) => setTicketCode(e.target.value.toUpperCase())}
              placeholder="EVT-2026-XXXXXXXX"
              className="flex-1 px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white font-mono text-base sm:text-lg focus:border-blue-500 focus:outline-none"
              autoFocus
            />
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
                  <div className="text-6xl mb-2" role="img" aria-label="Valid">✅</div>
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
                      className="px-6 py-3 bg-gray-700 rounded-lg hover:bg-gray-600 transition">
                      Scan Next Ticket
                    </button>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="text-center mb-6">
                  <div className="text-6xl mb-2" role="img" aria-label="Invalid">❌</div>
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
                  className="w-full py-4 bg-gray-700 rounded-lg text-lg font-bold hover:bg-gray-600 transition">
                  Try Again
                </button>
              </>
            )}
          </div>
        )}

        {!result && (
          <div className="text-center text-gray-500 mt-12">
            <div className="text-6xl mb-4" role="img" aria-label="Scanner">📷</div>
            <p>Scan a ticket QR code or enter the code manually</p>
          </div>
        )}
      </main>
    </div>
  );
}
