import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  Activity, 
  Heart,
  Calendar,
  Pill,
  FileText,
  TrendingUp,
  AlertCircle,
  Edit,
  Trash2,
  Plus,
  X
} from 'lucide-react';
import { FamilyMember, HealthRecord, Appointment, UserRole } from '../types';
import { db } from '../services/db';
import { useNotification } from './NotificationSystem';
import { useAuth } from '../contexts/AuthContext';
import { EmptyState } from './EmptyState';
import { SkeletonLoader } from './SkeletonLoader';
import { handleError } from '../utils/errorHandler';

interface FamilyHealthSummary {
  memberId: string;
  memberName: string;
  recentAppointments: number;
  upcomingAppointments: number;
  activeMedications: number;
  healthRecords: number;
  lastCheckup?: string;
}

const calculateAge = (dateOfBirth: string): number => {
  const birthDate = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};

export const FamilyHealthDashboard: React.FC = () => {