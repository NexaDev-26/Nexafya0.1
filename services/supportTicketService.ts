/**
 * Support Tickets Service
 * Handles customer support ticket management
 */

import { db as firestore } from '../lib/firebase';
import {
  collection,
  addDoc,
  updateDoc,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { UserRole } from '../types';

export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type TicketCategory = 'TECHNICAL' | 'BILLING' | 'GENERAL' | 'FEATURE_REQUEST' | 'BUG_REPORT';

export interface SupportTicket {
  id?: string;
  ticketNumber: string;
  userId: string;
  userName: string;
  userEmail: string;
  userRole: UserRole;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  subject: string;
  description: string;
  assignedTo?: string;
  assignedToName?: string;
  attachments?: Array<{ url: string; name: string }>;
  messages: TicketMessage[];
  tags?: string[];
  resolvedAt?: any;
  closedAt?: any;
  createdAt?: any;
  updatedAt?: any;
}

export interface TicketMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  message: string;
  attachments?: Array<{ url: string; name: string }>;
  isInternal: boolean; // Internal notes not visible to user
  createdAt: any;
}

class SupportTicketService {
  private ticketCounter = 0;

  /**
   * Generate unique ticket number
   */
  private generateTicketNumber(): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `TKT-${timestamp}-${random}`;
  }

  /**
   * Create a new support ticket
   */
  async createTicket(
    ticket: Omit<SupportTicket, 'id' | 'ticketNumber' | 'status' | 'messages' | 'createdAt' | 'updatedAt'>
  ): Promise<string> {
    try {
      const ticketNumber = this.generateTicketNumber();

      const ticketRef = await addDoc(collection(firestore, 'supportTickets'), {
        ...ticket,
        ticketNumber,
        status: 'OPEN' as TicketStatus,
        messages: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      return ticketRef.id;
    } catch (error) {
      console.error('Create ticket error:', error);
      throw error;
    }
  }

  /**
   * Get ticket by ID
   */
  async getTicket(ticketId: string): Promise<SupportTicket | null> {
    try {
      const ticketRef = doc(firestore, 'supportTickets', ticketId);
      const ticketSnap = await getDoc(ticketRef);

      if (ticketSnap.exists()) {
        return { id: ticketSnap.id, ...ticketSnap.data() } as SupportTicket;
      }
      return null;
    } catch (error) {
      console.error('Get ticket error:', error);
      return null;
    }
  }

  /**
   * Get ticket by ticket number
   */
  async getTicketByNumber(ticketNumber: string): Promise<SupportTicket | null> {
    try {
      const q = query(
        collection(firestore, 'supportTickets'),
        where('ticketNumber', '==', ticketNumber),
        limit(1)
      );

      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        return { id: doc.id, ...doc.data() } as SupportTicket;
      }
      return null;
    } catch (error) {
      console.error('Get ticket by number error:', error);
      return null;
    }
  }

  /**
   * Get user's tickets
   */
  async getUserTickets(userId: string, status?: TicketStatus): Promise<SupportTicket[]> {
    try {
      let q = query(
        collection(firestore, 'supportTickets'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(50)
      );

      if (status) {
        q = query(q, where('status', '==', status));
      }

      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as SupportTicket[];
    } catch (error) {
      console.error('Get user tickets error:', error);
      return [];
    }
  }

  /**
   * Get all tickets (for admins/support staff)
   */
  async getAllTickets(
    filters?: {
      status?: TicketStatus;
      priority?: TicketPriority;
      category?: TicketCategory;
      assignedTo?: string;
    },
    limitCount: number = 100
  ): Promise<SupportTicket[]> {
    try {
      let q = query(
        collection(firestore, 'supportTickets'),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );

      if (filters) {
        if (filters.status) {
          q = query(q, where('status', '==', filters.status));
        }
        if (filters.priority) {
          q = query(q, where('priority', '==', filters.priority));
        }
        if (filters.category) {
          q = query(q, where('category', '==', filters.category));
        }
        if (filters.assignedTo) {
          q = query(q, where('assignedTo', '==', filters.assignedTo));
        }
      }

      const snapshot = await getDocs(q);
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as SupportTicket[];
    } catch (error) {
      console.error('Get all tickets error:', error);
      return [];
    }
  }

  /**
   * Add message to ticket
   */
  async addMessage(
    ticketId: string,
    message: Omit<TicketMessage, 'id' | 'createdAt'>
  ): Promise<void> {
    try {
      const ticketRef = doc(firestore, 'supportTickets', ticketId);
      const ticketSnap = await getDoc(ticketRef);

      if (!ticketSnap.exists()) {
        throw new Error('Ticket not found');
      }

      const ticket = ticketSnap.data() as SupportTicket;
      const messages = ticket.messages || [];

      const newMessage: TicketMessage = {
        ...message,
        id: `msg-${Date.now()}-${Math.random()}`,
        createdAt: serverTimestamp(),
      };

      messages.push(newMessage);

      await updateDoc(ticketRef, {
        messages,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Add message error:', error);
      throw error;
    }
  }

  /**
   * Update ticket status
   */
  async updateTicketStatus(
    ticketId: string,
    status: TicketStatus,
    updatedBy?: string
  ): Promise<void> {
    try {
      const ticketRef = doc(firestore, 'supportTickets', ticketId);
      const updates: any = {
        status,
        updatedAt: serverTimestamp(),
      };

      if (status === 'RESOLVED') {
        updates.resolvedAt = serverTimestamp();
      } else if (status === 'CLOSED') {
        updates.closedAt = serverTimestamp();
      }

      await updateDoc(ticketRef, updates);
    } catch (error) {
      console.error('Update ticket status error:', error);
      throw error;
    }
  }

  /**
   * Assign ticket to support staff
   */
  async assignTicket(
    ticketId: string,
    assignedTo: string,
    assignedToName: string
  ): Promise<void> {
    try {
      const ticketRef = doc(firestore, 'supportTickets', ticketId);
      await updateDoc(ticketRef, {
        assignedTo,
        assignedToName,
        status: 'IN_PROGRESS',
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Assign ticket error:', error);
      throw error;
    }
  }

  /**
   * Update ticket priority
   */
  async updatePriority(ticketId: string, priority: TicketPriority): Promise<void> {
    try {
      const ticketRef = doc(firestore, 'supportTickets', ticketId);
      await updateDoc(ticketRef, {
        priority,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Update priority error:', error);
      throw error;
    }
  }

  /**
   * Add tags to ticket
   */
  async addTags(ticketId: string, tags: string[]): Promise<void> {
    try {
      const ticketRef = doc(firestore, 'supportTickets', ticketId);
      const ticketSnap = await getDoc(ticketRef);

      if (!ticketSnap.exists()) {
        throw new Error('Ticket not found');
      }

      const ticket = ticketSnap.data() as SupportTicket;
      const existingTags = ticket.tags || [];
      const newTags = [...new Set([...existingTags, ...tags])];

      await updateDoc(ticketRef, {
        tags: newTags,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Add tags error:', error);
      throw error;
    }
  }

  /**
   * Get ticket statistics
   */
  async getTicketStats(): Promise<{
    total: number;
    open: number;
    inProgress: number;
    resolved: number;
    closed: number;
    byPriority: Record<TicketPriority, number>;
    byCategory: Record<TicketCategory, number>;
  }> {
    try {
      const allTickets = await this.getAllTickets(undefined, 1000);

      const stats = {
        total: allTickets.length,
        open: 0,
        inProgress: 0,
        resolved: 0,
        closed: 0,
        byPriority: {
          LOW: 0,
          MEDIUM: 0,
          HIGH: 0,
          URGENT: 0,
        } as Record<TicketPriority, number>,
        byCategory: {
          TECHNICAL: 0,
          BILLING: 0,
          GENERAL: 0,
          FEATURE_REQUEST: 0,
          BUG_REPORT: 0,
        } as Record<TicketCategory, number>,
      };

      allTickets.forEach((ticket) => {
        stats[ticket.status.toLowerCase().replace('_', '') as keyof typeof stats]++;
        stats.byPriority[ticket.priority]++;
        stats.byCategory[ticket.category]++;
      });

      return stats;
    } catch (error) {
      console.error('Get ticket stats error:', error);
      return {
        total: 0,
        open: 0,
        inProgress: 0,
        resolved: 0,
        closed: 0,
        byPriority: {
          LOW: 0,
          MEDIUM: 0,
          HIGH: 0,
          URGENT: 0,
        },
        byCategory: {
          TECHNICAL: 0,
          BILLING: 0,
          GENERAL: 0,
          FEATURE_REQUEST: 0,
          BUG_REPORT: 0,
        },
      };
    }
  }
}

export const supportTicketService = new SupportTicketService();
export default supportTicketService;

