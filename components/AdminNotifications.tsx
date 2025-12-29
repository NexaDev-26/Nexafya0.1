import React, { useState } from 'react';
import { Bell, Send, Users, Mail, MessageSquare, Target, Calendar, FileText } from 'lucide-react';
import { useNotification } from './NotificationSystem';
import { useAuth } from '../contexts/AuthContext';
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { db as firestore } from '../lib/firebase';
import { UserRole } from '../types';

interface NotificationData {
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  targetAudience: 'all' | 'patients' | 'doctors' | 'pharmacies' | 'couriers' | 'chw' | 'custom';
  selectedUsers?: string[];
  scheduledDate?: string;
  scheduledTime?: string;
  sendNow: boolean;
}

export const AdminNotifications: React.FC = () => {
  const { user } = useAuth();
  const { notify } = useNotification();
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<NotificationData>({
    title: '',
    message: '',
    type: 'info',
    targetAudience: 'all',
    sendNow: true,
  });

  const handleSend = async () => {
    if (!notification.title || !notification.message) {
      notify('Please fill in title and message', 'error');
      return;
    }

    setLoading(true);
    try {
      // Get target users based on audience
      let targetUserIds: string[] = [];

      if (notification.targetAudience === 'all') {
        const usersRef = collection(firestore, 'users');
        const usersSnap = await getDocs(usersRef);
        targetUserIds = usersSnap.docs.map(doc => doc.id);
      } else if (notification.targetAudience === 'custom' && notification.selectedUsers) {
        targetUserIds = notification.selectedUsers;
      } else {
        const roleMap: Record<string, UserRole> = {
          'patients': UserRole.PATIENT,
          'doctors': UserRole.DOCTOR,
          'pharmacies': UserRole.PHARMACY,
          'couriers': UserRole.COURIER,
          'chw': UserRole.CHW,
        };
        const targetRole = roleMap[notification.targetAudience];
        if (targetRole) {
          const usersRef = collection(firestore, 'users');
          const q = query(usersRef, where('role', '==', targetRole));
          const usersSnap = await getDocs(q);
          targetUserIds = usersSnap.docs.map(doc => doc.id);
        }
      }

      // Create notification records
      const notificationsRef = collection(firestore, 'notifications');
      const notificationPromises = targetUserIds.map(userId =>
        addDoc(notificationsRef, {
          userId,
          title: notification.title,
          message: notification.message,
          type: notification.type,
          read: false,
          createdAt: serverTimestamp(),
          sentBy: user?.id,
          sentByName: user?.name,
        })
      );

      await Promise.all(notificationPromises);
      notify(`Notification sent to ${targetUserIds.length} users`, 'success');
      
      // Reset form
      setNotification({
        title: '',
        message: '',
        type: 'info',
        targetAudience: 'all',
        sendNow: true,
      });
    } catch (error) {
      console.error('Failed to send notification:', error);
      notify('Failed to send notification', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold font-display text-gray-900 dark:text-white">Send Notifications</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Send notifications to users</p>
        </div>
      </div>

      {/* Notification Form */}
      <div className="bg-white dark:bg-[#0F172A] rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700/50 p-6">
        <div className="space-y-6">
          {/* Title */}
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">
              Notification Title *
            </label>
            <input
              type="text"
              value={notification.title}
              onChange={(e) => setNotification({ ...notification, title: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700/50 bg-gray-50 dark:bg-[#0A1B2E] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="e.g., System Maintenance Notice"
            />
          </div>

          {/* Message */}
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">
              Message *
            </label>
            <textarea
              value={notification.message}
              onChange={(e) => setNotification({ ...notification, message: e.target.value })}
              rows={5}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700/50 bg-gray-50 dark:bg-[#0A1B2E] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none resize-none"
              placeholder="Enter notification message..."
            />
          </div>

          {/* Type and Audience */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">
                Notification Type
              </label>
              <select
                value={notification.type}
                onChange={(e) => setNotification({ ...notification, type: e.target.value as any })}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700/50 bg-gray-50 dark:bg-[#0A1B2E] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="info">Info</option>
                <option value="success">Success</option>
                <option value="warning">Warning</option>
                <option value="error">Error</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">
                Target Audience
              </label>
              <select
                value={notification.targetAudience}
                onChange={(e) => setNotification({ ...notification, targetAudience: e.target.value as any })}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700/50 bg-gray-50 dark:bg-[#0A1B2E] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="all">All Users</option>
                <option value="patients">Patients Only</option>
                <option value="doctors">Doctors Only</option>
                <option value="pharmacies">Pharmacies Only</option>
                <option value="couriers">Couriers Only</option>
                <option value="chw">Community Health Workers</option>
                <option value="custom">Custom (Select Users)</option>
              </select>
            </div>
          </div>

          {/* Send Now / Schedule */}
          <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-[#0A1B2E] rounded-xl">
            <input
              type="checkbox"
              checked={notification.sendNow}
              onChange={(e) => setNotification({ ...notification, sendNow: e.target.checked })}
              className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <div>
              <label className="font-bold text-gray-900 dark:text-white">Send Immediately</label>
              <p className="text-sm text-gray-500 dark:text-gray-400">Send notification right away</p>
            </div>
          </div>

          {!notification.sendNow && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">
                  Schedule Date
                </label>
                <input
                  type="date"
                  value={notification.scheduledDate || ''}
                  onChange={(e) => setNotification({ ...notification, scheduledDate: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700/50 bg-gray-50 dark:bg-[#0A1B2E] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">
                  Schedule Time
                </label>
                <input
                  type="time"
                  value={notification.scheduledTime || ''}
                  onChange={(e) => setNotification({ ...notification, scheduledTime: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700/50 bg-gray-50 dark:bg-[#0A1B2E] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>
          )}

          {/* Send Button */}
          <div className="flex justify-end pt-4 border-t border-gray-100 dark:border-gray-700/50">
            <button
              onClick={handleSend}
              disabled={loading || !notification.title || !notification.message}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Sending...
                </>
              ) : (
                <>
                  <Send size={18} />
                  Send Notification
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Notification Templates */}
      <div className="bg-white dark:bg-[#0F172A] rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700/50 p-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <FileText size={20} className="text-blue-600" /> Quick Templates
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { title: 'System Maintenance', message: 'We will be performing scheduled maintenance on [date]. The platform will be temporarily unavailable.', type: 'warning' as const },
            { title: 'New Feature Available', message: 'We\'ve added a new feature! Check it out in your dashboard.', type: 'info' as const },
            { title: 'Welcome!', message: 'Welcome to NexaFya! Get started by exploring our features.', type: 'success' as const },
            { title: 'Payment Received', message: 'Your payment has been processed successfully.', type: 'success' as const },
            { title: 'Account Verification', message: 'Please verify your account to access all features.', type: 'warning' as const },
            { title: 'Service Update', message: 'We\'ve updated our services. Check out the latest improvements!', type: 'info' as const },
          ].map((template, index) => (
            <button
              key={index}
              onClick={() => setNotification({
                ...notification,
                title: template.title,
                message: template.message,
                type: template.type,
              })}
              className="p-4 bg-gray-50 dark:bg-[#0A1B2E] hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl text-left transition-colors border border-gray-200 dark:border-gray-700/50"
            >
              <p className="font-bold text-gray-900 dark:text-white mb-1">{template.title}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{template.message}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

