/**
 * Analytics Service - Real-time analytics from Firestore
 */

import { db as firestore } from '../lib/firebase';
import {
  collection,
  query,
  where,
  getDocs,
  getCountFromServer,
  Timestamp,
  orderBy,
  limit,
  startAfter,
} from 'firebase/firestore';
import { UserRole } from '../types';

interface AnalyticsStats {
  totalUsers: number;
  activeUsers: number;
  totalDoctors: number;
  totalPharmacies: number;
  totalPatients: number;
  totalCouriers: number;
  totalCHWs: number;
  totalRevenue: number;
  monthlyRevenue: number;
  totalTransactions: number;
  pendingTransactions: number;
  completedTransactions: number;
  totalAppointments: number;
  upcomingAppointments: number;
  completedAppointments: number;
  totalArticles: number;
  verifiedArticles: number;
  pendingArticles: number;
  userGrowth: {
    today: number;
    thisWeek: number;
    thisMonth: number;
  };
  revenueBreakdown: {
    consultations: number;
    pharmacy: number;
    subscriptions: number;
    articles: number;
  };
  geographicDistribution: Record<string, number>;
}

class AnalyticsService {
  /**
   * Get comprehensive admin statistics
   */
  async getAdminStats(): Promise<AnalyticsStats> {
    try {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Get user counts by role
      const [usersSnapshot, doctorsSnapshot, pharmaciesSnapshot, patientsSnapshot, couriersSnapshot, chwsSnapshot] = await Promise.all([
        getCountFromServer(collection(firestore, 'users')),
        getCountFromServer(query(collection(firestore, 'users'), where('role', '==', UserRole.DOCTOR))),
        getCountFromServer(query(collection(firestore, 'users'), where('role', '==', UserRole.PHARMACY))),
        getCountFromServer(query(collection(firestore, 'users'), where('role', '==', UserRole.PATIENT))),
        getCountFromServer(query(collection(firestore, 'users'), where('role', '==', UserRole.COURIER))),
        getCountFromServer(query(collection(firestore, 'users'), where('role', '==', UserRole.CHW))),
      ]);

      // Get active users (logged in within last 30 days)
      const activeUsersQuery = query(
        collection(firestore, 'users'),
        where('lastLoginAt', '>=', Timestamp.fromDate(monthAgo))
      );
      const activeUsersSnapshot = await getCountFromServer(activeUsersQuery);

      // Get transactions
      const [allTransactions, pendingTransactions, completedTransactions] = await Promise.all([
        getCountFromServer(collection(firestore, 'transactions')),
        getCountFromServer(query(collection(firestore, 'transactions'), where('status', '==', 'PENDING'))),
        getCountFromServer(query(collection(firestore, 'transactions'), where('status', '==', 'COMPLETED'))),
      ]);

      // Get revenue
      const transactionsSnapshot = await getDocs(
        query(collection(firestore, 'transactions'), where('status', '==', 'COMPLETED'))
      );

      let totalRevenue = 0;
      let monthlyRevenue = 0;
      const revenueBreakdown = {
        consultations: 0,
        pharmacy: 0,
        subscriptions: 0,
        articles: 0,
      };

      transactionsSnapshot.forEach((doc) => {
        const data = doc.data();
        const amount = data.amount || 0;
        totalRevenue += amount;

        const completedAt = data.completedAt?.toDate();
        if (completedAt && completedAt >= monthAgo) {
          monthlyRevenue += amount;
        }

        // Breakdown by item type
        const itemType = data.itemType || '';
        if (itemType === 'consultation' || itemType === 'appointment') {
          revenueBreakdown.consultations += amount;
        } else if (itemType === 'medicine') {
          revenueBreakdown.pharmacy += amount;
        } else if (itemType === 'subscription') {
          revenueBreakdown.subscriptions += amount;
        } else if (itemType === 'article') {
          revenueBreakdown.articles += amount;
        }
      });

      // Get appointments
      const [allAppointments, upcomingAppointments, completedAppointments] = await Promise.all([
        getCountFromServer(collection(firestore, 'appointments')),
        getCountFromServer(query(collection(firestore, 'appointments'), where('status', '==', 'CONFIRMED'))),
        getCountFromServer(query(collection(firestore, 'appointments'), where('status', '==', 'COMPLETED'))),
      ]);

      // Get articles
      const [allArticles, verifiedArticles, pendingArticles] = await Promise.all([
        getCountFromServer(collection(firestore, 'articles')),
        getCountFromServer(query(collection(firestore, 'articles'), where('status', '==', 'verified'))),
        getCountFromServer(query(collection(firestore, 'articles'), where('status', '==', 'pending'))),
      ]);

      // Get user growth
      const [todayUsers, weekUsers, monthUsers] = await Promise.all([
        getCountFromServer(query(collection(firestore, 'users'), where('createdAt', '>=', Timestamp.fromDate(today)))),
        getCountFromServer(query(collection(firestore, 'users'), where('createdAt', '>=', Timestamp.fromDate(weekAgo)))),
        getCountFromServer(query(collection(firestore, 'users'), where('createdAt', '>=', Timestamp.fromDate(monthAgo)))),
      ]);

      // Get geographic distribution
      const usersSnapshot2 = await getDocs(collection(firestore, 'users'));
      const geographicDistribution: Record<string, number> = {};
      usersSnapshot2.forEach((doc) => {
        const data = doc.data();
        const location = data.location || data.city || 'Unknown';
        geographicDistribution[location] = (geographicDistribution[location] || 0) + 1;
      });

      return {
        totalUsers: usersSnapshot.data().count,
        activeUsers: activeUsersSnapshot.data().count,
        totalDoctors: doctorsSnapshot.data().count,
        totalPharmacies: pharmaciesSnapshot.data().count,
        totalPatients: patientsSnapshot.data().count,
        totalCouriers: couriersSnapshot.data().count,
        totalCHWs: chwsSnapshot.data().count,
        totalRevenue,
        monthlyRevenue,
        totalTransactions: allTransactions.data().count,
        pendingTransactions: pendingTransactions.data().count,
        completedTransactions: completedTransactions.data().count,
        totalAppointments: allAppointments.data().count,
        upcomingAppointments: upcomingAppointments.data().count,
        completedAppointments: completedAppointments.data().count,
        totalArticles: allArticles.data().count,
        verifiedArticles: verifiedArticles.data().count,
        pendingArticles: pendingArticles.data().count,
        userGrowth: {
          today: todayUsers.data().count,
          thisWeek: weekUsers.data().count,
          thisMonth: monthUsers.data().count,
        },
        revenueBreakdown,
        geographicDistribution,
      };
    } catch (error) {
      console.error('Get admin stats error:', error);
      // Return default stats on error
      return {
        totalUsers: 0,
        activeUsers: 0,
        totalDoctors: 0,
        totalPharmacies: 0,
        totalPatients: 0,
        totalCouriers: 0,
        totalCHWs: 0,
        totalRevenue: 0,
        monthlyRevenue: 0,
        totalTransactions: 0,
        pendingTransactions: 0,
        completedTransactions: 0,
        totalAppointments: 0,
        upcomingAppointments: 0,
        completedAppointments: 0,
        totalArticles: 0,
        verifiedArticles: 0,
        pendingArticles: 0,
        userGrowth: {
          today: 0,
          thisWeek: 0,
          thisMonth: 0,
        },
        revenueBreakdown: {
          consultations: 0,
          pharmacy: 0,
          subscriptions: 0,
          articles: 0,
        },
        geographicDistribution: {},
      };
    }
  }

