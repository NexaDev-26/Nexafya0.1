/**
 * Real-Time Notification Service
 * Handles Firebase Cloud Messaging (FCM) and in-app notifications
 */

import { db as firestore, auth } from '../lib/firebase';
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  orderBy,
  limit,
  Timestamp,
} from 'firebase/firestore';
// Firebase Messaging is imported conditionally - only works in browser
import { UserRole } from '../types';

export type NotificationType =
  | 'APPOINTMENT_REMINDER'
  | 'MEDICATION_REMINDER'
  | 'NEW_MESSAGE'
  | 'ORDER_UPDATE'
  | 'PAYMENT_SUCCESS'
  | 'PAYMENT_FAILED'
  | 'APPOINTMENT_CONFIRMED'
  | 'APPOINTMENT_CANCELLED'
  | 'PRESCRIPTION_READY'
  | 'SOS_ALERT'
  | 'SYSTEM_ANNOUNCEMENT'
  | 'ARTICLE_PUBLISHED'
  | 'REVIEW_RECEIVED';

export type NotificationPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

export interface AppNotification {
  id?: string;
  userId?: string;
  userRole?: UserRole;
  recipientRole?: UserRole;
  type: NotificationType;
  title: string;
  message: string;
  priority: NotificationPriority;
  read: boolean;
  data?: Record<string, any>;
  actionUrl?: string;
  createdAt?: any;
  readAt?: any;
}

class NotificationService {
  private notificationListeners: Map<string, () => void> = new Map();

