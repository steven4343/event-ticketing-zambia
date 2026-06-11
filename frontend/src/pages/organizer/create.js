import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { createEvent, updateEvent, getEvent, getCategories } from '../../services/api';
import Breadcrumbs from '../../components/Breadcrumbs';
import toast from 'react-hot-toast';

export default function CreateEvent() {
  const router = useRouter();
  const { id } = router.query;
  const isEditing = Boolean(id);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({
    title: '', description: '', venue: '', event_date: '', event_time: '', category_id: '',
  });
  const [ticketTypes, setTicketTypes] = useState([
    { name: 'Regular', description: 'Standard entry', price: '', quantity: '' },
  ]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(isEditing);

  useEffect(() => {
    getCategories().then(({ data }) => setCategories(data.categories)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!id) return;
    const fetchEvent = async () => {
      try {
        const { data } = await getEvent(id);
        setForm({
          title: data.title || '',
          description: data.description || '',
          venue: data.venue || '',
          event_date: data.event_date?.split('T')[0] || '',
          event_time: data.event_time?.substring(0, 5) || '',
          category_id: data.category_id || '',
        });
        if (data.ticket_types?.length) {
          setTicketTypes(data.ticket_types.map(tt => ({
            name: tt.name,
            description: tt.description || '',
            price: String(tt.price),
            quantity: String(tt.quantity),
          })));
        }
      } catch (err) {
        toast.error('Failed to load event');
        router.push('/organizer/dashboard');
      } finally {
        setInitialLoading(false);
      }
    };
    fetchEvent();
  }, [id, router]);

  const addTicketType = () => {
    setTicketTypes([...ticketTypes, { name: '', description: '', price: '', quantity: '' }]);
  };

  const removeTicketType = (index) => {
    if (ticketTypes.length > 1) {
      setTicketTypes(ticketTypes.filter((_, i) => i !== index));
    }
  };

  const updateTicketType = (index, field, value) => {
    const updated = [...ticketTypes];
    updated[index][field] = value;
    setTicketTypes(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        ...form,
        category_id: form.category_id || null,
        ticket_types: ticketTypes.map(tt => ({
          ...tt,
          price: parseFloat(tt.price),
          quantity: parseInt(tt.quantity),
        })),
      };

      if (isEditing) {
        await updateEvent(id, payload);
        toast.success('Event updated successfully');
      } else {
        await createEvent(payload);
        toast.success('Event created! Awaiting approval.');
      }
      router.push('/organizer/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.error || `Failed to ${isEditing ? 'update' : 'create'} event`);
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <nav className="max-w-4xl mx-auto px-4 py-4">
          <Link href="/organizer/dashboard" className="text-xl font-bold text-blue-600"><span aria-hidden="true">←</span> Back to Dashboard</Link>
        </nav>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <Breadcrumbs pathname={router.pathname} />
        <h1 className="text-2xl font-bold mb-6">{isEditing ? 'Edit Event' : 'Create New Event'}</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm p-6 space-y-4">
            <h2 className="font-semibold text-lg">Event Details</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Event Title</label>
              <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required
                className="w-full px-4 py-2 border rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3} className="w-full px-4 py-2 border rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Venue</label>
              <input type="text" value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} required
                className="w-full px-4 py-2 border rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg bg-white">
                <option value="">No category</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input type="date" value={form.event_date} onChange={(e) => setForm({ ...form, event_date: e.target.value })} required
                  className="w-full px-4 py-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                <input type="time" value={form.event_time} onChange={(e) => setForm({ ...form, event_time: e.target.value })} required
                  className="w-full px-4 py-2 border rounded-lg" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-semibold text-lg">Ticket Types</h2>
              <button type="button" onClick={addTicketType}
                className="px-3 py-1 text-sm bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200">
                + Add Type
              </button>
            </div>
            {ticketTypes.map((tt, idx) => (
              <div key={idx} className="border rounded-lg p-4 mb-4 last:mb-0">
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium text-gray-500">Ticket #{idx + 1}</span>
                  {ticketTypes.length > 1 && (
                    <button type="button" onClick={() => removeTicketType(idx)} className="text-red-500 text-sm">Remove</button>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Name</label>
                    <input type="text" value={tt.name} onChange={(e) => updateTicketType(idx, 'name', e.target.value)} required
                      placeholder="VIP, Regular..." className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Description</label>
                    <input type="text" value={tt.description} onChange={(e) => updateTicketType(idx, 'description', e.target.value)}
                      placeholder="Optional" className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Price (K)</label>
                    <input type="number" value={tt.price} onChange={(e) => updateTicketType(idx, 'price', e.target.value)} required min="0" step="0.01"
                      className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Quantity</label>
                    <input type="number" value={tt.quantity} onChange={(e) => updateTicketType(idx, 'quantity', e.target.value)} required min="1"
                      className="w-full px-3 py-2 border rounded-lg" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button type="submit" disabled={loading}
            className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold disabled:opacity-50 hover:bg-blue-700">
            {loading ? 'Saving...' : isEditing ? 'Update Event' : 'Create Event'}
          </button>
        </form>
      </main>
    </div>
  );
}