  /**
   * Get revenue trends (daily, weekly, monthly)
   */
  async getRevenueTrends(period: 'daily' | 'weekly' | 'monthly' = 'monthly'): Promise<Array<{ date: string; revenue: number }>> {
    try {
      const now = new Date();
      let startDate: Date;
      const days = period === 'daily' ? 30 : period === 'weekly' ? 12 * 7 : 12 * 30;
      startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

      const transactionsSnapshot = await getDocs(
        query(
          collection(firestore, 'transactions'),
          where('status', '==', 'COMPLETED'),
          where('completedAt', '>=', Timestamp.fromDate(startDate)),
          orderBy('completedAt', 'asc')
        )
      );

      const trends: Record<string, number> = {};

      transactionsSnapshot.forEach((doc) => {
        const data = doc.data();
        const completedAt = data.completedAt?.toDate();
        if (!completedAt) return;

        let dateKey: string;
        if (period === 'daily') {
          dateKey = completedAt.toISOString().split('T')[0];
        } else if (period === 'weekly') {
          const weekStart = new Date(completedAt);
          weekStart.setDate(weekStart.getDate() - weekStart.getDay());
          dateKey = weekStart.toISOString().split('T')[0];
        } else {
          dateKey = `${completedAt.getFullYear()}-${String(completedAt.getMonth() + 1).padStart(2, '0')}`;
        }

        trends[dateKey] = (trends[dateKey] || 0) + (data.amount || 0);
      });

      return Object.entries(trends)
        .map(([date, revenue]) => ({ date, revenue }))
        .sort((a, b) => a.date.localeCompare(b.date));
    } catch (error) {
      console.error('Get revenue trends error:', error);
      return [];
    }
  }

  /**
   * Get user growth trends
   */
  async getUserGrowthTrends(period: 'daily' | 'weekly' | 'monthly' = 'monthly'): Promise<Array<{ date: string; count: number }>> {
    try {
      const now = new Date();
      const days = period === 'daily' ? 30 : period === 'weekly' ? 12 * 7 : 12 * 30;
      const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

      const usersSnapshot = await getDocs(
        query(
          collection(firestore, 'users'),
          where('createdAt', '>=', Timestamp.fromDate(startDate)),
          orderBy('createdAt', 'asc')
        )
      );

      const trends: Record<string, number> = {};

      usersSnapshot.forEach((doc) => {
        const data = doc.data();
        const createdAt = data.createdAt?.toDate();
        if (!createdAt) return;

        let dateKey: string;
        if (period === 'daily') {
          dateKey = createdAt.toISOString().split('T')[0];
        } else if (period === 'weekly') {
          const weekStart = new Date(createdAt);
          weekStart.setDate(weekStart.getDate() - weekStart.getDay());
          dateKey = weekStart.toISOString().split('T')[0];
        } else {
          dateKey = `${createdAt.getFullYear()}-${String(createdAt.getMonth() + 1).padStart(2, '0')}`;
        }

        trends[dateKey] = (trends[dateKey] || 0) + 1;
      });

      return Object.entries(trends)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date));
    } catch (error) {
      console.error('Get user growth trends error:', error);
      return [];
    }
  }
}

export const analyticsService = new AnalyticsService();
export default analyticsService;

