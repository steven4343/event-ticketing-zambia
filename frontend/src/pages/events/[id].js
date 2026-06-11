import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getEvent, purchaseTickets } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import ConfirmDialog from '../../components/ConfirmDialog';
import Breadcrumbs from '../../components/Breadcrumbs';
import NotificationBell from '../../components/NotificationBell';
import toast from 'react-hot-toast';

export default function EventDetail() {
  const router = useRouter();
  const { id } = router.query;
  const { user } = useAuth();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedTickets, setSelectedTickets] = useState({});
  const [phone, setPhone] = useState('');
  const [provider, setProvider] = useState('mtn');
  const [purchasing, setPurchasing] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (!id) return;
    const fetchEvent = async () => {
      try {
        const { data } = await getEvent(id);
        setEvent(data);
      } catch (err) {
        toast.error('Failed to load event');
      } finally {
        setLoading(false);
      }
    };
    fetchEvent();
  }, [id]);

  const updateQuantity = (typeId, delta) => {
    setSelectedTickets((prev) => ({
      ...prev,
      [typeId]: Math.max(0, (prev[typeId] || 0) + delta),
    }));
  };

  const totalAmount = event?.ticket_types?.reduce((sum, tt) => {
    return sum + (selectedTickets[tt.id] || 0) * parseFloat(tt.price);
  }, 0) || 0;

  const hasTickets = Object.values(selectedTickets).some((q) => q > 0);

  const handlePurchase = async () => {
    if (!hasTickets) { toast.error('Select at least one ticket'); return; }
    if (!phone) { toast.error('Enter phone number for payment'); return; }
    if (!user) { toast.error('Please login to purchase tickets'); router.push('/login'); return; }
    setShowConfirm(true);
  };

  const confirmPurchase = async () => {
    setShowConfirm(false);
    setPurchasing(true);
    try {
      const tickets = Object.entries(selectedTickets)
        .filter(([_, qty]) => qty > 0)
        .map(([typeId, qty]) => ({ ticket_type_id: typeId, quantity: qty }));

      const { data } = await purchaseTickets({
        event_id: id, tickets,
        payment_provider: provider, phone,
      });

      toast.success('Payment request sent! Check your phone.');
      router.push('/tickets');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Purchase failed');
    } finally {
      setPurchasing(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500" /></div>;
  if (!event) return <div className="min-h-screen flex items-center justify-center text-gray-500">Event not found</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <ConfirmDialog
        open={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={confirmPurchase}
        title="Confirm Purchase"
        message={`You are about to purchase tickets for K${totalAmount.toFixed(2)} via ${provider.toUpperCase()} Mobile Money. A payment request will be sent to ${phone}.`}
        confirmText="Send Payment Request"
      />

      <header className="bg-white shadow-sm">
        <nav className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="text-xl font-bold text-blue-600"><span aria-hidden="true">←</span> Back to Events</Link>
          <div className="flex items-center gap-4">
            {user && <NotificationBell />}
          </div>
        </nav>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <Breadcrumbs pathname={router.pathname} />

        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {event.banner_image ? (
            <img src={event.banner_image} alt={event.title} className="w-full h-64 object-cover" />
          ) : (
            <div className="w-full h-64 bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-4xl font-bold">
              {event.title?.charAt(0)}
            </div>
          )}
          <div className="p-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{event.title}</h1>
            <div className="flex flex-wrap gap-4 text-gray-600 mb-4">
              <span><span role="img" aria-label="Date">📅</span> {new Date(event.event_date).toLocaleDateString()} at {event.event_time?.substring(0, 5)}</span>
              <span><span role="img" aria-label="Location">📍</span> {event.venue}</span>
              {event.category_name && <span><span role="img" aria-label="Category">🏷️</span> {event.category_name}</span>}
            </div>
            <p className="text-gray-700 mb-6">{event.description}</p>
            <p className="text-sm text-gray-400">Organized by {event.organizer_name}</p>
          </div>
        </div>

        <div className="mt-6 bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-2xl font-semibold mb-4">Select Tickets</h2>
          {event.ticket_types.map((tt) => (
            <div key={tt.id} className="flex items-center justify-between py-3 border-b last:border-b-0">
              <div>
                <p className="font-semibold text-gray-900">{tt.name}</p>
                <p className="text-sm text-gray-500">{tt.available} available{tt.description ? ` • ${tt.description}` : ''}</p>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold text-blue-600">K{parseFloat(tt.price).toFixed(2)}</p>
                <div className="flex items-center gap-2 mt-1">
                  <button onClick={() => updateQuantity(tt.id, -1)} disabled={!selectedTickets[tt.id]}
                    className="w-8 h-8 rounded-full bg-gray-200 font-bold disabled:opacity-30 hover:bg-gray-300 transition" aria-label="Decrease quantity">-</button>
                  <span className="w-8 text-center font-semibold" aria-live="polite">{selectedTickets[tt.id] || 0}</span>
                  <button onClick={() => updateQuantity(tt.id, 1)} disabled={selectedTickets[tt.id] >= tt.available}
                    className="w-8 h-8 rounded-full bg-gray-200 font-bold disabled:opacity-30 hover:bg-gray-300 transition" aria-label="Increase quantity">+</button>
                </div>
              </div>
            </div>
          ))}

          <div className="mt-6 grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number (for payment)</label>
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                placeholder="0977XXXXXX" className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
              <select value={provider} onChange={(e) => setProvider(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg bg-white focus:ring-2 focus:ring-blue-500">
                <option value="mtn">MTN Mobile Money</option>
                <option value="airtel">Airtel Money</option>
                <option value="zamtel">Zamtel Kwacha</option>
              </select>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="text-sm text-gray-500">Total</p>
              <p className="text-2xl font-bold">K{totalAmount.toFixed(2)}</p>
            </div>
            <button onClick={handlePurchase} disabled={!hasTickets || purchasing || !phone}
              className="px-8 py-3 bg-blue-600 text-white rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition">
              {purchasing ? <span className="flex items-center gap-2"><span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" /> Processing...</span> : 'Buy Now'}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
