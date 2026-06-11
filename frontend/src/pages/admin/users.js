import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '../../context/AuthContext';
import { getAdminUsers, updateUserStatus } from '../../services/api';
import Breadcrumbs from '../../components/Breadcrumbs';
import NotificationBell from '../../components/NotificationBell';
import EmptyState from '../../components/EmptyState';
import toast from 'react-hot-toast';

export default function AdminUsers() {
  const { user } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (search) params.search = search;
      if (roleFilter) params.role = roleFilter;
      const { data } = await getAdminUsers(params);
      setUsers(data.users);
      setTotal(data.total);
    } catch (err) {
      console.error('Failed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, [page, roleFilter]);

  const handleSearch = (e) => { e.preventDefault(); setPage(1); };

  const toggleStatus = async (id, current) => {
    try {
      await updateUserStatus(id, !current);
      toast.success(`User ${current ? 'deactivated' : 'activated'}`);
      fetchUsers();
    } catch (err) {
      toast.error('Failed to update user status');
    }
  };

  if (!user || user.role !== 'super_admin') {
    return <div className="min-h-screen flex items-center justify-center text-red-500">Access denied</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <nav className="max-w-7xl mx-auto px-4 py-4 flex flex-wrap items-center gap-2">
          <Link href="/admin" className="text-lg sm:text-xl font-bold text-blue-600"><span aria-hidden="true">←</span> Admin</Link>
          <span className="text-sm sm:text-lg font-semibold flex-1 text-center">Users</span>
          <NotificationBell />
        </nav>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <Breadcrumbs pathname={router.pathname} />
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3 mb-6">
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email..." className="flex-1 px-4 py-2 border rounded-lg" />
          <select value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
            className="px-4 py-2 border rounded-lg bg-white w-full sm:w-auto">
            <option value="">All Roles</option>
            <option value="customer">Customers</option>
            <option value="organizer">Organizers</option>
            <option value="super_admin">Admins</option>
          </select>
          <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-lg w-full sm:w-auto">Search</button>
        </form>

        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-4 space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-gray-100 animate-pulse rounded" />)}</div>
          ) : users.length === 0 ? (
            <EmptyState title="No users found" message="Try adjusting your search" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Name</th>
                    <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Email</th>
                    <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Phone</th>
                    <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Role</th>
                    <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Status</th>
                    <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium">{u.name}</td>
                    <td className="px-6 py-4 text-sm">{u.email}</td>
                    <td className="px-6 py-4 text-sm">{u.phone}</td>
                    <td className="px-6 py-4"><span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize">{u.role.replace('_', ' ')}</span></td>
                    <td className="px-6 py-4"><span className={`px-2 py-1 rounded-full text-xs font-medium ${u.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{u.is_active ? 'Active' : 'Inactive'}</span></td>
                    <td className="px-6 py-4">
                      {u.role !== 'super_admin' && (
                        <button onClick={() => toggleStatus(u.id, u.is_active)}
                          className={`text-sm ${u.is_active ? 'text-red-600' : 'text-green-600'} hover:underline`}>
                          {u.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}

          {total > 20 && (
            <div className="flex justify-center items-center gap-4 p-4 border-t">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="px-3 py-1 border rounded text-sm disabled:opacity-50"><span aria-hidden="true">←</span> Prev</button>
              <span className="text-sm text-gray-600">{page} of {Math.ceil(total / 20)}</span>
              <button onClick={() => setPage(p => p + 1)} disabled={page >= Math.ceil(total / 20)}
                className="px-3 py-1 border rounded text-sm disabled:opacity-50">Next <span aria-hidden="true">→</span></button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
