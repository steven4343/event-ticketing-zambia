import Link from 'next/link';

export default function EmptyState({ icon = '📭', title, message, actionLabel, actionHref, onAction }) {
  return (
    <div className="text-center py-16">
      <p className="text-5xl mb-4" role="img" aria-label={title || 'Empty state'}>{icon}</p>
      <p className="text-gray-500 text-lg mb-2">{title || 'Nothing here yet'}</p>
      {message && <p className="text-gray-400 mb-6">{message}</p>}
      {actionLabel && actionHref && (
        <Link href={actionHref} className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700">
          {actionLabel}
        </Link>
      )}
      {actionLabel && onAction && !actionHref && (
        <button onClick={onAction} className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700">
          {actionLabel}
        </button>
      )}
    </div>
  );
}
