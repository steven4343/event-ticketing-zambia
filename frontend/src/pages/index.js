import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { getEvents, getCategories } from '../services/api';
import { useAuth } from '../context/AuthContext';
import EventCard from '../components/EventCard';
import SessionWarning from '../components/SessionWarning';
import NotificationBell from '../components/NotificationBell';
import EmptyState from '../components/EmptyState';

export default function Home() {
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [regionFilter, setRegionFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 12 };
      if (search) params.search = search;
      if (categoryId) params.category_id = categoryId;
      if (cityFilter) params.city = cityFilter;
      if (regionFilter) params.region = regionFilter;
      const { data } = await getEvents(params);
      setEvents(data.events);
      setTotalPages(data.pages);
      setTotal(data.total);
    } catch (err) {
      console.error('Failed to fetch events:', err);
    } finally {
      setLoading(false);
    }
  }, [page, search, categoryId, cityFilter, regionFilter]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  useEffect(() => {
    getCategories().then(({ data }) => setCategories(data.categories)).catch(() => {});
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <SessionWarning />
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <nav className="max-w-7xl mx-auto px-4 py-4 flex flex-wrap items-center gap-2">
          <Link href="/" className="text-xl sm:text-2xl font-bold text-blue-600">EventHub Zambia</Link>
          <div className="flex items-center gap-2 sm:gap-4 ml-auto flex-wrap">
            {user ? (
              <>
                {user.role === 'super_admin' && <Link href="/admin" className="text-blue-600 text-xs sm:text-sm font-medium">Admin</Link>}
                <Link href={user.role === 'organizer' ? '/organizer/dashboard' : '/tickets'} className="text-blue-600 text-xs sm:text-sm font-medium">
                  {user.role === 'organizer' ? 'Dashboard' : 'My Tickets'}
                </Link>
                <NotificationBell />
                <span className="text-xs sm:text-sm text-gray-600 truncate max-w-[100px]">{user.name}</span>
              </>
            ) : (
              <>
                <Link href="/login" className="px-3 sm:px-4 py-2 text-blue-600 text-sm font-medium">Login</Link>
                <Link href="/register" className="px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium">Register</Link>
              </>
            )}
          </div>
        </nav>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <section className="text-center mb-8">
          <h1 className="text-2xl sm:text-4xl font-bold text-gray-900 mb-4">Discover Events in Zambia</h1>
          <p className="text-lg text-gray-600">Buy tickets for concerts, conferences, sports, and more</p>
        </section>

        <form onSubmit={handleSearch} className="max-w-2xl mx-auto mb-8 flex flex-col sm:flex-row gap-3">
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search events..." className="flex-1 px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <select value={categoryId} onChange={(e) => { setCategoryId(e.target.value); setPage(1); }}
            className="px-4 py-3 border rounded-lg bg-white w-full sm:w-auto">
            <option value="">All Categories</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <input type="text" value={cityFilter} onChange={(e) => { setCityFilter(e.target.value); setPage(1); }}
            placeholder="City..." className="px-4 py-3 border rounded-lg w-full sm:w-32" />
          <select value={regionFilter} onChange={(e) => { setRegionFilter(e.target.value); setPage(1); }}
            className="px-4 py-3 border rounded-lg bg-white w-full sm:w-auto">
            <option value="">All Regions</option>
            <option value="Lusaka">Lusaka</option>
            <option value="Copperbelt">Copperbelt</option>
            <option value="Southern">Southern</option>
            <option value="Central">Central</option>
            <option value="Eastern">Eastern</option>
            <option value="Western">Western</option>
            <option value="Northern">Northern</option>
            <option value="Luapula">Luapula</option>
            <option value="Muchinga">Muchinga</option>
            <option value="North-Western">North-Western</option>
          </select>
          <button type="submit" className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 w-full sm:w-auto">Search</button>
        </form>

        <section>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold text-gray-900">Upcoming Events</h2>
            {total > 0 && <span className="text-sm text-gray-500">{total} event{total !== 1 ? 's' : ''} found</span>}
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white rounded-lg shadow-sm h-64 animate-pulse" />
              ))}
            </div>
          ) : events.length === 0 ? (
            <EmptyState icon="🎫" title="No events found" message="Try adjusting your search or check back later" />
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {events.map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>

              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-4 mt-8">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                    className="px-4 py-2 border rounded-lg disabled:opacity-50 hover:bg-gray-100">
                    <span aria-hidden="true">←</span> Previous
                  </button>
                  <span className="text-sm text-gray-600">
                    Page {page} of {totalPages}
                  </span>
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                    className="px-4 py-2 border rounded-lg disabled:opacity-50 hover:bg-gray-100">
                    Next <span aria-hidden="true">→</span>
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      </main>
    </div>
  );
}
