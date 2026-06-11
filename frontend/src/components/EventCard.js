import Link from 'next/link';

export default function EventCard({ event }) {
  const lowestPrice = event.ticket_types?.reduce((min, tt) =>
    parseFloat(tt.price) < parseFloat(min) ? tt.price : min, event.ticket_types?.[0]?.price || 0
  );

  return (
    <Link href={`/events/${event.id}`} className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow">
      {event.banner_image ? (
        <img src={event.banner_image} alt={event.title} className="w-full h-40 object-cover" />
      ) : (
        <div className="w-full h-40 bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-lg font-bold">
          {event.title?.charAt(0)}
        </div>
      )}
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 truncate">{event.title}</h3>
        <p className="text-sm text-gray-500 mt-1"><span role="img" aria-label="Date">📅</span> {new Date(event.event_date).toLocaleDateString()}</p>
        <p className="text-sm text-gray-500"><span role="img" aria-label="Location">📍</span> {event.venue}</p>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-blue-600 font-bold">From K{parseFloat(lowestPrice).toFixed(2)}</span>
          <span className="text-xs text-gray-400">by {event.organizer_name}</span>
        </div>
      </div>
    </Link>
  );
}
