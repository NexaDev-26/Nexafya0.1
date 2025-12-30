import React, { useState, useEffect } from 'react';
import { Upload, FileText, CheckCircle, X, AlertCircle, Loader2, Shield, Camera, FileCheck, Trash2 } from 'lucide-react';
import { useNotification } from './NotificationSystem';
import { useAuth } from '../contexts/AuthContext';
import { UserRole, VerificationDocument, UserVerification } from '../types';
import { storage, db as firestore } from '../lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, query, where, getDocs, updateDoc, doc, serverTimestamp, getDoc, setDoc } from 'firebase/firestore';
import { cleanFirestoreData } from '../utils/firestoreHelpers';

interface VerificationDocumentUploadProps {
  onComplete?: () => void;
}

export const VerificationDocumentUpload: React.FC<VerificationDocumentUploadProps> = ({ onComplete }) => {
  const { user } = useAuth();
  const { notify } = useNotification();
  const [uploading, setUploading] = useState(false);
  const [documents, setDocuments] = useState<VerificationDocument[]>([]);
  const [verificationStatus, setVerificationStatus] = useState<UserVerification | null>(null);
  const [loading, setLoading] = useState(true);

  // Required documents based on role
  const requiredDocuments: Record<UserRole, string[]> = {
    [UserRole.DOCTOR]: ['Medical License', 'National ID', 'Professional Certificate'],
    [UserRole.PHARMACY]: ['Pharmacy License', 'Business Registration', 'National ID'],
    [UserRole.COURIER]: ['National ID', 'Driving License', 'Background Check'],
    [UserRole.PATIENT]: [],
    [UserRole.ADMIN]: [],
    [UserRole.CHW]: ['National ID', 'Professional Certificate'],
  };

  useEffect(() => {
    if (user) {
      loadVerificationStatus();
    }
  }, [user]);

  const loadVerificationStatus = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Check if verification record exists
      const verificationQuery = query(
        collection(firestore, 'userVerifications'),
        where('userId', '==', user.id)
      );
      const verificationSnapshot = await getDocs(verificationQuery);
      
      if (!verificationSnapshot.empty) {
        const verificationData = verificationSnapshot.docs[0].data() as UserVerification;
        setVerificationStatus({
          ...verificationData,
          documents: verificationData.documents || []
        });
        setDocuments(verificationData.documents || []);
      } else {
        // Create initial verification record
        const newVerification: Omit<UserVerification, 'id'> = {
          userId: user.id,
          userRole: user.role,
          verificationStatus: 'Unverified',
          verificationLevel: 'Basic',
          documents: [],
          requiredDocuments: requiredDocuments[user.role] || [],
          isActive: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };
        const docRef = await addDoc(collection(firestore, 'userVerifications'), newVerification);
        setVerificationStatus({ ...newVerification, id: docRef.id } as UserVerification);
      }
    } catch (error) {
      console.error('Failed to load verification status:', error);
      notify('Failed to load verification status', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (type: string, file: File) => {
    if (!user) return;
    
    setUploading(true);
    try {
      // Validate file type
      const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
      if (!validTypes.includes(file.type)) {
        notify('Please upload a JPG, PNG, or PDF file', 'error');
        setUploading(false);
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        notify('File size must be less than 5MB', 'error');
        setUploading(false);
        return;
      }

      // Upload to Firebase Storage
      const fileName = `${user.id}/${type}/${Date.now()}_${file.name}`;
      const storageRef = ref(storage, `verification-documents/${fileName}`);
      await uploadBytes(storageRef, file);
      const fileUrl = await getDownloadURL(storageRef);

      // Create thumbnail for images
      let thumbnailUrl = fileUrl;
      if (file.type.startsWith('image/')) {
        thumbnailUrl = fileUrl; // For now, use same URL. Can optimize later
      }

      // Create document record
      const newDocument: Omit<VerificationDocument, 'id'> = {
        userId: user.id,
        userRole: user.role,
        type: type as VerificationDocument['type'],
        name: file.name,
        fileUrl,
        thumbnailUrl,
        status: 'Pending',
        uploadDate: new Date().toISOString()
      };

      const docRef = await addDoc(collection(firestore, 'verificationDocuments'), newDocument);

      // Update verification status
      const verificationQuery = query(
        collection(firestore, 'userVerifications'),
        where('userId', '==', user.id)
      );
      const verificationSnapshot = await getDocs(verificationQuery);
      
      if (!verificationSnapshot.empty) {
        const verificationDoc = verificationSnapshot.docs[0];
        const currentDocs = (verificationDoc.data().documents || []) as VerificationDocument[];
        const updatedDocs = [...currentDocs, { ...newDocument, id: docRef.id }];
        
        // Update status to Pending if not already
        const currentStatus = verificationDoc.data().verificationStatus;
        const newStatus = currentStatus === 'Unverified' ? 'Pending' : currentStatus;
        
        await updateDoc(verificationDoc.ref, cleanFirestoreData({
          documents: updatedDocs,
          verificationStatus: newStatus,
          submittedAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        }));

        setDocuments(updatedDocs);
        setVerificationStatus(prev => prev ? {
          ...prev,
          documents: updatedDocs,
          verificationStatus: newStatus as UserVerification['verificationStatus']
        } : null);
      }

      notify('Document uploaded successfully. Awaiting admin review.', 'success');
    } catch (error: any) {
      console.error('Upload failed:', error);
      notify(error.message || 'Failed to upload document', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;
    
    try {
      // Remove from Firestore
      await updateDoc(doc(firestore, 'verificationDocuments', docId), cleanFirestoreData({
        status: 'Rejected',
        rejectionReason: 'Deleted by user'
      }));

      // Update verification record
      const verificationQuery = query(
        collection(firestore, 'userVerifications'),
        where('userId', '==', user!.id)
      );
      const verificationSnapshot = await getDocs(verificationQuery);
      
      if (!verificationSnapshot.empty) {
        const verificationDoc = verificationSnapshot.docs[0];
        const currentDocs = (verificationDoc.data().documents || []) as VerificationDocument[];
        const updatedDocs = currentDocs.filter(d => d.id !== docId);
        
        await updateDoc(verificationDoc.ref, cleanFirestoreData({
          documents: updatedDocs,
          updatedAt: serverTimestamp()
        }));

        setDocuments(updatedDocs);
      }

      notify('Document deleted', 'success');
    } catch (error) {
      console.error('Delete failed:', error);
      notify('Failed to delete document', 'error');
    }
  };

  if (!user || !requiredDocuments[user.role] || requiredDocuments[user.role].length === 0) {
    return (
      <div className="p-6 bg-white dark:bg-[#0F172A] rounded-2xl border border-gray-200 dark:border-gray-700/50">
        <div className="text-center text-gray-500 dark:text-gray-400">
          <Shield className="mx-auto mb-4 text-gray-400" size={48} />
          <p>Verification is not required for your role.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6 bg-white dark:bg-[#0F172A] rounded-2xl border border-gray-200 dark:border-gray-700/50">
        <div className="text-center">
          <Loader2 className="mx-auto mb-4 animate-spin text-blue-600" size={32} />
          <p className="text-gray-500 dark:text-gray-400">Loading verification status...</p>
        </div>
      </div>
    );
  }

  const requiredDocs = requiredDocuments[user.role] || [];
  const uploadedDocTypes = documents.map(d => d.type);
  const missingDocs = requiredDocs.filter((docType: VerificationDocument['type']) => !uploadedDocTypes.includes(docType));

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Verified':
      case 'Approved':
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

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Status Header */}
      <div className="bg-white dark:bg-[#0F172A] rounded-2xl border border-gray-200 dark:border-gray-700/50 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-xl ${getStatusColor(verificationStatus?.verificationStatus || 'Unverified')}`}>
              <Shield size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Verification Status</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {verificationStatus?.verificationStatus || 'Unverified'}
              </p>
            </div>
          </div>
          <span className={`px-4 py-2 rounded-full text-sm font-bold ${getStatusColor(verificationStatus?.verificationStatus || 'Unverified')}`}>
            {verificationStatus?.verificationStatus || 'Unverified'}
          </span>
        </div>

        {verificationStatus?.verificationStatus === 'Verified' && (
          <div className="mt-4 p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-200 dark:border-emerald-800">
            <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
              <CheckCircle size={20} />
              <p className="font-bold">Your account is verified!</p>
            </div>
            {verificationStatus.verifiedAt && (
              <p className="text-sm text-emerald-600 dark:text-emerald-400 mt-1">
                Verified on {new Date(verificationStatus.verifiedAt).toLocaleDateString()}
              </p>
            )}
          </div>
        )}

        {verificationStatus?.rejectionReason && (
          <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
            <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
              <AlertCircle size={20} />
              <p className="font-bold">Verification Rejected</p>
            </div>
            <p className="text-sm text-red-600 dark:text-red-400 mt-1">
              {verificationStatus.rejectionReason}
            </p>
          </div>
        )}
      </div>

      {/* Required Documents */}
      <div className="bg-white dark:bg-[#0F172A] rounded-2xl border border-gray-200 dark:border-gray-700/50 p-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
          Required Documents
        </h3>
        <div className="space-y-4">
          {requiredDocs.map((docType) => {
            const uploadedDoc = documents.find(d => d.type === docType);
            return (
              <div
                key={docType}
                className="flex items-center justify-between p-4 bg-gray-50 dark:bg-[#0A1B2E] rounded-xl border border-gray-200 dark:border-gray-700/50"
              >
                <div className="flex items-center gap-3">
                  <FileText className="text-gray-400" size={20} />
                  <div>
                    <p className="font-bold text-gray-900 dark:text-white">{docType}</p>
                    {uploadedDoc && (
                      <p className={`text-xs ${getStatusColor(uploadedDoc.status)} px-2 py-1 rounded-full inline-block mt-1`}>
                        {uploadedDoc.status}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {uploadedDoc ? (
                    <>
                      <a
                        href={uploadedDoc.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition-colors"
                      >
                        View
                      </a>
                      {uploadedDoc.status === 'Pending' && (
                        <button
                          onClick={() => handleDeleteDocument(uploadedDoc.id)}
                          className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </>
                  ) : (
                    <label className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-sm cursor-pointer transition-colors">
                      <input
                        type="file"
                        accept=".jpg,.jpeg,.png,.pdf"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handleFileUpload(docType, file);
                          }
                        }}
                        disabled={uploading}
                      />
                      <span className="flex items-center gap-2">
                        <Upload size={16} />
                        Upload
                      </span>
                    </label>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Additional Documents */}
      <div className="bg-white dark:bg-[#0F172A] rounded-2xl border border-gray-200 dark:border-gray-700/50 p-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
          Additional Documents (Optional)
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          You can upload additional documents to strengthen your verification.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {['Professional Certificate', 'Background Check'].map((docType) => {
            if (requiredDocs.includes(docType)) return null;
            const uploadedDoc = documents.find(d => d.type === docType);
            return (
              <div
                key={docType}
                className="p-4 bg-gray-50 dark:bg-[#0A1B2E] rounded-xl border border-gray-200 dark:border-gray-700/50"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileCheck size={18} className="text-gray-400" />
                    <p className="font-bold text-sm text-gray-900 dark:text-white">{docType}</p>
                  </div>
                  {uploadedDoc ? (
                    <a
                      href={uploadedDoc.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline"
                    >
                      View
                    </a>
                  ) : (
                    <label className="text-sm text-blue-600 hover:underline cursor-pointer">
                      <input
                        type="file"
                        accept=".jpg,.jpeg,.png,.pdf"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handleFileUpload(docType, file);
                          }
                        }}
                        disabled={uploading}
                      />
                      Upload
                    </label>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Upload Progress */}
      {uploading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#0F172A] rounded-2xl p-6 max-w-sm w-full mx-4">
            <div className="text-center">
              <Loader2 className="mx-auto mb-4 animate-spin text-blue-600" size={32} />
              <p className="font-bold text-gray-900 dark:text-white">Uploading document...</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Please wait</p>
            </div>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-200 dark:border-blue-800 p-6">
        <h4 className="font-bold text-blue-900 dark:text-blue-400 mb-2 flex items-center gap-2">
          <AlertCircle size={20} />
          Verification Guidelines
        </h4>
        <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1 list-disc list-inside">
          <li>Upload clear, high-quality images or PDFs</li>
          <li>Ensure all text is readable and documents are not expired</li>
          <li>Documents must be valid and issued by recognized authorities</li>
          <li>Verification typically takes 1-3 business days</li>
          <li>You will be notified once your documents are reviewed</li>
        </ul>
      </div>
    </div>
  );
};

