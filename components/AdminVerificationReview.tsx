import React, { useState, useEffect } from 'react';
import { Shield, CheckCircle, X, AlertCircle, Search, Filter, Eye, FileText, User, Calendar, Building, Stethoscope, Truck, Loader2, ExternalLink } from 'lucide-react';
import { useNotification } from './NotificationSystem';
import { useAuth } from '../contexts/AuthContext';
import { UserRole, UserVerification, VerificationDocument } from '../types';
import { collection, query, where, getDocs, updateDoc, doc, serverTimestamp, getDoc } from 'firebase/firestore';
import { db as firestore } from '../lib/firebase';
import { notificationService } from '../services/notificationService';

export const AdminVerificationReview: React.FC = () => {
  const { user: currentUser } = useAuth();
  const { notify } = useNotification();
  const [verifications, setVerifications] = useState<UserVerification[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'ALL'>('ALL');
  const [selectedVerification, setSelectedVerification] = useState<UserVerification | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject' | null>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (currentUser?.role === UserRole.ADMIN) {
      loadVerifications();
    }
  }, [currentUser, statusFilter, roleFilter]);

  const loadVerifications = async () => {
    setLoading(true);
    try {
      let q = query(collection(firestore, 'userVerifications'));
      
      if (statusFilter !== 'ALL') {
        q = query(q, where('verificationStatus', '==', statusFilter));
      }
      if (roleFilter !== 'ALL') {
        q = query(q, where('userRole', '==', roleFilter));
      }

      const snapshot = await getDocs(q);
      const verificationsData = await Promise.all(
        snapshot.docs.map(async (doc) => {
          const data = doc.data() as UserVerification;
          // Fetch user details
          const userDoc = await getDoc(doc(firestore, 'users', data.userId));
          const userData = userDoc.data();
          return {
            ...data,
            id: doc.id,
            userName: userData?.name || 'Unknown',
            userEmail: userData?.email || '',
            userPhone: userData?.phone || ''
          };
        })
      );
      setVerifications(verificationsData);
    } catch (error) {
      console.error('Failed to load verifications:', error);
      notify('Failed to load verifications', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleReview = (verification: UserVerification, action: 'approve' | 'reject') => {
    setSelectedVerification(verification);
    setReviewAction(action);
    setReviewNotes('');
    setShowReviewModal(true);
  };

  const handleSubmitReview = async () => {
    if (!selectedVerification || !reviewAction || !currentUser) return;

    setProcessing(true);
    try {
      const verificationRef = doc(firestore, 'userVerifications', selectedVerification.id!);
      const newStatus = reviewAction === 'approve' ? 'Verified' : 'Rejected';
      
      // Update verification status
      await updateDoc(verificationRef, {
        verificationStatus: newStatus,
        verifiedBy: currentUser.id,
        verifiedAt: serverTimestamp(),
        rejectionReason: reviewAction === 'reject' ? reviewNotes : null,
        notes: reviewNotes || null,
        updatedAt: serverTimestamp()
      });

      // Update all documents to approved/rejected
      if (selectedVerification.documents) {
        for (const document of selectedVerification.documents) {
          await updateDoc(doc(firestore, 'verificationDocuments', document.id), {
            status: reviewAction === 'approve' ? 'Approved' : 'Rejected',
            reviewedBy: currentUser.id,
            reviewedAt: serverTimestamp(),
            rejectionReason: reviewAction === 'reject' ? reviewNotes : null,
            notes: reviewNotes || null
          });
        }
      }

      // Update user's verification status in their profile
      const userRef = doc(firestore, 'users', selectedVerification.userId);
      await updateDoc(userRef, {
        verificationStatus: newStatus,
        updatedAt: serverTimestamp()
      });

      // Update doctor/pharmacy/courier specific collections
      if (selectedVerification.userRole === UserRole.DOCTOR) {
        const doctorRef = doc(firestore, 'doctors', selectedVerification.userId);
        const doctorDoc = await getDoc(doctorRef);
        if (doctorDoc.exists()) {
          await updateDoc(doctorRef, {
            isTrusted: reviewAction === 'approve',
            verificationStatus: newStatus,
            updatedAt: serverTimestamp()
          });
        }
      } else if (selectedVerification.userRole === UserRole.COURIER) {
        const courierRef = doc(firestore, 'couriers', selectedVerification.userId);
        const courierDoc = await getDoc(courierRef);
        if (courierDoc.exists()) {
          await updateDoc(courierRef, {
            isTrusted: reviewAction === 'approve',
            verificationStatus: newStatus,
            updatedAt: serverTimestamp()
          });
        }
      }

      // Send notification to user
      await notificationService.createNotification({
        userId: selectedVerification.userId,
        title: `Verification ${reviewAction === 'approve' ? 'Approved' : 'Rejected'}`,
        message: reviewAction === 'approve' 
          ? 'Congratulations! Your account has been verified. You can now access all features.'
          : `Your verification was rejected. Reason: ${reviewNotes || 'Please check your documents and resubmit.'}`,
        type: reviewAction === 'approve' ? 'success' : 'error',
        link: '/profile'
      });

      notify(`Verification ${reviewAction === 'approve' ? 'approved' : 'rejected'} successfully`, 'success');
      setShowReviewModal(false);
      setSelectedVerification(null);
      loadVerifications();
    } catch (error) {
      console.error('Review failed:', error);
      notify('Failed to process review', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const filteredVerifications = verifications.filter(v => {
    const matchesSearch = 
      v.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.userEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.userId.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Verified':
        return 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400';
      case 'Pending':
      case 'Under Review':
        return 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400';
      case 'Rejected':
        return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400';
      default:
        return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400';
    }
  };

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case UserRole.DOCTOR:
        return <Stethoscope size={18} />;
      case UserRole.PHARMACY:
        return <Building size={18} />;
      case UserRole.COURIER:
        return <Truck size={18} />;
      default:
        return <User size={18} />;
    }
  };

  if (currentUser?.role !== UserRole.ADMIN) {
    return (
      <div className="p-8 text-center text-gray-500 dark:text-gray-400">
        Access denied. Admin only.
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold font-display text-gray-900 dark:text-white flex items-center gap-2">
            <Shield className="text-blue-600" size={28} />
            Verification Review
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Review and verify user documents
          </p>
        </div>
        <div className="text-sm text-gray-600 dark:text-gray-400">
          Total: <span className="font-bold text-gray-900 dark:text-white">{filteredVerifications.length}</span> verifications
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search by name, email, or user ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-[#0A1B2E] border border-gray-200 dark:border-gray-700/50 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-3 bg-white dark:bg-[#0F172A] border border-gray-200 dark:border-gray-700/50 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none font-bold text-sm"
        >
          <option value="ALL">All Status</option>
          <option value="Pending">Pending</option>
          <option value="Under Review">Under Review</option>
          <option value="Verified">Verified</option>
          <option value="Rejected">Rejected</option>
        </select>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value as UserRole | 'ALL')}
          className="px-4 py-3 bg-white dark:bg-[#0F172A] border border-gray-200 dark:border-gray-700/50 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none font-bold text-sm"
        >
          <option value="ALL">All Roles</option>
          <option value={UserRole.DOCTOR}>Doctors</option>
          <option value={UserRole.PHARMACY}>Pharmacies</option>
          <option value={UserRole.COURIER}>Couriers</option>
        </select>
      </div>

      {/* Verifications List */}
      <div className="bg-white dark:bg-[#0F172A] rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700/50 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <Loader2 className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            <p className="mt-4 text-gray-500 dark:text-gray-400">Loading verifications...</p>
          </div>
        ) : filteredVerifications.length === 0 ? (
          <div className="p-12 text-center text-gray-500 dark:text-gray-400">
            No verifications found.
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {filteredVerifications.map((verification) => (
              <div
                key={verification.id}
                className="p-6 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
                        {getRoleIcon(verification.userRole)}
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 dark:text-white">
                          {verification.userName || 'Unknown User'}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {verification.userEmail} • {verification.userRole}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 mt-3 text-sm">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(verification.verificationStatus)}`}>
                        {verification.verificationStatus}
                      </span>
                      <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1">
                        <FileText size={14} />
                        {verification.documents?.length || 0} documents
                      </span>
                      {verification.submittedAt && (
                        <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1">
                          <Calendar size={14} />
                          Submitted {new Date(verification.submittedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    {verification.documents && verification.documents.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {verification.documents.map((doc) => (
                          <a
                            key={doc.id}
                            href={doc.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center gap-1"
                          >
                            <Eye size={14} />
                            {doc.type}
                            <ExternalLink size={12} />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {verification.verificationStatus === 'Pending' || verification.verificationStatus === 'Under Review' ? (
                      <>
                        <button
                          onClick={() => handleReview(verification, 'approve')}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm flex items-center gap-2 transition-colors"
                        >
                          <CheckCircle size={16} />
                          Approve
                        </button>
                        <button
                          onClick={() => handleReview(verification, 'reject')}
                          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-sm flex items-center gap-2 transition-colors"
                        >
                          <X size={16} />
                          Reject
                        </button>
                      </>
                    ) : (
                      <span className={`px-4 py-2 rounded-xl text-sm font-bold ${getStatusColor(verification.verificationStatus)}`}>
                        {verification.verificationStatus}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Review Modal */}
      {showReviewModal && selectedVerification && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white dark:bg-[#0F172A] w-full max-w-2xl rounded-[2rem] shadow-2xl">
            <div className="p-6 border-b border-gray-100 dark:border-gray-700/50">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                {reviewAction === 'approve' ? 'Approve' : 'Reject'} Verification
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {selectedVerification.userName} ({selectedVerification.userRole})
              </p>
            </div>
            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              {/* Documents Preview */}
              <div>
                <h4 className="font-bold text-gray-900 dark:text-white mb-3">Documents</h4>
                <div className="space-y-2">
                  {selectedVerification.documents?.map((doc) => (
                    <div
                      key={doc.id}
                      className="p-3 bg-gray-50 dark:bg-[#0A1B2E] rounded-xl flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <FileText size={18} className="text-gray-400" />
                        <span className="font-bold text-sm text-gray-900 dark:text-white">{doc.type}</span>
                        <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(doc.status)}`}>
                          {doc.status}
                        </span>
                      </div>
                      <a
                        href={doc.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline text-sm flex items-center gap-1"
                      >
                        View <ExternalLink size={14} />
                      </a>
                    </div>
                  ))}
                </div>
              </div>

              {/* Review Notes */}
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">
                  {reviewAction === 'approve' ? 'Notes (Optional)' : 'Rejection Reason *'}
                </label>
                <textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder={reviewAction === 'approve' 
                    ? 'Add any notes about this verification...'
                    : 'Please provide a reason for rejection...'}
                  rows={4}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700/50 bg-gray-50 dark:bg-[#0A1B2E] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  required={reviewAction === 'reject'}
                />
              </div>

              {reviewAction === 'reject' && (
                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
                  <div className="flex items-start gap-2">
                    <AlertCircle size={20} className="text-amber-600 dark:text-amber-400 mt-0.5" />
                    <div className="text-sm text-amber-800 dark:text-amber-300">
                      <p className="font-bold">Rejection Guidelines:</p>
                      <ul className="list-disc list-inside mt-1 space-y-1">
                        <li>Provide clear reason for rejection</li>
                        <li>User will be notified and can resubmit</li>
                        <li>All documents will be marked as rejected</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="p-6 border-t border-gray-100 dark:border-gray-700/50 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowReviewModal(false);
                  setSelectedVerification(null);
                  setReviewAction(null);
                  setReviewNotes('');
                }}
                className="px-6 py-3 rounded-xl font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                disabled={processing}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitReview}
                disabled={processing || (reviewAction === 'reject' && !reviewNotes.trim())}
                className={`px-6 py-3 rounded-xl font-bold text-white transition-colors ${
                  reviewAction === 'approve'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-red-600 hover:bg-red-700'
                } disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2`}
              >
                {processing ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    {reviewAction === 'approve' ? <CheckCircle size={16} /> : <X size={16} />}
                    {reviewAction === 'approve' ? 'Approve' : 'Reject'} Verification
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

