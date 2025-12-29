/**
 * Notifications Panel Component
 * Displays and manages user notifications
 */

import React, { useState, useEffect } from 'react';
import { Bell, X, CheckCircle, AlertCircle, Info, Clock, Check, Trash2 } from 'lucide-react';
import { useNotification } from './NotificationSystem';
import { useAuth } from '../contexts/AuthContext';
import { notificationService, AppNotification } from '../services/notificationService';
import { usePreferences } from '../contexts/PreferencesContext';

interface NotificationsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationsPanel: React.FC<NotificationsPanelProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const { notify } = useNotification();
  const { t } = usePreferences();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && user?.id) {
      loadNotifications();
      
      // Subscribe to real-time updates
      const unsubscribe = notificationService.subscribeToNotifications(user.id, (notifs) => {
        setNotifications(notifs);
        setUnreadCount(notifs.filter(n => !n.read).length);
      });

      return () => unsubscribe();
    }
  }, [isOpen, user?.id]);

  const loadNotifications = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const [notifs, count] = await Promise.all([
        notificationService.getNotifications(user.id, user.role, 50),
        notificationService.getUnreadCount(user.id),
      ]);
      setNotifications(notifs);
      setUnreadCount(count);
    } catch (error) {
      console.error('Load notifications error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await notificationService.markAsRead(notificationId);
      setNotifications(prev =>
        prev.map(n => (n.id === notificationId ? { ...n, read: true } : n))
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      notify('Failed to mark notification as read', 'error');
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!user?.id) return;

    try {
      await notificationService.markAllAsRead(user.id);
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
      notify('All notifications marked as read', 'success');
    } catch (error) {
      notify('Failed to mark all as read', 'error');
    }
  };

  const handleDelete = async (notificationId: string) => {
    try {
      await notificationService.deleteNotification(notificationId);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      notify('Notification deleted', 'success');
    } catch (error) {
      notify('Failed to delete notification', 'error');
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'APPOINTMENT_REMINDER':
      case 'MEDICATION_REMINDER':
        return <Clock className="text-blue-500" size={20} />;
      case 'PAYMENT_SUCCESS':
        return <CheckCircle className="text-green-500" size={20} />;
      case 'PAYMENT_FAILED':
        return <AlertCircle className="text-red-500" size={20} />;
      default:
        return <Info className="text-gray-500" size={20} />;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-end pt-20 pr-4">
      <div className="bg-white dark:bg-white rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-600 w-full max-w-md max-h-[calc(100vh-6rem)] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-600">
          <div className="flex items-center gap-3">
            <Bell className="text-nexafya-blue" size={24} />
            <div>
              <h3 className="font-bold text-gray-900 dark:text-gray-800">{t('notifications')}</h3>
              {unreadCount > 0 && (
                <p className="text-xs text-gray-500">{unreadCount} unread</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-xs px-3 py-1 text-nexafya-blue hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
              >
                Mark all read
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X size={20} className="text-gray-500" />
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading notifications...</div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-12">
              <Bell className="mx-auto mb-4 text-gray-400" size={48} />
              <p className="text-gray-500">No notifications</p>
            </div>
          ) : (
            notifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-4 rounded-xl border transition-all cursor-pointer hover:shadow-md ${
                  notification.read
                    ? 'bg-gray-50 dark:bg-[#0A1B2E]/50 border-gray-200 dark:border-gray-600'
                    : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                }`}
                onClick={() => {
                  if (!notification.read && notification.id) {
                    handleMarkAsRead(notification.id);
                  }
                  if (notification.actionUrl) {
                    window.location.href = notification.actionUrl;
                  }
                }}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900 dark:text-gray-800 text-sm mb-1">
                          {notification.title}
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-600">
                          {notification.message}
                        </p>
                        {notification.createdAt && (
                          <p className="text-xs text-gray-400 mt-2">
                            {new Date(notification.createdAt).toLocaleString()}
                          </p>
                        )}
                      </div>
                      {!notification.read && (
                        <div className="w-2 h-2 bg-nexafya-blue rounded-full flex-shrink-0 mt-1" />
                      )}
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (notification.id) {
                        handleDelete(notification.id);
                      }
                    }}
                    className="flex-shrink-0 p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                  >
                    <Trash2 size={16} className="text-gray-400" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

