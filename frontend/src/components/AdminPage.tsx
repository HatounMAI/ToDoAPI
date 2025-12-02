import { useState, useEffect } from 'react';
import { Users, Crown, CheckCircle2, Target, Trash2, Shield, AlertCircle } from 'lucide-react';
import { adminAPI, User, AdminStats } from '../services/api';

interface AdminPageProps {
  currentUserId: number;
}

export function AdminPage({ currentUserId }: AdminPageProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingUserId, setDeletingUserId] = useState<number | null>(null);

  // Fetch data from backend API
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError('');
      const [usersData, statsData] = await Promise.all([
        adminAPI.getAllUsers(),
        adminAPI.getSystemStats(),
      ]);
      setUsers(usersData);
      setStats(statsData);
    } catch (err: any) {
      console.error('Failed to load admin data:', err);
      setError(err.message || 'Failed to load admin data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleAdmin = async (userId: number) => {
    try {
      await adminAPI.toggleAdminRole(userId);
      // Reload data to get updated user info
      await loadData();
    } catch (err: any) {
      console.error('Failed to toggle admin role:', err);
      setError(err.message || 'Failed to update user role');
    }
  };

  const handleDeleteUser = async (userId: number) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete user "${user.username}"? This will also delete all their todos. This action cannot be undone.`
    );

    if (!confirmed) return;

    setDeletingUserId(userId);
    try {
      await adminAPI.deleteUser(userId);
      // Reload data to get updated list
      await loadData();
    } catch (err: any) {
      console.error('Failed to delete user:', err);
      setError(err.message || 'Failed to delete user');
    } finally {
      setDeletingUserId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Crown className="w-8 h-8 text-purple-600" />
          <h1 className="text-gray-900">Admin Dashboard</h1>
        </div>
        <p className="text-gray-600">Manage users and view system statistics</p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p>{error}</p>
          <button
            onClick={() => setError('')}
            className="ml-auto text-red-600 hover:text-red-700"
          >
            ✕
          </button>
        </div>
      )}

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-gray-600">Total Users</p>
                <p className="text-gray-900">{stats.users.total}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Crown className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-gray-600">Admin Users</p>
                <p className="text-gray-900">{stats.users.admins}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Target className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-gray-600">Total Todos</p>
                <p className="text-gray-900">{stats.todos.total}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <p className="text-gray-600">Completed</p>
                <p className="text-gray-900">{stats.todos.completed}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* User Management Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-gray-900">User Management</h2>
          <p className="text-gray-600">Manage user roles and accounts</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-gray-600">User</th>
                <th className="px-6 py-3 text-left text-gray-600">Email</th>
                <th className="px-6 py-3 text-left text-gray-600">Role</th>
                <th className="px-6 py-3 text-left text-gray-600">Status</th>
                <th className="px-6 py-3 text-left text-gray-600">Joined</th>
                <th className="px-6 py-3 text-right text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {users.map((user) => {
                const isCurrentUser = user.id === currentUserId;
                return (
                  <tr
                    key={user.id}
                    className={`${
                      isCurrentUser ? 'bg-blue-50' : 'hover:bg-gray-50'
                    } transition-colors`}
                  >
                    {/* User Info */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white">
                          {user.username.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-gray-900">{user.username}</p>
                          {isCurrentUser && (
                            <p className="text-blue-600">(You)</p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Email */}
                    <td className="px-6 py-4 text-gray-600">
                      {user.email}
                    </td>

                    {/* Role Badge */}
                    <td className="px-6 py-4">
                      {user.is_admin ? (
                        <div className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-700 rounded-full">
                          <Crown className="w-4 h-4" />
                          Admin
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-700 rounded-full">
                          <Shield className="w-4 h-4" />
                          User
                        </div>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4">
                      {user.email_verified ? (
                        <div className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full">
                          <CheckCircle2 className="w-4 h-4" />
                          Active
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1 px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full">
                          <AlertCircle className="w-4 h-4" />
                          Pending
                        </div>
                      )}
                    </td>

                    {/* Join Date */}
                    <td className="px-6 py-4 text-gray-600">
                      {new Date(user.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleToggleAdmin(user.id)}
                          disabled={isCurrentUser}
                          className={`px-3 py-1 rounded-lg transition-colors ${
                            isCurrentUser
                              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                              : user.is_admin
                              ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                              : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                          }`}
                          title={isCurrentUser ? "Can't modify your own role" : ''}
                        >
                          {user.is_admin ? 'Remove Admin' : 'Make Admin'}
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.id)}
                          disabled={isCurrentUser || deletingUserId === user.id}
                          className={`p-2 rounded-lg transition-colors ${
                            isCurrentUser
                              ? 'text-gray-400 cursor-not-allowed'
                              : 'text-red-600 hover:bg-red-50'
                          }`}
                          title={isCurrentUser ? "Can't delete your own account" : 'Delete user'}
                        >
                          {deletingUserId === user.id ? (
                            <div className="w-5 h-5 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Trash2 className="w-5 h-5" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
