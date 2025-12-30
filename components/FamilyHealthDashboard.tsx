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
  const { user } = useAuth();
  const { notify } = useNotification();
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMembers();
  }, [user]);

  const loadMembers = async () => {
    try {
      setLoading(true);
      const data = await db.getFamilyMembers(user?.id || '') || [];
      setMembers(data);
    } catch (error) {
      handleError(error, notify);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <SkeletonLoader />;
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Family Health Dashboard</h1>
        <p className="text-gray-600">Manage your family members' health information</p>
      </div>

      {members.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No Family Members"
          description="Add family members to track their health"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {members.map((member) => (
            <div key={member.id} className="border rounded-lg p-4">
              <div className="flex items-center gap-3 mb-3">
                <img src={member.avatar} alt={member.name} className="w-12 h-12 rounded-full" />
                <div>
                  <h3 className="font-semibold">{member.name}</h3>
                  <p className="text-sm text-gray-600">{member.relation}</p>
                </div>
              </div>
              {member.dateOfBirth && (
                <p className="text-sm">Age: {calculateAge(member.dateOfBirth)}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};