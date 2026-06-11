import Link from 'next/link';

const labelMap = {
  '': 'Home',
  'events': 'Events',
  'tickets': 'My Tickets',
  'profile': 'Profile',
  'scanner': 'Scanner',
  'admin': 'Admin',
  'users': 'Users',
  'organizer': 'Dashboard',
  'create': 'Create Event',
  'stats': 'Statistics',
};

function buildCrumbs(pathname) {
  const parts = pathname.split('/').filter(Boolean);
  const crumbs = [{ href: '/', label: 'Home' }];
  let cum = '';

  for (const part of parts) {
    if (part.startsWith('[') || part.startsWith('...')) continue;
    cum += `/${part}`;
    crumbs.push({ href: cum, label: labelMap[part] || part.charAt(0).toUpperCase() + part.slice(1) });
  }

  return crumbs;
}

export default function Breadcrumbs({ pathname, className = '' }) {
  if (!pathname || pathname === '/') return null;
  const crumbs = buildCrumbs(pathname);

  return (
    <nav className={`text-sm text-gray-500 mb-4 ${className}`}>
      {crumbs.map((c, i) => (
        <span key={c.href}>
          {i > 0 && <span className="mx-2">/</span>}
          {i < crumbs.length - 1 ? (
            <Link href={c.href} className="hover:text-blue-600">{c.label}</Link>
          ) : (
            <span className="text-gray-800 font-medium">{c.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
