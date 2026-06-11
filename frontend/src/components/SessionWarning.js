import { useAuth } from '../context/AuthContext';

export default function SessionWarning() {
  const { showWarning, setShowWarning, logout } = useAuth();

  if (!showWarning) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-yellow-50 border-b border-yellow-200 px-4 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-yellow-600 text-lg" role="img" aria-label="Warning">⚠️</span>
          <p className="text-yellow-800 font-medium">
            Your session will expire soon due to inactivity
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowWarning(false)}
            className="px-4 py-1.5 bg-yellow-600 text-white rounded-lg text-sm font-medium hover:bg-yellow-700">
            Stay Logged In
          </button>
          <button onClick={logout}
            className="px-4 py-1.5 bg-gray-200 rounded-lg text-sm font-medium hover:bg-gray-300">
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}
