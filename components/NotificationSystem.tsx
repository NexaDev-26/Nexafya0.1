
import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

export type NotificationType = 'success' | 'error' | 'info' | 'warning';

interface NotificationAction {
  label: string;
  onClick: () => void;
}

interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  action?: NotificationAction;
  duration?: number;
}

interface NotificationContextType {
  notify: (
    message: string, 
    type?: NotificationType, 
    options?: { action?: NotificationAction; duration?: number }
  ) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const notify = useCallback((
    message: string, 
    type: NotificationType = 'info',
    options?: { action?: NotificationAction; duration?: number }
  ) => {
    const id = Date.now().toString();
    const duration = options?.duration || 5000;
    setNotifications((prev) => [...prev, { 
      id, 
      type, 
      message, 
      action: options?.action,
      duration 
    }]);
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, duration);
  }, []);

  const removeNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <NotificationContext.Provider value={{ notify }}>
      {children}
      {/* Increased z-index to z-[200] to appear above modals (usually z-50 or z-[100]) */}
      <div className="fixed top-4 right-4 z-[200] flex flex-col gap-2 w-full max-w-sm pointer-events-none">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`
              pointer-events-auto flex items-start gap-3 p-4 rounded-xl shadow-lg border animate-in slide-in-from-right-full duration-300 bg-white dark:bg-[#0F172A] hover:shadow-xl transition-all
              ${notification.type === 'success' ? 'border-emerald-500 text-gray-800 dark:text-white bg-emerald-50/50 dark:bg-emerald-900/10' : ''}
              ${notification.type === 'error' ? 'border-red-500 text-gray-800 dark:text-white bg-red-50/50 dark:bg-red-900/10' : ''}
              ${notification.type === 'info' ? 'border-blue-500 text-gray-800 dark:text-white bg-blue-50/50 dark:bg-blue-900/10' : ''}
              ${notification.type === 'warning' ? 'border-amber-500 text-gray-800 dark:text-white bg-amber-50/50 dark:bg-amber-900/10' : ''}
            `}
          >
            <div className="flex-shrink-0 mt-0.5">
              {notification.type === 'success' && <CheckCircle className="text-emerald-500" size={20} />}
              {notification.type === 'error' && <AlertCircle className="text-red-500" size={20} />}
              {notification.type === 'info' && <Info className="text-blue-500" size={20} />}
              {notification.type === 'warning' && <AlertCircle className="text-amber-500" size={20} />}
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium mb-1">{notification.message}</div>
              {notification.action && (
                <button
                  onClick={() => {
                    notification.action?.onClick();
                    removeNotification(notification.id);
                  }}
                  className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline mt-1"
                >
                  {notification.action.label}
                </button>
              )}
            </div>
            <button
              onClick={() => removeNotification(notification.id)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors flex-shrink-0"
              aria-label="Close notification"
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
};
