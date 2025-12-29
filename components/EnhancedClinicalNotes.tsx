import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Plus, 
  Edit, 
  Trash2, 
  Save,
  X,
  Mic,
  Download,
  Search,
  Calendar,
  User,
  Stethoscope
} from 'lucide-react';
import { useNotification } from './NotificationSystem';
import { useAuth } from '../contexts/AuthContext';
import { EmptyState } from './EmptyState';
import { SkeletonLoader } from './SkeletonLoader';
import { handleError } from '../utils/errorHandler';
import { exportToPDF } from '../utils/pdfExport';

interface SOAPNote {
  id: string;
  patientId: string;
  patientName: string;
  date: string;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  templates?: string[];
  createdAt: string;
  updatedAt: string;
}

export const EnhancedClinicalNotes: React.FC = () => {
  const { notify } = useNotification();
  const { user } = useAuth();
  const [notes, setNotes] = useState<SOAPNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingNote, setEditingNote] = useState<SOAPNote | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isRecording, setIsRecording] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    patientId: '',
    patientName: '',
    subjective: '',
    objective: '',
    assessment: '',
    plan: '',
  });

  useEffect(() => {
    loadNotes();
  }, []);

  const loadNotes = async () => {
    try {
      setLoading(true);
      const data = await (db as any).getClinicalNotes?.(user?.id || '') || [];
      setNotes(data);
    } catch (error) {
      handleError(error, notify);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.patientId || !formData.subjective || !formData.objective || !formData.assessment || !formData.plan) {
      notify('Please fill in all SOAP sections', 'warning');
      return;
    }

    try {
      const noteData: SOAPNote = {
        id: editingNote?.id || Date.now().toString(),
        patientId: formData.patientId,
        patientName: formData.patientName,
        date: new Date().toISOString(),
        subjective: formData.subjective,
        objective: formData.objective,
        assessment: formData.assessment,
        plan: formData.plan,
        createdAt: editingNote?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      if (editingNote) {
        await (db as any).updateClinicalNote?.(noteData);
        notify('Clinical note updated successfully', 'success');
      } else {
        await (db as any).createClinicalNote?.(noteData);
        notify('Clinical note created successfully', 'success');
      }

      setShowForm(false);
      setEditingNote(null);
      resetForm();
      loadNotes();
    } catch (error) {
      handleError(error, notify);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this clinical note?')) return;

    try {
      await (db as any).deleteClinicalNote?.(id);
      notify('Clinical note deleted', 'success');
      loadNotes();
    } catch (error) {
      handleError(error, notify);
    }
  };

  const handleVoiceInput = async () => {
    if (!('webkitSpeechRecognition' in window)) {
      notify('Voice input not supported in this browser', 'warning');
      return;
    }

    setIsRecording(true);
    // Voice recognition implementation would go here
    // For now, just a placeholder
    setTimeout(() => {
      setIsRecording(false);
      notify('Voice input feature coming soon', 'info');
    }, 2000);
  };

  const handleExportPDF = async (note: SOAPNote) => {
    try {
      const html = `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h1>Clinical Note - ${note.patientName}</h1>
          <p><strong>Date:</strong> ${new Date(note.date).toLocaleDateString()}</p>
          <h2>Subjective</h2>
          <p>${note.subjective}</p>
          <h2>Objective</h2>
          <p>${note.objective}</p>
          <h2>Assessment</h2>
          <p>${note.assessment}</p>
          <h2>Plan</h2>
          <p>${note.plan}</p>
        </div>
      `;
      await exportToPDF(html, `clinical-note-${note.id}.pdf`);
      notify('PDF exported successfully', 'success');
    } catch (error) {
      handleError(error, notify);
    }
  };

  const resetForm = () => {
    setFormData({
      patientId: '',
      patientName: '',
      subjective: '',
      objective: '',
      assessment: '',
      plan: '',
    });
  };

  const filteredNotes = notes.filter(note =>
    note.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    note.subjective.toLowerCase().includes(searchQuery.toLowerCase()) ||
    note.assessment.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return <SkeletonLoader type="table" count={5} />;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Clinical Notes (SOAP)</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Document patient encounters with SOAP notes</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setEditingNote(null);
            setShowForm(true);
          }}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg flex items-center gap-2 transition-colors"
        >
          <Plus size={20} />
          New Note
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search notes by patient, subjective, or assessment..."
          className="w-full pl-12 pr-4 py-3 bg-white dark:bg-[#0F172A] border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
        />
      </div>

      {/* Notes List */}
      <div className="bg-white dark:bg-[#0F172A] rounded-3xl border border-gray-100 dark:border-gray-700/50 overflow-hidden">
        {filteredNotes.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No clinical notes"
            description={searchQuery ? "Try adjusting your search" : "Create your first SOAP note"}
            action={
              <button
                onClick={() => setShowForm(true)}
                className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors"
              >
                Create Note
              </button>
            }
          />
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredNotes.map(note => (
              <div key={note.id} className="p-6 hover:bg-gray-50 dark:hover:bg-[#0A0F1C] transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white">{note.patientName}</h3>
                      <span className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                        <Calendar size={14} />
                        {new Date(note.date).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500 dark:text-gray-400 font-bold">S:</span>
                        <p className="text-gray-900 dark:text-white mt-1 line-clamp-2">{note.subjective}</p>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400 font-bold">O:</span>
                        <p className="text-gray-900 dark:text-white mt-1 line-clamp-2">{note.objective}</p>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400 font-bold">A:</span>
                        <p className="text-gray-900 dark:text-white mt-1 line-clamp-2">{note.assessment}</p>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400 font-bold">P:</span>
                        <p className="text-gray-900 dark:text-white mt-1 line-clamp-2">{note.plan}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => handleExportPDF(note)}
                      className="p-2 text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                      title="Export PDF"
                    >
                      <Download size={18} />
                    </button>
                    <button
                      onClick={() => {
                        setEditingNote(note);
                        setFormData({
                          patientId: note.patientId,
                          patientName: note.patientName,
                          subjective: note.subjective,
                          objective: note.objective,
                          assessment: note.assessment,
                          plan: note.plan,
                        });
                        setShowForm(true);
                      }}
                      className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Edit size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(note.id)}
                      className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Note Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300 overflow-y-auto">
          <div className="bg-white dark:bg-[#0F172A] rounded-3xl shadow-2xl max-w-4xl w-full my-8 animate-in zoom-in-95 duration-300">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {editingNote ? 'Edit Clinical Note' : 'New SOAP Note'}
              </h2>
              <button
                onClick={() => {
                  setShowForm(false);
                  setEditingNote(null);
                  resetForm();
                }}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              {/* Patient Info */}
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

              {/* SOAP Sections */}
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">
                      Subjective (S) *
                    </label>
                    <button
                      onClick={handleVoiceInput}
                      className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors ${
                        isRecording
                          ? 'bg-red-600 text-white'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                      } flex items-center gap-1`}
                    >
                      <Mic size={14} />
                      {isRecording ? 'Recording...' : 'Voice Input'}
                    </button>
                  </div>
                  <textarea
                    value={formData.subjective}
                    onChange={(e) => setFormData({ ...formData, subjective: e.target.value })}
                    rows={4}
                    placeholder="Patient's description of symptoms, history, concerns..."
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-[#0A0F1C] border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                    Objective (O) *
                  </label>
                  <textarea
                    value={formData.objective}
                    onChange={(e) => setFormData({ ...formData, objective: e.target.value })}
                    rows={4}
                    placeholder="Observable findings, vital signs, examination results..."
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-[#0A0F1C] border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                    Assessment (A) *
                  </label>
                  <textarea
                    value={formData.assessment}
                    onChange={(e) => setFormData({ ...formData, assessment: e.target.value })}
                    rows={4}
                    placeholder="Diagnosis, differential diagnosis, clinical impression..."
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-[#0A0F1C] border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                    Plan (P) *
                  </label>
                  <textarea
                    value={formData.plan}
                    onChange={(e) => setFormData({ ...formData, plan: e.target.value })}
                    rows={4}
                    placeholder="Treatment plan, medications, follow-up, patient education..."
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-[#0A0F1C] border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
                  />
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-4">
              <button
                onClick={() => {
                  setShowForm(false);
                  setEditingNote(null);
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
                {editingNote ? 'Update Note' : 'Save Note'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import { db } from '../services/db';

