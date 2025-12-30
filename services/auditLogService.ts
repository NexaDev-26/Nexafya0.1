/**
 * Audit Log Service
 * Tracks all system activities for security and compliance
 */

import { db as firestore } from '../lib/firebase';
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { UserRole } from '../types';

export type AuditAction =
  | 'LOGIN'
  | 'LOGOUT'
  | 'LOGIN_FAILED'
  | 'USER_CREATED'
  | 'USER_UPDATED'
  | 'USER_DELETED'
  | 'PASSWORD_CHANGED'
  | 'PASSWORD_RESET'
  | 'PAYMENT_PROCESSED'
  | 'PAYMENT_VERIFIED'
  | 'TRANSACTION_CREATED'
  | 'TRANSACTION_UPDATED'
  | 'APPOINTMENT_CREATED'
  | 'APPOINTMENT_UPDATED'
  | 'APPOINTMENT_CANCELLED'
  | 'PRESCRIPTION_CREATED'
  | 'PRESCRIPTION_UPDATED'
  | 'ARTICLE_CREATED'
  | 'ARTICLE_UPDATED'
  | 'ARTICLE_VERIFIED'
  | 'SETTINGS_UPDATED'
  | 'ADMIN_ACTION'
  | 'DATA_EXPORTED'
  | 'DATA_DELETED'
  | 'PERMISSION_CHANGED'
  | 'SECURITY_ALERT';

export type AuditSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface AuditLog {
  id?: string;
  userId?: string;
  userName?: string;
  userRole?: UserRole;
  action: AuditAction;
  severity: AuditSeverity;
  resourceType?: string; // e.g., 'user', 'transaction', 'appointment'
  resourceId?: string;
  description: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  location?: string;
  success: boolean;
  errorMessage?: string;
  createdAt?: any;
}

class AuditLogService {
  /**
   * Create audit log entry
   */
  async log(
    log: Omit<AuditLog, 'id' | 'createdAt'>
  ): Promise<string> {
    try {
      // Get user agent and IP if available
      const userAgent = typeof window !== 'undefined' ? window.navigator.userAgent : undefined;
      
      // Try to get IP address (requires backend or service)
      // For now, we'll leave it undefined
      const ipAddress = undefined;

      const logRef = await addDoc(collection(firestore, 'auditLogs'), {
        ...log,
        userAgent,
        ipAddress,
        createdAt: serverTimestamp(),
      });

      return logRef.id;
    } catch (error) {
      console.error('Create audit log error:', error);
      // Don't throw - audit logging should not break the app
      return '';
    }
  }

  /**
   * Log user action
   */
  async logUserAction(
    userId: string,
    userName: string,
    userRole: UserRole,
    action: AuditAction,
    description: string,
    resourceType?: string,
    resourceId?: string,
    metadata?: Record<string, any>,
    severity: AuditSeverity = 'MEDIUM'
  ): Promise<void> {
    await this.log({
      userId,
      userName,
      userRole,
      action,
      severity,
      resourceType,
      resourceId,
      description,
      metadata,
      success: true,
    });
  }

  /**
   * Log failed action
   */
  async logFailedAction(
    userId: string | undefined,
    userName: string | undefined,
    userRole: UserRole | undefined,
    action: AuditAction,
    description: string,
    errorMessage: string,
    severity: AuditSeverity = 'HIGH',
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.log({
      userId,
      userName,
      userRole,
      action,
      severity,
      description,
      metadata,
      errorMessage,
      success: false,
    });
  }

  /**
   * Log login
   */
  async logLogin(userId: string, userName: string, userRole: UserRole, success: boolean, errorMessage?: string): Promise<void> {
    await this.log({
      userId,
      userName,
      userRole,
      action: success ? 'LOGIN' : 'LOGIN_FAILED',
      severity: success ? 'LOW' : 'MEDIUM',
      description: success ? `User logged in successfully` : `Failed login attempt`,
      errorMessage,
      success,
    });
  }

  /**
   * Log logout
   */
  async logLogout(userId: string, userName: string, userRole: UserRole): Promise<void> {
    await this.log({
      userId,
      userName,
      userRole,
      action: 'LOGOUT',
      severity: 'LOW',
      description: 'User logged out',
      success: true,
    });
  }

  /**
   * Log security alert
   */
  async logSecurityAlert(
    description: string,
    severity: AuditSeverity,
    userId?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.log({
      userId,
      action: 'SECURITY_ALERT',
      severity,
      description,
      metadata,
      success: false,
    });
  }

  /**
   * Get audit logs
   */
  async getAuditLogs(
    filters?: {
      userId?: string;
      action?: AuditAction;
      severity?: AuditSeverity;
      resourceType?: string;
      resourceId?: string;
      startDate?: Date;
      endDate?: Date;
    },
    limitCount: number = 100
  ): Promise<AuditLog[]> {
    try {
      let q = query(
        collection(firestore, 'auditLogs'),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );

      if (filters) {
        if (filters.userId) {
          q = query(q, where('userId', '==', filters.userId));
        }
        if (filters.action) {
          q = query(q, where('action', '==', filters.action));
        }
        if (filters.severity) {
          q = query(q, where('severity', '==', filters.severity));
        }
        if (filters.resourceType) {
          q = query(q, where('resourceType', '==', filters.resourceType));
        }
        if (filters.resourceId) {
          q = query(q, where('resourceId', '==', filters.resourceId));
        }
        if (filters.startDate) {
          q = query(q, where('createdAt', '>=', Timestamp.fromDate(filters.startDate)));
        }
        if (filters.endDate) {
          q = query(q, where('createdAt', '<=', Timestamp.fromDate(filters.endDate)));
        }
      }

      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as AuditLog[];
    } catch (error) {
      console.error('Get audit logs error:', error);
      return [];
    }
  }

  /**
   * Get failed login attempts
   */
  async getFailedLoginAttempts(
    userId?: string,
    hours: number = 24
  ): Promise<AuditLog[]> {
    try {
      const startDate = new Date(Date.now() - hours * 60 * 60 * 1000);
      
      const filters: any = {
        action: 'LOGIN_FAILED',
        startDate,
      };

      if (userId) {
        filters.userId = userId;
      }

      return await this.getAuditLogs(filters, 100);
    } catch (error) {
      console.error('Get failed login attempts error:', error);
      return [];
    }
  }

  /**
   * Get security alerts
   */
  async getSecurityAlerts(severity?: AuditSeverity): Promise<AuditLog[]> {
    try {
      const filters: any = {
        action: 'SECURITY_ALERT',
      };

      if (severity) {
        filters.severity = severity;
      }

      return await this.getAuditLogs(filters, 100);
    } catch (error) {
      console.error('Get security alerts error:', error);
      return [];
    }
  }
}

export const auditLogService = new AuditLogService();
export default auditLogService;
