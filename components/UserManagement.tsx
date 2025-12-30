import React, { useState, useEffect } from 'react';
import { Users, Search, Edit2, Trash2, Shield, Ban, CheckCircle, X, Mail, Phone, MapPin, Calendar, Filter, Download, ShieldCheck, AlertCircle } from 'lucide-react';
import { useNotification } from './NotificationSystem';
import { useAuth } from '../contexts/AuthContext';
import { User, UserRole } from '../types';
import { collection, getDocs, updateDoc, deleteDoc, doc, query, where, orderBy, serverTimestamp, getDoc } from 'firebase/firestore';
import { db as firestore } from '../lib/firebase';
import { cleanFirestoreData } from '../utils/firestoreHelpers';

export const UserManagement: React.FC = () => {
  const { user: currentUser } = useAuth();
  const { notify } = useNotification();
  const [users, setUsers] = useState<(User & { verificationStatus?: string })[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'ALL'>('ALL');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState<Partial<User>>({});

  useEffect(() => {
    if (currentUser?.role === UserRole.ADMIN) {
      loadUsers();
    }
  }, [currentUser]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const usersRef = collection(firestore, 'users');
      const q = query(usersRef, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      
      // Load verification status for each user
      const usersData = await Promise.all(
        snapshot.docs.map(async (doc) => {
          const userData = { id: doc.id, ...doc.data() } as User & { verificationStatus?: string };
          
          // Check verification status
          const verificationQuery = query(
            collection(firestore, 'userVerifications'),
            where('userId', '==', doc.id)
          );
          const verificationSnapshot = await getDocs(verificationQuery);
          if (!verificationSnapshot.empty) {
            userData.verificationStatus = verificationSnapshot.docs[0].data().verificationStatus;
          }
          
          return userData;
        })
      );
      
      setUsers(usersData);
    } catch (error) {
      console.error('Failed to load users:', error);
      notify('Failed to load users', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setEditForm({
      name: user.name,
      email: user.email,
      phone: user.phone || '',
      location: user.location || '',
      role: user.role,
    });
    setShowEditModal(true);
  };

  const handleSaveUser = async () => {
    if (!selectedUser?.id) return;
    try {
      const userRef = doc(firestore, 'users', selectedUser.id);
      await updateDoc(userRef, cleanFirestoreData({
        ...editForm,
        updatedAt: serverTimestamp(),
      }));
      notify('User updated successfully', 'success');
      setShowEditModal(false);
      setSelectedUser(null);
      loadUsers();
    } catch (error) {
      console.error('Failed to update user:', error);
      notify('Failed to update user', 'error');
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!confirm(`Are you sure you want to delete user "${userName}"? This action cannot be undone.`)) return;
    try {
      await deleteDoc(doc(firestore, 'users', userId));
      notify('User deleted successfully', 'success');
      loadUsers();
    } catch (error) {
      console.error('Failed to delete user:', error);
      notify('Failed to delete user', 'error');
    }
  };

  const handleToggleUserStatus = async (user: User) => {
    try {
      const userRef = doc(firestore, 'users', user.id);
      await updateDoc(userRef, cleanFirestoreData({
        isActive: user.isActive !== false ? false : true,
        updatedAt: serverTimestamp(),
      }));
      notify(`User ${user.isActive !== false ? 'deactivated' : 'activated'}`, 'success');
      loadUsers();
    } catch (error) {
      console.error('Failed to toggle user status:', error);
      notify('Failed to update user status', 'error');
    }
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = 
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.phone || '').includes(searchTerm);
    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const roleColors: Record<UserRole, string> = {
    [UserRole.PATIENT]: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
    [UserRole.DOCTOR]: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
    [UserRole.PHARMACY]: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400',
    [UserRole.ADMIN]: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
    [UserRole.CHW]: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
    [UserRole.COURIER]: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400',
  };

  if (currentUser?.role !== UserRole.ADMIN) {
    return (
      <div className="p-8 text-center text-gray-500 dark:text-gray-400">
        Access denied. Admin only.
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold font-display text-gray-900 dark:text-white">User Management</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage all users in the system</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Total: <span className="font-bold text-gray-900 dark:text-white">{filteredUsers.length}</span> users
          </div>
          <button
            onClick={() => {
              const csv = [
                ['ID', 'Name', 'Email', 'Phone', 'Role', 'Location', 'Status', 'Created At'].join(','),
                ...users.map(u => [
                  u.id,
                  u.name,
                  u.email,
                  u.phone || '',
                  u.role,
                  u.location || '',
                  u.isActive !== false ? 'Active' : 'Inactive',
                  u.createdAt ? (u.createdAt.toDate ? u.createdAt.toDate().toISOString() : new Date(u.createdAt).toISOString()) : '',
                ].map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
              ].join('\n');
              const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
              const url = window.URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = url;
              link.download = `users-export-${new Date().toISOString().split('T')[0]}.csv`;
              link.click();
              window.URL.revokeObjectURL(url);
              notify('Users exported successfully', 'success');
            }}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm flex items-center gap-2"
          >
            <Download size={16} /> Export Users
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search by name, email, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-[#0A1B2E] border border-gray-200 dark:border-gray-700/50 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as UserRole | 'ALL')}
            className="px-4 py-3 bg-white dark:bg-[#0F172A] border border-gray-200 dark:border-gray-700/50 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none font-bold text-sm"
          >
            <option value="ALL">All Roles</option>
            {Object.values(UserRole).map(role => (
              <option key={role} value={role}>{role}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-[#0F172A] rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700/50 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-500 dark:text-gray-400">Loading users...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-[#0A1B2E]/50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">User</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Role</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Verification</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Contact</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Location</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                      No users found.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map(user => (
                    <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-gray-900 dark:text-white">{user.name}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${roleColors[user.role]}`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {user.role === UserRole.DOCTOR || user.role === UserRole.PHARMACY || user.role === UserRole.COURIER ? (
                          <div className="flex items-center gap-2">
                            {user.verificationStatus === 'Verified' ? (
                              <span className="px-2 py-1 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                                <ShieldCheck size={12} />
                                Verified
                              </span>
                            ) : user.verificationStatus === 'Pending' || user.verificationStatus === 'Under Review' ? (
                              <span className="px-2 py-1 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 flex items-center gap-1">
                                <AlertCircle size={12} />
                                {user.verificationStatus}
                              </span>
                            ) : user.verificationStatus === 'Rejected' ? (
                              <span className="px-2 py-1 rounded-full text-xs font-bold bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 flex items-center gap-1">
                                <X size={12} />
                                Rejected
                              </span>
                            ) : (
                              <span className="px-2 py-1 rounded-full text-xs font-bold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400 flex items-center gap-1">
                                <Shield size={12} />
                                Unverified
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          {user.phone && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                              <Phone size={14} /> {user.phone}
                            </p>
                          )}
                          <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                            <Mail size={14} /> {user.email}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {user.location ? (
                          <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                            <MapPin size={14} /> {user.location}
                          </p>
                        ) : (
                          <span className="text-sm text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                          user.isActive !== false
                            ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                            : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                        }`}>
                          {user.isActive !== false ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEditUser(user)}
                            className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                            title="Edit User"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleToggleUserStatus(user)}
                            className={`p-2 rounded-lg transition-colors ${
                              user.isActive !== false
                                ? 'text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20'
                                : 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
                            }`}
                            title={user.isActive !== false ? 'Deactivate' : 'Activate'}
                          >
                            {user.isActive !== false ? <Ban size={16} /> : <CheckCircle size={16} />}
                          </button>
                          {user.id !== currentUser?.id && (
                            <button
                              onClick={() => handleDeleteUser(user.id, user.name)}
                              className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                              title="Delete User"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit User Modal */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white dark:bg-[#0F172A] w-full max-w-md rounded-[2rem] shadow-2xl">
            <div className="p-6 border-b border-gray-100 dark:border-gray-700/50 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Edit User</h3>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedUser(null);
                }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Name *</label>
                <input
                  type="text"
                  value={editForm.name || ''}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700/50 bg-gray-50 dark:bg-[#0A1B2E] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Email *</label>
                <input
                  type="email"
                  value={editForm.email || ''}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700/50 bg-gray-50 dark:bg-[#0A1B2E] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Phone</label>
                <input
                  type="tel"
                  value={editForm.phone || ''}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700/50 bg-gray-50 dark:bg-[#0A1B2E] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Location</label>
                <input
                  type="text"
                  value={editForm.location || ''}
                  onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700/50 bg-gray-50 dark:bg-[#0A1B2E] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Role *</label>
                <select
                  value={editForm.role || UserRole.PATIENT}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value as UserRole })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700/50 bg-gray-50 dark:bg-[#0A1B2E] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  {Object.values(UserRole).map(role => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700/50">
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedUser(null);
                  }}
                  className="px-6 py-3 rounded-xl font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveUser}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

