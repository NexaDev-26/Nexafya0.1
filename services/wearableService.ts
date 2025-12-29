/**
 * Telehealth Wearable Integration Service
 * Handles integration with health wearables and devices
 */

import { db as firestore } from '../lib/firebase';
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
  serverTimestamp,
  orderBy,
  limit,
} from 'firebase/firestore';
import { HealthMetric } from '../types';

export type WearableDeviceType = 'APPLE_WATCH' | 'FITBIT' | 'SAMSUNG_GALAXY_WATCH' | 'GARMIN' | 'XIAOMI_MI_BAND' | 'GENERIC';

export interface WearableDevice {
  id?: string;
  userId: string;
  deviceType: WearableDeviceType;
  deviceName: string;
  deviceId: string;
  connectedAt: string;
  lastSyncAt?: string;
  isActive: boolean;
  syncEnabled: boolean;
  metrics: {
    heartRate?: boolean;
    bloodPressure?: boolean;
    steps?: boolean;
    sleep?: boolean;
    oxygenSaturation?: boolean;
    weight?: boolean;
    glucose?: boolean;
  };
  metadata?: Record<string, any>;
  createdAt?: any;
  updatedAt?: any;
}

export interface WearableSyncData {
  deviceId: string;
  userId: string;
  metrics: HealthMetric[];
  syncTimestamp: string;
}

class WearableService {
  /**
   * Connect a wearable device
   */
  async connectDevice(device: Omit<WearableDevice, 'id' | 'connectedAt' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const deviceRef = await addDoc(collection(firestore, 'wearableDevices'), {
        ...device,
        connectedAt: new Date().toISOString(),
        isActive: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      return deviceRef.id;
    } catch (error) {
      console.error('Connect device error:', error);
      throw error;
    }
  }

  /**
   * Get user's connected devices
   */
  async getDevices(userId: string): Promise<WearableDevice[]> {
    try {
      const q = query(
        collection(firestore, 'wearableDevices'),
        where('userId', '==', userId),
        where('isActive', '==', true),
        orderBy('connectedAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as WearableDevice[];
    } catch (error) {
      console.error('Get devices error:', error);
      return [];
    }
  }

  /**
   * Sync data from wearable device
   */
  async syncDeviceData(syncData: WearableSyncData): Promise<void> {
    try {
      // Update device last sync time
      const devicesQuery = query(
        collection(firestore, 'wearableDevices'),
        where('deviceId', '==', syncData.deviceId),
        where('userId', '==', syncData.userId)
      );

      const devicesSnapshot = await getDocs(devicesQuery);
      if (!devicesSnapshot.empty) {
        const deviceDoc = devicesSnapshot.docs[0];
        await updateDoc(deviceDoc.ref, {
          lastSyncAt: new Date().toISOString(),
          updatedAt: serverTimestamp(),
        });
      }

      // Save health metrics
      for (const metric of syncData.metrics) {
        await addDoc(collection(firestore, 'healthMetrics'), {
          ...metric,
          patient_id: syncData.userId,
          source: 'WEARABLE',
          recorded_at: serverTimestamp(),
          created_at: serverTimestamp(),
        });
      }
    } catch (error) {
      console.error('Sync device data error:', error);
      throw error;
    }
  }

  /**
   * Disconnect device
   */
  async disconnectDevice(deviceId: string, userId: string): Promise<void> {
    try {
      const devicesQuery = query(
        collection(firestore, 'wearableDevices'),
        where('deviceId', '==', deviceId),
        where('userId', '==', userId)
      );

      const devicesSnapshot = await getDocs(devicesQuery);
      if (!devicesSnapshot.empty) {
        const deviceDoc = devicesSnapshot.docs[0];
        await updateDoc(deviceDoc.ref, {
          isActive: false,
          updatedAt: serverTimestamp(),
        });
      }
    } catch (error) {
      console.error('Disconnect device error:', error);
      throw error;
    }
  }

  /**
   * Update device sync settings
   */
  async updateSyncSettings(
    deviceId: string,
    userId: string,
    settings: {
      syncEnabled?: boolean;
      metrics?: Partial<WearableDevice['metrics']>;
    }
  ): Promise<void> {
    try {
      const devicesQuery = query(
        collection(firestore, 'wearableDevices'),
        where('deviceId', '==', deviceId),
        where('userId', '==', userId)
      );

      const devicesSnapshot = await getDocs(devicesQuery);
      if (!devicesSnapshot.empty) {
        const deviceDoc = devicesSnapshot.docs[0];
        const updateData: any = {
          updatedAt: serverTimestamp(),
        };

        if (settings.syncEnabled !== undefined) {
          updateData.syncEnabled = settings.syncEnabled;
        }

        if (settings.metrics) {
          const currentDevice = devicesSnapshot.docs[0].data() as WearableDevice;
          updateData.metrics = {
            ...currentDevice.metrics,
            ...settings.metrics,
          };
        }

        await updateDoc(deviceDoc.ref, updateData);
      }
    } catch (error) {
      console.error('Update sync settings error:', error);
      throw error;
    }
  }

  /**
   * Get device sync status
   */
  async getDeviceStatus(deviceId: string, userId: string): Promise<WearableDevice | null> {
    try {
      const devicesQuery = query(
        collection(firestore, 'wearableDevices'),
        where('deviceId', '==', deviceId),
        where('userId', '==', userId)
      );

      const devicesSnapshot = await getDocs(devicesQuery);
      if (devicesSnapshot.empty) {
        return null;
      }

      return {
        id: devicesSnapshot.docs[0].id,
        ...devicesSnapshot.docs[0].data(),
      } as WearableDevice;
    } catch (error) {
      console.error('Get device status error:', error);
      return null;
    }
  }
}

export const wearableService = new WearableService();
export default wearableService;

