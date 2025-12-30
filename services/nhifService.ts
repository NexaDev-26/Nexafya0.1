/**
 * NHIF (National Health Insurance Fund) Service
 * Handles NHIF verification, status checking, and benefits
 */

import { db as firestore } from '../lib/firebase';
import { collection, addDoc, doc, getDoc, setDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { cleanFirestoreData } from '../utils/firestoreHelpers';

export interface NHIFMember {
  memberNumber: string;
  fullName: string;
  dateOfBirth: string;
  phoneNumber: string;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  coverageType: 'INDIVIDUAL' | 'FAMILY';
  expiryDate?: string;
  benefits: NHIFBenefit[];
}

export interface NHIFBenefit {
  type: 'CONSULTATION' | 'MEDICATION' | 'LAB_TEST' | 'SURGERY' | 'HOSPITALIZATION';
  coverage: number; // Percentage covered
  annualLimit?: number;
  usedAmount?: number;
}

export interface NHIFVerificationRequest {
  memberNumber: string;
  fullName: string;
  dateOfBirth: string;
  phoneNumber: string;
  userId: string;
}

class NHIFService {
  /**
   * Verify NHIF membership
   * In production, this would call the actual NHIF API
   */
  async verifyMembership(request: NHIFVerificationRequest): Promise<{
    success: boolean;
    member?: NHIFMember;
    error?: string;
  }> {
    try {
      const apiKey = import.meta.env.VITE_NHIF_API_KEY;
      const baseUrl = import.meta.env.VITE_NHIF_BASE_URL || 'https://api.nhif.go.tz';

      // If API key is not configured, use simulation mode
      if (!apiKey) {
        console.warn('NHIF API key not configured. Using simulation mode.');
        await new Promise(resolve => setTimeout(resolve, 1500));

      // Mock NHIF member data
      const mockMember: NHIFMember = {
        memberNumber: request.memberNumber,
        fullName: request.fullName,
        dateOfBirth: request.dateOfBirth,
        phoneNumber: request.phoneNumber,
        status: 'ACTIVE',
        coverageType: 'FAMILY',
        expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year from now
        benefits: [
          {
            type: 'CONSULTATION',
            coverage: 80,
            annualLimit: 500000, // TZS
            usedAmount: 0,
          },
          {
            type: 'MEDICATION',
            coverage: 70,
            annualLimit: 1000000,
            usedAmount: 0,
          },
          {
            type: 'LAB_TEST',
            coverage: 75,
            annualLimit: 300000,
            usedAmount: 0,
          },
          {
            type: 'HOSPITALIZATION',
            coverage: 90,
            annualLimit: 5000000,
            usedAmount: 0,
          },
        ],
      };

        // Save NHIF record to Firestore
        const nhifRef = doc(firestore, 'nhifMembers', request.userId);
        await setDoc(nhifRef, cleanFirestoreData({
          ...mockMember,
          userId: request.userId,
          verifiedAt: serverTimestamp(),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }));

        return {
          success: true,
          member: mockMember,
        };
      }

      // Real NHIF API integration
      const response = await fetch(`${baseUrl}/v1/members/verify`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          memberNumber: request.memberNumber,
          fullName: request.fullName,
          dateOfBirth: request.dateOfBirth,
          phoneNumber: request.phoneNumber,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return {
          success: false,
          error: errorData.message || 'NHIF verification failed',
        };
      }

      const nhifData = await response.json();

      // Map NHIF API response to our NHIFMember interface
      const member: NHIFMember = {
        memberNumber: nhifData.memberNumber || request.memberNumber,
        fullName: nhifData.fullName || request.fullName,
        dateOfBirth: nhifData.dateOfBirth || request.dateOfBirth,
        phoneNumber: nhifData.phoneNumber || request.phoneNumber,
        status: nhifData.status || 'ACTIVE',
        coverageType: nhifData.coverageType || 'INDIVIDUAL',
        expiryDate: nhifData.expiryDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        benefits: nhifData.benefits || [
          {
            type: 'CONSULTATION',
            coverage: 80,
            annualLimit: 500000,
            usedAmount: 0,
          },
          {
            type: 'MEDICATION',
            coverage: 70,
            annualLimit: 1000000,
            usedAmount: 0,
          },
        ],
        dependents: nhifData.dependents || [],
      };

      // Save NHIF record to Firestore
      const nhifRef = doc(firestore, 'nhifMembers', request.userId);
      await setDoc(nhifRef, cleanFirestoreData({
        ...member,
        userId: request.userId,
        verifiedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }));

      return {
        success: true,
        member,
      };
    } catch (error: any) {
      console.error('NHIF verification error:', error);
      return {
        success: false,
        error: error.message || 'NHIF verification failed',
      };
    }
  }

  /**
   * Get NHIF status for a user
   */
  async getNHIFStatus(userId: string): Promise<NHIFMember | null> {
    try {
      const nhifRef = doc(firestore, 'nhifMembers', userId);
      const nhifSnap = await getDoc(nhifRef);

      if (!nhifSnap.exists()) {
        return null;
      }

      return nhifSnap.data() as NHIFMember;
    } catch (error) {
      console.error('Get NHIF status error:', error);
      return null;
    }
  }

  /**
   * Check if a service is covered by NHIF
   */
  async checkCoverage(
    userId: string,
    serviceType: NHIFBenefit['type'],
    amount: number
  ): Promise<{
    covered: boolean;
    coverageAmount: number;
    memberPayAmount: number;
    benefit?: NHIFBenefit;
  }> {
    try {
      const member = await this.getNHIFStatus(userId);

      if (!member || member.status !== 'ACTIVE') {
        return {
          covered: false,
          coverageAmount: 0,
          memberPayAmount: amount,
        };
      }

      const benefit = member.benefits.find(b => b.type === serviceType);

      if (!benefit) {
        return {
          covered: false,
          coverageAmount: 0,
          memberPayAmount: amount,
        };
      }

      // Check if annual limit is exceeded
      const used = benefit.usedAmount || 0;
      const limit = benefit.annualLimit || Infinity;

      if (used >= limit) {
        return {
          covered: false,
          coverageAmount: 0,
          memberPayAmount: amount,
        };
      }

      // Calculate coverage
      const coverageAmount = Math.min(
        (amount * benefit.coverage) / 100,
        limit - used
      );
      const memberPayAmount = amount - coverageAmount;

      return {
        covered: true,
        coverageAmount,
        memberPayAmount,
        benefit,
      };
    } catch (error) {
      console.error('Check coverage error:', error);
      return {
        covered: false,
        coverageAmount: 0,
        memberPayAmount: amount,
      };
    }
  }

  /**
   * Record NHIF usage (when a service is used)
   */
  async recordUsage(
    userId: string,
    serviceType: NHIFBenefit['type'],
    amount: number
  ): Promise<boolean> {
    try {
      const member = await this.getNHIFStatus(userId);
      if (!member) return false;

      const benefit = member.benefits.find(b => b.type === serviceType);
      if (!benefit) return false;

      const newUsedAmount = (benefit.usedAmount || 0) + amount;

      // Update NHIF record
      const nhifRef = doc(firestore, 'nhifMembers', userId);
      const updatedBenefits = member.benefits.map(b =>
        b.type === serviceType
          ? { ...b, usedAmount: newUsedAmount }
          : b
      );

      await setDoc(
        nhifRef,
        {
          ...member,
          benefits: updatedBenefits,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      return true;
    } catch (error) {
      console.error('Record NHIF usage error:', error);
      return false;
    }
  }
}

export const nhifService = new NHIFService();
export default nhifService;

