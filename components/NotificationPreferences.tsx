import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  Mail, 
  Smartphone, 
  Save,
  CheckCircle,
  Settings
} from 'lucide-react';
import { useNotification } from './NotificationSystem';
import { useAuth } from '../contexts/AuthContext';
import { handleError } from '../utils/errorHandler';

interface NotificationPreferences {
  email: {
    enabled: boolean;
    consultations: boolean;
    appointments: boolean;
    medications: boolean;
    healthRecords: boolean;
    pharmacy: boolean;
    system: boolean;
  };
  push: {
    enabled: boolean;
    consultations: boolean;
    appointments: boolean;
    medications: boolean;
    healthRecords: boolean;
    pharmacy: boolean;
    system: boolean;
  };
  sms: {
    enabled: boolean;
    consultations: boolean;
    appointments: boolean;
    medications: boolean;
    urgent: boolean;
  };
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
  };
}

export const NotificationPreferences: React.FC = () => {
  const { notify } = useNotification();
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    email: {
      enabled: true,
      consultations: true,
      appointments: true,
      medications: true,
      healthRecords: false,
      pharmacy: true,
      system: true,
    },
    push: {
      enabled: true,
      consultations: true,
      appointments: true,
      medications: true,
      healthRecords: false,
      pharmacy: true,
      system: false,
    },
    sms: {
      enabled: false,
      consultations: false,
      appointments: true,
      medications: false,
      urgent: true,
    },
    quietHours: {
      enabled: false,
      start: '22:00',
      end: '07:00',
    },
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      // Load preferences from database
      // const data = await db.getNotificationPreferences(user?.id);
      // if (data) setPreferences(data);
    } catch (error) {
      handleError(error, notify);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Save preferences to database
      // await db.updateNotificationPreferences(user?.id, preferences);
      notify('Notification preferences saved successfully', 'success');
    } catch (error) {
      handleError(error, notify);
    } finally {
      setSaving(false);
    }
  };

  const updatePreference = (category: keyof NotificationPreferences, field: string, value: any) => {
    setPreferences(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [field]: value,
      },
    }));
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Notification Preferences</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Customize how and when you receive notifications</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg flex items-center gap-2 transition-colors disabled:opacity-50"
        >
          <Save size={20} />
          {saving ? 'Saving...' : 'Save Preferences'}
        </button>
      </div>

      {/* Email Notifications */}
      <div className="bg-white dark:bg-[#0F172A] rounded-3xl border border-gray-100 dark:border-gray-700/50 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
            <Mail className="text-blue-600 dark:text-blue-400" size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Email Notifications</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Receive notifications via email</p>
          </div>
          <div className="ml-auto">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.email.enabled}
                onChange={(e) => updatePreference('email', 'enabled', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>

        {preferences.email.enabled && (
          <div className="space-y-4 pl-16">
            {[
              { key: 'consultations', label: 'Consultations' },
              { key: 'appointments', label: 'Appointments' },
              { key: 'medications', label: 'Medication Reminders' },
              { key: 'healthRecords', label: 'Health Records' },
              { key: 'pharmacy', label: 'Pharmacy Updates' },
              { key: 'system', label: 'System Notifications' },
            ].map(item => (
              <label key={item.key} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-[#0A0F1C] rounded-xl cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                <span className="font-bold text-gray-900 dark:text-white">{item.label}</span>
                <input
                  type="checkbox"
                  checked={(preferences.email as any)[item.key]}
                  onChange={(e) => updatePreference('email', item.key, e.target.checked)}
                  className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                />
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Push Notifications */}
      <div className="bg-white dark:bg-[#0F172A] rounded-3xl border border-gray-100 dark:border-gray-700/50 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
            <Bell className="text-purple-600 dark:text-purple-400" size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Push Notifications</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Receive notifications in the app</p>
          </div>
          <div className="ml-auto">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.push.enabled}
                onChange={(e) => updatePreference('push', 'enabled', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 dark:peer-focus:ring-purple-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-purple-600"></div>
            </label>
          </div>
        </div>

        {preferences.push.enabled && (
          <div className="space-y-4 pl-16">
            {[
              { key: 'consultations', label: 'Consultations' },
              { key: 'appointments', label: 'Appointments' },
              { key: 'medications', label: 'Medication Reminders' },
              { key: 'healthRecords', label: 'Health Records' },
              { key: 'pharmacy', label: 'Pharmacy Updates' },
              { key: 'system', label: 'System Notifications' },
            ].map(item => (
              <label key={item.key} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-[#0A0F1C] rounded-xl cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                <span className="font-bold text-gray-900 dark:text-white">{item.label}</span>
                <input
                  type="checkbox"
                  checked={(preferences.push as any)[item.key]}
                  onChange={(e) => updatePreference('push', item.key, e.target.checked)}
                  className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
                />
              </label>
            ))}
          </div>
        )}
      </div>

      {/* SMS Notifications */}
      <div className="bg-white dark:bg-[#0F172A] rounded-3xl border border-gray-100 dark:border-gray-700/50 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-xl">
            <Smartphone className="text-green-600 dark:text-green-400" size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">SMS Notifications</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Receive notifications via SMS</p>
          </div>
          <div className="ml-auto">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.sms.enabled}
                onChange={(e) => updatePreference('sms', 'enabled', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 dark:peer-focus:ring-green-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-green-600"></div>
            </label>
          </div>
        </div>

        {preferences.sms.enabled && (
          <div className="space-y-4 pl-16">
            {[
              { key: 'consultations', label: 'Consultations' },
              { key: 'appointments', label: 'Appointments' },
              { key: 'medications', label: 'Medication Reminders' },
              { key: 'urgent', label: 'Urgent Notifications Only' },
            ].map(item => (
              <label key={item.key} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-[#0A0F1C] rounded-xl cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                <span className="font-bold text-gray-900 dark:text-white">{item.label}</span>
                <input
                  type="checkbox"
                  checked={(preferences.sms as any)[item.key]}
                  onChange={(e) => updatePreference('sms', item.key, e.target.checked)}
                  className="w-5 h-5 text-green-600 rounded focus:ring-green-500"
                />
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Quiet Hours */}
      <div className="bg-white dark:bg-[#0F172A] rounded-3xl border border-gray-100 dark:border-gray-700/50 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-xl">
            <Settings className="text-orange-600 dark:text-orange-400" size={24} />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Quiet Hours</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Silence notifications during specific hours</p>
          </div>
          <div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.quietHours.enabled}
                onChange={(e) => updatePreference('quietHours', 'enabled', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 dark:peer-focus:ring-orange-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-orange-600"></div>
            </label>
          </div>
        </div>

        {preferences.quietHours.enabled && (
          <div className="grid grid-cols-2 gap-4 pl-16">
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                Start Time
              </label>
              <input
                type="time"
                value={preferences.quietHours.start}
                onChange={(e) => updatePreference('quietHours', 'start', e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-[#0A0F1C] border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                End Time
              </label>
              <input
                type="time"
                value={preferences.quietHours.end}
                onChange={(e) => updatePreference('quietHours', 'end', e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-[#0A0F1C] border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none text-gray-900 dark:text-white"
              />
            </div>
          </div>
        )}
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg flex items-center gap-2 transition-colors disabled:opacity-50"
        >
          <Save size={20} />
          {saving ? 'Saving...' : 'Save All Preferences'}
        </button>
      </div>
    </div>
  );
};

