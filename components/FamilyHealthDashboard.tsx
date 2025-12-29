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
import { FamilyMember, HealthRecord, Appointment } from '../types';
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

export const FamilyHealthDashboard: React.FC = () => {
  const { notify } = useNotification();
  const { user } = useAuth();
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [healthSummaries, setHealthSummaries] = useState<FamilyHealthSummary[]>([]);
  const [selectedMember, setSelectedMember] = useState<FamilyMember | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddMember, setShowAddMember] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    relationship: '',
    dateOfBirth: '',
    gender: '',
    bloodType: '',
    allergies: '',
    medicalConditions: '',
  });

  useEffect(() => {
    loadFamilyData();
  }, []);

  const loadFamilyData = async () => {
    try {
      setLoading(true);
      const members = await db.getFamilyMembers?.(user?.id || '') || [];
      setFamilyMembers(members);

      // Load health summaries for each member
      const summaries = await Promise.all(
        members.map(async (member) => {
          const appointments = await db.getAppointments?.(member.id, 'PATIENT') || [];
          const records = await db.getHealthRecords?.(member.id) || [];
          const medications = await db.getMedicationSchedules?.(member.id) || [];

          return {
            memberId: member.id,
            memberName: member.name,
            recentAppointments: appointments.filter(a => a.status === 'COMPLETED').length,
            upcomingAppointments: appointments.filter(a => a.status === 'UPCOMING').length,
            activeMedications: medications.length,
            healthRecords: records.length,
            lastCheckup: appointments
              .filter(a => a.status === 'COMPLETED')
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]?.date,
          };
        })
      );

      setHealthSummaries(summaries);
    } catch (error) {
      handleError(error, notify);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = async () => {
    if (!formData.name || !formData.relationship) {
      notify('Please fill in required fields', 'warning');
      return;
    }

    try {
      const newMember: FamilyMember = {
        id: Date.now().toString(),
        userId: user?.id || '',
        name: formData.name,
        relationship: formData.relationship,
        dateOfBirth: formData.dateOfBirth,
        gender: formData.gender as 'MALE' | 'FEMALE',
        bloodType: formData.bloodType,
        allergies: formData.allergies.split(',').map(a => a.trim()).filter(Boolean),
        medicalConditions: formData.medicalConditions.split(',').map(c => c.trim()).filter(Boolean),
      };

      // Save to database
      // await db.addFamilyMember(newMember);

      setFamilyMembers([...familyMembers, newMember]);
      setShowAddMember(false);
      resetForm();
      notify('Family member added successfully', 'success');
      loadFamilyData();
    } catch (error) {
      handleError(error, notify);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      relationship: '',
      dateOfBirth: '',
      gender: '',
      bloodType: '',
      allergies: '',
      medicalConditions: '',
    });
  };

  const handleSelectMember = (member: FamilyMember) => {
    setSelectedMember(member);
  };

  const getSummary = (memberId: string): FamilyHealthSummary | undefined => {
    return healthSummaries.find(s => s.memberId === memberId);
  };

  if (loading) {
    return <SkeletonLoader type="dashboard" />;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Family Health Dashboard</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Manage health for all family members</p>
        </div>
        <button
          onClick={() => setShowAddMember(true)}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg flex items-center gap-2 transition-colors"
        >
          <UserPlus size={20} />
          Add Family Member
        </button>
      </div>

      {/* Family Members Grid */}
      {familyMembers.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No family members added"
          description="Add family members to track their health together"
          action={
            <button
              onClick={() => setShowAddMember(true)}
              className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors"
            >
              Add Family Member
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {familyMembers.map(member => {
            const summary = getSummary(member.id);
            return (
              <div
                key={member.id}
                onClick={() => handleSelectMember(member)}
                className={`bg-white dark:bg-[#0F172A] rounded-3xl border-2 p-6 cursor-pointer transition-all hover:shadow-lg ${
                  selectedMember?.id === member.id
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-100 dark:border-gray-700'
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
                      {member.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white">{member.name}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{member.relationship}</p>
                    </div>
                  </div>
                </div>

                {/* Member Info */}
                <div className="space-y-2 mb-4">
                  {member.bloodType && (
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <Heart size={14} className="text-red-500" />
                      Blood Type: <span className="font-bold text-gray-900 dark:text-white">{member.bloodType}</span>
                    </div>
                  )}
                  {member.allergies && member.allergies.length > 0 && (
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <AlertCircle size={14} className="text-orange-500" />
                      Allergies: <span className="font-bold text-gray-900 dark:text-white">{member.allergies.length}</span>
                    </div>
                  )}
                </div>

                {/* Health Summary */}
                {summary && (
                  <div className="grid grid-cols-2 gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
                    <div className="text-center p-3 bg-gray-50 dark:bg-[#0A0F1C] rounded-xl">
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">{summary.upcomingAppointments}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Upcoming</div>
                    </div>
                    <div className="text-center p-3 bg-gray-50 dark:bg-[#0A0F1C] rounded-xl">
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">{summary.activeMedications}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Medications</div>
                    </div>
                    <div className="text-center p-3 bg-gray-50 dark:bg-[#0A0F1C] rounded-xl">
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">{summary.healthRecords}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Records</div>
                    </div>
                    <div className="text-center p-3 bg-gray-50 dark:bg-[#0A0F1C] rounded-xl">
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">{summary.recentAppointments}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Completed</div>
                    </div>
                  </div>
                )}

                {summary?.lastCheckup && (
                  <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                      <Calendar size={12} />
                      Last checkup: {new Date(summary.lastCheckup).toLocaleDateString()}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Selected Member Details */}
      {selectedMember && (
        <div className="bg-white dark:bg-[#0F172A] rounded-3xl border border-gray-100 dark:border-gray-700/50 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {selectedMember.name}'s Health Overview
            </h2>
            <button
              onClick={() => setSelectedMember(null)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              <X size={20} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl">
              <div className="flex items-center gap-3 mb-2">
                <Calendar className="text-blue-600 dark:text-blue-400" size={20} />
                <h3 className="font-bold text-gray-900 dark:text-white">Appointments</h3>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {getSummary(selectedMember.id)?.upcomingAppointments || 0} upcoming
              </p>
            </div>

            <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-2xl">
              <div className="flex items-center gap-3 mb-2">
                <Pill className="text-purple-600 dark:text-purple-400" size={20} />
                <h3 className="font-bold text-gray-900 dark:text-white">Medications</h3>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {getSummary(selectedMember.id)?.activeMedications || 0} active
              </p>
            </div>

            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-2xl">
              <div className="flex items-center gap-3 mb-2">
                <FileText className="text-green-600 dark:text-green-400" size={20} />
                <h3 className="font-bold text-gray-900 dark:text-white">Health Records</h3>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {getSummary(selectedMember.id)?.healthRecords || 0} records
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-700">
            <h3 className="font-bold text-gray-900 dark:text-white mb-4">Quick Actions</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <button className="p-3 bg-gray-50 dark:bg-[#0A0F1C] rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-sm font-bold text-gray-900 dark:text-white">
                View Records
              </button>
              <button className="p-3 bg-gray-50 dark:bg-[#0A0F1C] rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-sm font-bold text-gray-900 dark:text-white">
                Book Appointment
              </button>
              <button className="p-3 bg-gray-50 dark:bg-[#0A0F1C] rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-sm font-bold text-gray-900 dark:text-white">
                View Medications
              </button>
              <button className="p-3 bg-gray-50 dark:bg-[#0A0F1C] rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-sm font-bold text-gray-900 dark:text-white">
                Edit Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Family Member Modal */}
      {showAddMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-[#0F172A] rounded-3xl shadow-2xl max-w-2xl w-full animate-in zoom-in-95 duration-300">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Add Family Member</h2>
              <button
                onClick={() => {
                  setShowAddMember(false);
                  resetForm();
                }}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                    Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-[#0A0F1C] border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                    Relationship *
                  </label>
                  <select
                    value={formData.relationship}
                    onChange={(e) => setFormData({ ...formData, relationship: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-[#0A0F1C] border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
                  >
                    <option value="">Select relationship</option>
                    <option value="Spouse">Spouse</option>
                    <option value="Child">Child</option>
                    <option value="Parent">Parent</option>
                    <option value="Sibling">Sibling</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-[#0A0F1C] border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                    Gender
                  </label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-[#0A0F1C] border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
                  >
                    <option value="">Select gender</option>
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                  Blood Type
                </label>
                <select
                  value={formData.bloodType}
                  onChange={(e) => setFormData({ ...formData, bloodType: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-[#0A0F1C] border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
                >
                  <option value="">Select blood type</option>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                  Allergies (comma-separated)
                </label>
                <input
                  type="text"
                  value={formData.allergies}
                  onChange={(e) => setFormData({ ...formData, allergies: e.target.value })}
                  placeholder="e.g., Penicillin, Peanuts"
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-[#0A0F1C] border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                  Medical Conditions (comma-separated)
                </label>
                <input
                  type="text"
                  value={formData.medicalConditions}
                  onChange={(e) => setFormData({ ...formData, medicalConditions: e.target.value })}
                  placeholder="e.g., Diabetes, Hypertension"
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-[#0A0F1C] border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
                />
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-4">
              <button
                onClick={() => {
                  setShowAddMember(false);
                  resetForm();
                }}
                className="px-6 py-3 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl font-bold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddMember}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg transition-colors"
              >
                Add Member
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

