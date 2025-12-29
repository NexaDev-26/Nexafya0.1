/**
 * Wearable Integration Component
 * Allows users to connect and manage health wearable devices
 */

import React, { useState, useEffect } from 'react';
import { Watch, Plus, Trash2, RefreshCw, Check, X, Activity, Heart, Droplet } from 'lucide-react';
import { useNotification } from './NotificationSystem';
import { useAuth } from '../contexts/AuthContext';
import { wearableService, WearableDevice, WearableDeviceType } from '../services/wearableService';
import { usePreferences } from '../contexts/PreferencesContext';

export const WearableIntegration: React.FC = () => {
  const { user } = useAuth();
  const { notify } = useNotification();
  const { t } = usePreferences();
  const [devices, setDevices] = useState<WearableDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDevice, setShowAddDevice] = useState(false);
  const [newDevice, setNewDevice] = useState({
    deviceType: 'GENERIC' as WearableDeviceType,
    deviceName: '',
    deviceId: '',
    syncEnabled: true,
    metrics: {
      heartRate: true,
      steps: true,
      sleep: false,
      bloodPressure: false,
      oxygenSaturation: false,
      weight: false,
      glucose: false,
    },
  });

  useEffect(() => {
    if (user?.id) {
      loadDevices();
    }
  }, [user?.id]);

  const loadDevices = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const deviceList = await wearableService.getDevices(user.id);
      setDevices(deviceList);
    } catch (error) {
      console.error('Load devices error:', error);
      notify('Failed to load devices', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    if (!user?.id || !newDevice.deviceName || !newDevice.deviceId) {
      notify('Please fill in all required fields', 'error');
      return;
    }

    try {
      await wearableService.connectDevice({
        userId: user.id,
        ...newDevice,
      });
      
      notify('Device connected successfully', 'success');
      setShowAddDevice(false);
      setNewDevice({
        deviceType: 'GENERIC',
        deviceName: '',
        deviceId: '',
        syncEnabled: true,
        metrics: {
          heartRate: true,
          steps: true,
          sleep: false,
          bloodPressure: false,
          oxygenSaturation: false,
          weight: false,
          glucose: false,
        },
      });
      loadDevices();
    } catch (error: any) {
      notify(error.message || 'Failed to connect device', 'error');
    }
  };

  const handleDisconnect = async (deviceId: string) => {
    if (!user?.id) return;

    if (!confirm('Are you sure you want to disconnect this device?')) return;

    try {
      await wearableService.disconnectDevice(deviceId, user.id);
      notify('Device disconnected', 'success');
      loadDevices();
    } catch (error: any) {
      notify(error.message || 'Failed to disconnect device', 'error');
    }
  };

  const handleToggleSync = async (device: WearableDevice) => {
    if (!user?.id || !device.deviceId) return;

    try {
      await wearableService.updateSyncSettings(device.deviceId, user.id, {
        syncEnabled: !device.syncEnabled,
      });
      notify(`Sync ${!device.syncEnabled ? 'enabled' : 'disabled'}`, 'success');
      loadDevices();
    } catch (error: any) {
      notify(error.message || 'Failed to update sync settings', 'error');
    }
  };

  const deviceTypes: { value: WearableDeviceType; label: string; icon: any }[] = [
    { value: 'APPLE_WATCH', label: 'Apple Watch', icon: Watch },
    { value: 'FITBIT', label: 'Fitbit', icon: Activity },
    { value: 'SAMSUNG_GALAXY_WATCH', label: 'Samsung Galaxy Watch', icon: Watch },
    { value: 'GARMIN', label: 'Garmin', icon: Activity },
    { value: 'XIAOMI_MI_BAND', label: 'Xiaomi Mi Band', icon: Watch },
    { value: 'GENERIC', label: 'Generic Device', icon: Watch },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <Watch className="animate-pulse mx-auto mb-4 text-nexafya-blue" size={32} />
          <p className="text-gray-500">{t('loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-800">Wearable Devices</h2>
          <p className="text-gray-500 text-sm mt-1">Connect your health wearables to sync data automatically</p>
        </div>
        <button
          onClick={() => setShowAddDevice(true)}
          className="px-4 py-2 bg-nexafya-blue text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <Plus size={20} />
          Add Device
        </button>
      </div>

      {/* Add Device Form */}
      {showAddDevice && (
        <div className="bg-white dark:bg-white rounded-2xl p-6 border border-gray-200 dark:border-gray-600">
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-800 mb-4">Connect New Device</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-600 mb-2">
                Device Type
              </label>
              <select
                value={newDevice.deviceType}
                onChange={(e) => setNewDevice({ ...newDevice, deviceType: e.target.value as WearableDeviceType })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-800"
              >
                {deviceTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-600 mb-2">
                Device Name
              </label>
              <input
                type="text"
                value={newDevice.deviceName}
                onChange={(e) => setNewDevice({ ...newDevice, deviceName: e.target.value })}
                placeholder="e.g., My Apple Watch"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-800"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-600 mb-2">
                Device ID / Serial Number
              </label>
              <input
                type="text"
                value={newDevice.deviceId}
                onChange={(e) => setNewDevice({ ...newDevice, deviceId: e.target.value })}
                placeholder="Enter device ID or serial number"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-800"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-600 mb-2">
                Metrics to Sync
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Object.entries(newDevice.metrics).map(([key, value]) => (
                  <label key={key} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={value}
                      onChange={(e) =>
                        setNewDevice({
                          ...newDevice,
                          metrics: { ...newDevice.metrics, [key]: e.target.checked },
                        })
                      }
                      className="rounded border-gray-300 text-nexafya-blue focus:ring-nexafya-blue"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-600 capitalize">
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleConnect}
                className="flex-1 px-4 py-2 bg-nexafya-blue text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Connect Device
              </button>
              <button
                onClick={() => setShowAddDevice(false)}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-600 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Connected Devices */}
      {devices.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 dark:bg-[#0A1B2E] rounded-2xl">
          <Watch className="mx-auto mb-4 text-gray-400" size={48} />
          <p className="text-gray-500 mb-2">No devices connected</p>
          <p className="text-sm text-gray-400 mb-4">Connect a wearable device to sync your health data</p>
          <button
            onClick={() => setShowAddDevice(true)}
            className="px-6 py-2 bg-nexafya-blue text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Connect Device
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {devices.map((device) => (
            <div
              key={device.id}
              className="bg-white dark:bg-white rounded-2xl p-6 border border-gray-200 dark:border-gray-600"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-nexafya-blue/10 rounded-full flex items-center justify-center">
                    <Watch className="text-nexafya-blue" size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-gray-800">{device.deviceName}</h3>
                    <p className="text-sm text-gray-500">{device.deviceType.replace(/_/g, ' ')}</p>
                    {device.lastSyncAt && (
                      <p className="text-xs text-gray-400 mt-1">
                        Last synced: {new Date(device.lastSyncAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleSync(device)}
                    className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                      device.syncEnabled
                        ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                        : 'bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-600'
                    }`}
                  >
                    <RefreshCw size={16} className={device.syncEnabled ? 'animate-spin' : ''} />
                    {device.syncEnabled ? 'Syncing' : 'Paused'}
                  </button>
                  <button
                    onClick={() => device.deviceId && handleDisconnect(device.deviceId)}
                    className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>

              {/* Metrics */}
              {device.metrics && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                  <p className="text-xs font-medium text-gray-500 mb-2">Syncing Metrics:</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(device.metrics).map(([key, enabled]) =>
                      enabled ? (
                        <span
                          key={key}
                          className="px-2 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded text-xs"
                        >
                          {key.replace(/([A-Z])/g, ' $1').trim()}
                        </span>
                      ) : null
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

