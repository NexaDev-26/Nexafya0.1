/**
 * Audit Log Service
 * Tracks all sensitive actions for security and compliance
 */

import { db as firestore } from '../lib/firebase';
import { collection, addDoc, query, where, getDocs, orderBy, limit, serverTimestamp } from 'firebase/firestore';
import { UserRole } from '../types';

export type AuditAction =
  | 'USER_LOGIN'
  | 'USER_LOGOUT'
  | 'USER_CREATE'
  | 'USER_UPDATE'
  | 'USER_DELETE'
  | 'APPOINTMENT_CREATE'
  | 'APPOINTMENT_UPDATE'
  | 'APPOINTMENT_CANCEL'
  | 'PRESCRIPTION_CREATE'
  | 'PRESCRIPTION_UPDATE'
  | 'PAYMENT_CREATE'
  | 'PAYMENT_VERIFY'
  | 'PAYMENT_APPROVE'
  | 'PAYMENT_REJECT'
  | 'MEDICAL_RECORD_ACCESS'
  | 'MEDICAL_RECORD_UPDATE'
  | 'INVENTORY_UPDATE'
  | 'ORDER_CREATE'
  | 'ORDER_UPDATE'
  | 'ORDER_CANCEL'
  | 'ADMIN_SETTINGS_UPDATE'
  | 'ROLE_CHANGE'
  | 'VERIFICATION_APPROVE'
  | 'VERIFICATION_REJECT'
  | 'NHIF_VERIFY'
  | 'SOS_ACTIVATE'
  | 'DATA_EXPORT'
  | 'DATA_DELETE';

export interface AuditLog {
  id?: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: AuditAction;
  resourceType: string; // e.g., 'appointment', 'prescription', 'user'
  resourceId?: string;
  description: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
  timestamp?: any;
  createdAt?: any;
}

class AuditLogService {
  /**
   * Log an audit event
   */
  async logEvent(log: Omit<AuditLog, 'id' | 'timestamp' | 'createdAt'>): Promise<string> {
    try {
      const auditRef = await addDoc(collection(firestore, 'auditLogs'), {
        ...log,
        timestamp: serverTimestamp(),
        createdAt: serverTimestamp(),
      });

      return auditRef.id;
    } catch (error) {
      console.error('Audit log error:', error);
      throw error;
    }
  }

  /**
   * Get audit logs with filters
   */
  async getAuditLogs(filters: {
    userId?: string;
    userRole?: UserRole;
    action?: AuditAction;
    resourceType?: string;
    resourceId?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<AuditLog[]> {
    try {
      let q = query(collection(firestore, 'auditLogs'), orderBy('timestamp', 'desc'));

      if (filters.userId) {
        q = query(q, where('userId', '==', filters.userId));
      }

      if (filters.userRole) {
        q = query(q, where('userRole', '==', filters.userRole));
      }

      if (filters.action) {
        q = query(q, where('action', '==', filters.action));
      }

      if (filters.resourceType) {
        q = query(q, where('resourceType', '==', filters.resourceType));
      }

      if (filters.resourceId) {
        q = query(q, where('resourceId', '==', filters.resourceId));
      }

      if (filters.limit) {
        q = query(q, limit(filters.limit));
      }

      const querySnapshot = await getDocs(q);
      let logs = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as AuditLog[];

      // Filter by date range if provided
      if (filters.startDate || filters.endDate) {
        logs = logs.filter(log => {
          if (!log.timestamp) return false;
          const logDate = log.timestamp.toDate ? log.timestamp.toDate() : new Date(log.timestamp);
          
          if (filters.startDate && logDate < filters.startDate) return false;
          if (filters.endDate && logDate > filters.endDate) return false;
          
          return true;
        });
      }

      return logs;
    } catch (error) {
      console.error('Get audit logs error:', error);
      return [];
    }
  }

  /**
   * Get audit logs for a specific resource
   */
  async getResourceAuditLogs(resourceType: string, resourceId: string): Promise<AuditLog[]> {
    return this.getAuditLogs({ resourceType, resourceId });
  }

  /**
   * Get user activity log
   */
  async getUserActivityLog(userId: string, limitCount: number = 50): Promise<AuditLog[]> {
    return this.getAuditLogs({ userId, limit: limitCount });
  }

  /**
   * Helper: Log user login
   */
  async logLogin(userId: string, userName: string, userRole: UserRole, ipAddress?: string, userAgent?: string): Promise<void> {
    await this.logEvent({
      userId,
      userName,
      userRole,
      action: 'USER_LOGIN',
      resourceType: 'user',
      resourceId: userId,
      description: `${userName} logged in`,
      ipAddress,
      userAgent,
    });
  }

  /**
   * Helper: Log payment
   */
  async logPayment(
    userId: string,
    userName: string,
    userRole: UserRole,
    transactionId: string,
    amount: number,
    currency: string,
    provider: string
  ): Promise<void> {
    await this.logEvent({
      userId,
      userName,
      userRole,
      action: 'PAYMENT_CREATE',
      resourceType: 'transaction',
      resourceId: transactionId,
      description: `Payment of ${currency} ${amount} via ${provider}`,
      metadata: { amount, currency, provider },
    });
  }

  /**
   * Helper: Log medical record access
   */
  async logMedicalRecordAccess(
    userId: string,
    userName: string,
    userRole: UserRole,
    recordId: string,
    patientId: string
  ): Promise<void> {
    await this.logEvent({
      userId,
      userName,
      userRole,
      action: 'MEDICAL_RECORD_ACCESS',
      resourceType: 'healthRecord',
      resourceId: recordId,
      description: `${userName} accessed medical record for patient ${patientId}`,
      metadata: { patientId },
    });
  }

  /**
   * Helper: Log admin action
   */
  async logAdminAction(
    userId: string,
    userName: string,
    action: AuditAction,
    description: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.logEvent({
      userId,
      userName,
      userRole: UserRole.ADMIN,
      action,
      resourceType: 'system',
      description,
      metadata,
    });
  }
}

export const auditLogService = new AuditLogService();
export default auditLogService;

