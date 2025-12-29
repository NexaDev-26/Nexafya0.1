import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Plus, 
  Edit, 
  Trash2, 
  Save, 
  X,
  Search,
  Printer,
  Download,
  CheckCircle,
  AlertCircle,
  User,
  Pill,
  Calendar,
  Clock
} from 'lucide-react';
import { Prescription, Medicine } from '../types';
import { db } from '../services/db';
import { useNotification } from './NotificationSystem';
import { useAuth } from '../contexts/AuthContext';
import { EmptyState } from './EmptyState';
import { SkeletonLoader } from './SkeletonLoader';
import { handleError } from '../utils/errorHandler';

interface PrescriptionItem {
  medicineId: string;
  medicineName: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
  quantity: number;
}

interface EPrescription extends Prescription {
  items: PrescriptionItem[];
  digitalSignature?: string;
  qrCode?: string;
  status: 'DRAFT' | 'SIGNED' | 'SENT' | 'FULFILLED';
}

export const EPrescription: React.FC = () => {
  const { notify } = useNotification();
  const { user } = useAuth();
  const [prescriptions, setPrescriptions] = useState<EPrescription[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPrescription, setEditingPrescription] = useState<EPrescription | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    patientId: '',
    patientName: '',
    items: [] as PrescriptionItem[],
    notes: '',
    diagnosis: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const prescriptionsData = await db.getPrescriptions?.(user?.id || '') || [];
      setPrescriptions(prescriptionsData);
      
      const medicinesData = await db.getMedicines();
      setMedicines(medicinesData);
    } catch (error) {
      handleError(error, notify);
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = () => {
    const newItem: PrescriptionItem = {
      medicineId: '',
      medicineName: '',
      dosage: '',
      frequency: '',
      duration: '',
      instructions: '',
      quantity: 1,
    };
    setFormData({
      ...formData,
      items: [...formData.items, newItem],
    });
  };

  const handleItemChange = (index: number, field: keyof PrescriptionItem, value: any) => {
    const items = [...formData.items];
    items[index] = {
      ...items[index],
      [field]: value,
    };

    // If medicine selected, update name
    if (field === 'medicineId') {
      const medicine = medicines.find(m => m.id === value);
      if (medicine) {
        items[index].medicineName = medicine.name;
      }
    }

    setFormData({ ...formData, items });
  };

  const handleRemoveItem = (index: number) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index),
    });
  };

  const handleSubmit = async () => {
    if (!formData.patientId || formData.items.length === 0) {
      notify('Please fill in patient and add at least one medication', 'warning');
      return;
    }

    try {
      const prescriptionData: EPrescription = {
        id: editingPrescription?.id || Date.now().toString(),
        doctorId: user?.id || '',
        doctorName: user?.name || '',
        patientId: formData.patientId,
        patientName: formData.patientName,
        items: formData.items.map(item => ({
          medicineId: item.medicineId,
          name: item.medicineName,
          dosage: item.dosage,
          frequency: item.frequency,
          duration: item.duration,
          instructions: item.instructions,
        })),
        date: new Date().toISOString(),
        status: 'DRAFT',
        notes: formData.notes,
        diagnosis: formData.diagnosis,
      };

      if (editingPrescription) {
        await db.updatePrescription?.(prescriptionData);
        notify('Prescription updated successfully', 'success');
      } else {
        await db.createPrescription?.(prescriptionData);
        notify('Prescription created successfully', 'success');
      }

      setShowForm(false);
      setEditingPrescription(null);
      resetForm();
      loadData();
    } catch (error) {
      handleError(error, notify);
    }
  };

  const handleSign = async (prescriptionId: string) => {
    try {
      // Generate digital signature
      const signature = `SIGNED-${Date.now()}-${user?.id}`;
      
      // Update prescription with signature
      const prescription = prescriptions.find(p => p.id === prescriptionId);
      if (prescription) {
        const updated = {
          ...prescription,
          digitalSignature: signature,
          status: 'SIGNED' as const,
        };
        await db.updatePrescription?.(updated);
        notify('Prescription signed successfully', 'success');
        loadData();
      }
    } catch (error) {
      handleError(error, notify);
    }
  };

  const handleSendToPharmacy = async (prescriptionId: string) => {
    try {
      const prescription = prescriptions.find(p => p.id === prescriptionId);
      if (prescription) {
        const updated = {
          ...prescription,
          status: 'SENT' as const,
        };
        await db.updatePrescription?.(updated);
        notify('Prescription sent to pharmacy', 'success');
        loadData();
      }
    } catch (error) {
      handleError(error, notify);
    }
  };

  const handlePrint = (prescription: EPrescription) => {
    // Generate printable version
    window.print();
  };

  const handleDownloadPDF = async (prescription: EPrescription) => {
    // Generate PDF
    notify('PDF download feature coming soon', 'info');
  };

  const resetForm = () => {
    setFormData({
      patientId: '',
      patientName: '',
      items: [],
      notes: '',
      diagnosis: '',
    });
  };

  const filteredPrescriptions = prescriptions.filter(p =>
    p.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.diagnosis?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SIGNED':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'SENT':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'FULFILLED':
        return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  if (loading) {
    return <SkeletonLoader type="table" count={5} />;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">E-Prescriptions</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Create and manage digital prescriptions</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setEditingPrescription(null);
            setShowForm(true);
          }}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg flex items-center gap-2 transition-colors"
        >
          <Plus size={20} />
          New Prescription
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search prescriptions..."
          className="w-full pl-12 pr-4 py-3 bg-white dark:bg-[#0F172A] border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
        />
      </div>

      {/* Prescriptions List */}
      <div className="bg-white dark:bg-[#0F172A] rounded-3xl border border-gray-100 dark:border-gray-700/50 overflow-hidden">
        {filteredPrescriptions.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No prescriptions"
            description={searchQuery ? "Try adjusting your search" : "Create your first e-prescription"}
            action={
              <button
                onClick={() => setShowForm(true)}
                className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors"
              >
                Create Prescription
              </button>
            }
          />
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredPrescriptions.map(prescription => (
              <div key={prescription.id} className="p-6 hover:bg-gray-50 dark:hover:bg-[#0A0F1C] transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                        {prescription.patientName}
                      </h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(prescription.status)}`}>
                        {prescription.status}
                      </span>
                      {prescription.digitalSignature && (
                        <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-xs font-bold flex items-center gap-1">
                          <CheckCircle size={12} />
                          Signed
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-3">
                      <span className="flex items-center gap-1">
                        <Calendar size={14} />
                        {new Date(prescription.date).toLocaleDateString()}
                      </span>
                      {prescription.diagnosis && (
                        <>
                          <span>•</span>
                          <span>Diagnosis: {prescription.diagnosis}</span>
                        </>
                      )}
                      <span>•</span>
                      <span>{prescription.items.length} medication(s)</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {prescription.items.slice(0, 3).map((item, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg text-sm"
                        >
                          {item.name || item.medicineName}
                        </span>
                      ))}
                      {prescription.items.length > 3 && (
                        <span className="px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg text-sm">
                          +{prescription.items.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    {prescription.status === 'DRAFT' && (
                      <button
                        onClick={() => handleSign(prescription.id)}
                        className="px-4 py-2 text-sm font-bold text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors flex items-center gap-2"
                      >
                        <CheckCircle size={16} />
                        Sign
                      </button>
                    )}
                    {prescription.status === 'SIGNED' && (
                      <button
                        onClick={() => handleSendToPharmacy(prescription.id)}
                        className="px-4 py-2 text-sm font-bold text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors flex items-center gap-2"
                      >
                        Send to Pharmacy
                      </button>
                    )}
                    <button
                      onClick={() => handlePrint(prescription)}
                      className="p-2 text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                      title="Print"
                    >
                      <Printer size={18} />
                    </button>
                    <button
                      onClick={() => handleDownloadPDF(prescription)}
                      className="p-2 text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                      title="Download PDF"
                    >
                      <Download size={18} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Prescription Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300 overflow-y-auto">
          <div className="bg-white dark:bg-[#0F172A] rounded-3xl shadow-2xl max-w-4xl w-full my-8 animate-in zoom-in-95 duration-300">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {editingPrescription ? 'Edit Prescription' : 'New Prescription'}
              </h2>
              <button
                onClick={() => {
                  setShowForm(false);
                  setEditingPrescription(null);
                  resetForm();
                }}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              {/* Patient Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                    Patient Name *
                  </label>
                  <input
                    type="text"
                    value={formData.patientName}
                    onChange={(e) => setFormData({ ...formData, patientName: e.target.value })}
                    placeholder="Enter patient name"
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-[#0A0F1C] border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                    Diagnosis
                  </label>
                  <input
                    type="text"
                    value={formData.diagnosis}
                    onChange={(e) => setFormData({ ...formData, diagnosis: e.target.value })}
                    placeholder="e.g., Upper respiratory infection"
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-[#0A0F1C] border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Medications */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">
                    Medications *
                  </label>
                  <button
                    onClick={handleAddItem}
                    className="px-4 py-2 text-sm font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors flex items-center gap-2"
                  >
                    <Plus size={16} />
                    Add Medication
                  </button>
                </div>

                <div className="space-y-4">
                  {formData.items.map((item, index) => (
                    <div key={index} className="p-4 bg-gray-50 dark:bg-[#0A0F1C] rounded-xl border border-gray-200 dark:border-gray-700">
                      <div className="flex items-start justify-between mb-4">
                        <h4 className="font-bold text-gray-900 dark:text-white">Medication {index + 1}</h4>
                        <button
                          onClick={() => handleRemoveItem(index)}
                          className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        >
                          <X size={18} />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">
                            Medicine *
                          </label>
                          <select
                            value={item.medicineId}
                            onChange={(e) => handleItemChange(index, 'medicineId', e.target.value)}
                            className="w-full px-3 py-2 bg-white dark:bg-[#0F172A] border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white"
                          >
                            <option value="">Select medicine</option>
                            {medicines.map(med => (
                              <option key={med.id} value={med.id}>{med.name}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">
                            Dosage *
                          </label>
                          <input
                            type="text"
                            value={item.dosage}
                            onChange={(e) => handleItemChange(index, 'dosage', e.target.value)}
                            placeholder="e.g., 500mg"
                            className="w-full px-3 py-2 bg-white dark:bg-[#0F172A] border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">
                            Frequency *
                          </label>
                          <select
                            value={item.frequency}
                            onChange={(e) => handleItemChange(index, 'frequency', e.target.value)}
                            className="w-full px-3 py-2 bg-white dark:bg-[#0F172A] border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white"
                          >
                            <option value="">Select frequency</option>
                            <option value="Once daily">Once daily</option>
                            <option value="Twice daily">Twice daily</option>
                            <option value="Three times daily">Three times daily</option>
                            <option value="Four times daily">Four times daily</option>
                            <option value="As needed">As needed</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">
                            Duration *
                          </label>
                          <input
                            type="text"
                            value={item.duration}
                            onChange={(e) => handleItemChange(index, 'duration', e.target.value)}
                            placeholder="e.g., 7 days"
                            className="w-full px-3 py-2 bg-white dark:bg-[#0F172A] border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">
                          Instructions
                        </label>
                        <textarea
                          value={item.instructions}
                          onChange={(e) => handleItemChange(index, 'instructions', e.target.value)}
                          rows={2}
                          placeholder="e.g., Take with food"
                          className="w-full px-3 py-2 bg-white dark:bg-[#0F172A] border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {formData.items.length === 0 && (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    No medications added. Click "Add Medication" to start.
                  </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                  Additional Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-[#0A0F1C] border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
                  placeholder="Additional notes or instructions..."
                />
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-4">
              <button
                onClick={() => {
                  setShowForm(false);
                  setEditingPrescription(null);
                  resetForm();
                }}
                className="px-6 py-3 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl font-bold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg transition-colors flex items-center gap-2"
              >
                <Save size={18} />
                {editingPrescription ? 'Update Prescription' : 'Create Prescription'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