  /**
   * Initialize Firebase Cloud Messaging
   * Note: Requires Firebase Cloud Messaging setup and VAPID key
   */
  async initializeMessaging(): Promise<string | null> {
    if (typeof window === 'undefined') return null;

    try {
      // Check if browser supports notifications
      if (!('Notification' in window)) {
        console.warn('This browser does not support notifications');
        return null;
      }

      // Request notification permission
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        console.warn('Notification permission denied');
        return null;
      }

      // Dynamic import for Firebase Messaging (only in browser)
      const { getMessaging, getToken, onMessage } = await import('firebase/messaging');
      const messaging = getMessaging();

      // Get FCM token (requires VAPID key in environment)
      const vapidKey = import.meta.env.VITE_FCM_VAPID_KEY;
      if (!vapidKey) {
        // Silently fail - FCM is optional
        return null;
      }

      const token = await getToken(messaging, { vapidKey });

      if (token) {
        // Save token to user's document
        const user = auth.currentUser;
        if (user) {
          await this.saveFCMToken(user.uid, token);
        }

        // Listen for foreground messages
        onMessage(messaging, (payload) => {
          this.handleForegroundMessage(payload);
        });
      }

      return token;
    } catch (error) {
      console.error('FCM initialization error:', error);
      return null;
    }
  }

  /**
   * Save FCM token to user document
   */
  private async saveFCMToken(userId: string, token: string): Promise<void> {
    try {
      const userRef = doc(firestore, 'users', userId);
      await updateDoc(userRef, {
        fcmToken: token,
        fcmTokenUpdatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Save FCM token error:', error);
    }
  }

  /**
   * Handle foreground messages (when app is open)
   */
  private handleForegroundMessage(payload: any): void {
    const { notification, data } = payload;
    
    // Show browser notification
    if (Notification.permission === 'granted') {
      new Notification(notification?.title || 'NexaFya', {
        body: notification?.body || '',
        icon: '/icon-192x192.png',
        badge: '/icon-192x192.png',
        data: data,
      });
    }
  }

  /**
   * Create a notification
   */
  async createNotification(notification: Omit<AppNotification, 'id' | 'read' | 'createdAt'>): Promise<string> {
    try {
      const notifRef = await addDoc(collection(firestore, 'notifications'), {
        ...notification,
        read: false,
        createdAt: serverTimestamp(),
      });

      // In production, this would trigger FCM push notification via Cloud Functions
      // For now, we'll just store it in Firestore

      return notifRef.id;
    } catch (error) {
      console.error('Create notification error:', error);
      throw error;
    }
  }

  /**
   * Get notifications for a user
   */
  async getNotifications(
    userId: string,
    userRole: UserRole,
    limitCount: number = 50
  ): Promise<AppNotification[]> {
    try {
      const q = query(
        collection(firestore, 'notifications'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as AppNotification[];
    } catch (error) {
      console.error('Get notifications error:', error);
      return [];
    }
  }

  /**
   * Get unread notifications count
   */
  async getUnreadCount(userId: string): Promise<number> {
    try {
      const q = query(
        collection(firestore, 'notifications'),
        where('userId', '==', userId),
        where('read', '==', false)
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.size;
    } catch (error) {
      console.error('Get unread count error:', error);
      return 0;
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string): Promise<void> {
    try {
      await updateDoc(doc(firestore, 'notifications', notificationId), {
        read: true,
        readAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Mark as read error:', error);
      throw error;
    }
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(userId: string): Promise<void> {
    try {
      const q = query(
        collection(firestore, 'notifications'),
        where('userId', '==', userId),
        where('read', '==', false)
      );

      const querySnapshot = await getDocs(q);
      const batch = querySnapshot.docs.map(doc =>
        updateDoc(doc.ref, {
          read: true,
          readAt: serverTimestamp(),
        })
      );

      await Promise.all(batch);
    } catch (error) {
      console.error('Mark all as read error:', error);
      throw error;
    }
  }

  /**
   * Subscribe to real-time notifications
   */
  subscribeToNotifications(
    userId: string,
    callback: (notifications: AppNotification[]) => void
  ): () => void {
    const q = query(
      collection(firestore, 'notifications'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifications = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as AppNotification[];
      callback(notifications);
    });

    this.notificationListeners.set(userId, unsubscribe);
    return unsubscribe;
  }

  /**
   * Send appointment reminder
   */
  async sendAppointmentReminder(
    userId: string,
    appointmentId: string,
    doctorName: string,
    date: string,
    time: string
  ): Promise<void> {
    await this.createNotification({
      userId,
      type: 'APPOINTMENT_REMINDER',
      title: 'Appointment Reminder',
      message: `You have an appointment with ${doctorName} on ${date} at ${time}`,
      priority: 'HIGH',
      data: { appointmentId, doctorName, date, time },
      actionUrl: `/consultations?appointment=${appointmentId}`,
    });
  }

  /**
   * Send medication reminder
   */
  async sendMedicationReminder(
    userId: string,
    medicationName: string,
    dosage: string,
    time: string
  ): Promise<void> {
    await this.createNotification({
      userId,
      type: 'MEDICATION_REMINDER',
      title: 'Time for Medication',
      message: `Take ${medicationName} (${dosage}) at ${time}`,
      priority: 'HIGH',
      data: { medicationName, dosage, time },
      actionUrl: '/health?tab=medications',
    });
  }

  /**
   * Send payment notification
   */
  async sendPaymentNotification(
    userId: string,
    type: 'PAYMENT_SUCCESS' | 'PAYMENT_FAILED',
    amount: number,
    currency: string,
    transactionId: string
  ): Promise<void> {
    await this.createNotification({
      userId,
      type,
      title: type === 'PAYMENT_SUCCESS' ? 'Payment Successful' : 'Payment Failed',
      message: type === 'PAYMENT_SUCCESS'
        ? `Your payment of ${currency} ${amount.toLocaleString()} was successful`
        : `Payment of ${currency} ${amount.toLocaleString()} failed. Please try again.`,
      priority: 'NORMAL',
      data: { amount, currency, transactionId },
      actionUrl: type === 'PAYMENT_SUCCESS' ? `/profile?tab=transactions` : `/profile?tab=payments`,
    });
  }

  /**
   * Send order update
   */
  async sendOrderUpdate(
    userId: string,
    orderId: string,
    status: string,
    orderNumber: string
  ): Promise<void> {
    await this.createNotification({
      userId,
      type: 'ORDER_UPDATE',
      title: 'Order Update',
      message: `Your order #${orderNumber} is now ${status}`,
      priority: 'NORMAL',
      data: { orderId, status, orderNumber },
      actionUrl: `/orders?order=${orderId}`,
    });
  }

  /**
   * Send notification to role
   */
  async sendRoleNotification(
    role: UserRole,
    type: NotificationType,
    title: string,
    message: string,
    priority: NotificationPriority = 'NORMAL',
    data?: Record<string, any>
  ): Promise<void> {
    // In production, this would query all users with the role and send to each
    // For now, we'll just create a notification with recipientRole
    await addDoc(collection(firestore, 'notifications'), {
      recipientRole: role,
      type,
      title,
      message,
      priority,
      data,
      read: false,
      createdAt: serverTimestamp(),
    });
  }

  /**
   * Delete notification
   */
  async deleteNotification(notificationId: string): Promise<void> {
    try {
      const notifRef = doc(firestore, 'notifications', notificationId);
      // In production, use deleteDoc - for now we'll just mark as deleted
      await updateDoc(notifRef, {
        deleted: true,
        deletedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Delete notification error:', error);
      throw error;
    }
  }
}

export const notificationService = new NotificationService();
export default notificationService;

