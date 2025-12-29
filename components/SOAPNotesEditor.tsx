import React, { useState } from 'react';
import { FileText, Save, Download, QrCode, Pill, Plus, X, Printer, Check } from 'lucide-react';
import { useNotification } from './NotificationSystem';
import { useAuth } from '../contexts/AuthContext';
import { addDoc, collection, serverTimestamp, updateDoc, doc } from 'firebase/firestore';
import { db as firestore } from '../lib/firebase';
import QRCode from 'qrcode';

interface SOAPNotesProps {
  appointmentId: string;
  patientId: string;
  patientName: string;
  onComplete?: () => void;
}

interface PrescriptionItem {
  medication: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
}

interface SOAPData {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
}

export const SOAPNotesEditor: React.FC<SOAPNotesProps> = ({
  appointmentId,
  patientId,
  patientName,
  onComplete
}) => {
  const { user } = useAuth();
  const { notify } = useNotification();

  const [soapNotes, setSOAPNotes] = useState<SOAPData>({
    subjective: '',
    objective: '',
    assessment: '',
    plan: ''
  });

  const [prescriptions, setPrescriptions] = useState<PrescriptionItem[]>([]);
  const [newRx, setNewRx] = useState<PrescriptionItem>({
    medication: '',
    dosage: '',
    frequency: 'Twice daily',
    duration: '7 days',
    instructions: ''
  });

  const [showPrescriptionPreview, setShowPrescriptionPreview] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [saving, setSaving] = useState(false);

  const addPrescription = () => {
    if (!newRx.medication || !newRx.dosage) {
      notify('Please enter medication name and dosage', 'warning');
      return;
    }

    setPrescriptions([...prescriptions, newRx]);
    setNewRx({
      medication: '',
      dosage: '',
      frequency: 'Twice daily',
      duration: '7 days',
      instructions: ''
    });
  };

  const removePrescription = (index: number) => {
    setPrescriptions(prescriptions.filter((_, i) => i !== index));
  };

  const generatePrescriptionQR = async (prescriptionId: string): Promise<string> => {
    const qrData = {
      prescriptionId,
      patientId,
      doctorId: user?.id,
      timestamp: new Date().toISOString(),
      items: prescriptions.map(p => ({
        med: p.medication,
        dose: p.dosage,
        freq: p.frequency,
        dur: p.duration
      }))
    };

    try {
      const qrUrl = await QRCode.toDataURL(JSON.stringify(qrData), {
        width: 300,
        margin: 2,
        color: {
          dark: '#0066CC',
          light: '#FFFFFF'
        }
      });
      return qrUrl;
    } catch (error) {
      console.error('Failed to generate QR code:', error);
      return '';
    }
  };

  const handleEndConsultation = async () => {
    if (!soapNotes.assessment || !soapNotes.plan) {
      notify('Please complete Assessment and Plan sections', 'error');
      return;
    }

    setSaving(true);

    try {
      // 1. Save SOAP notes to appointment
      const appointmentRef = doc(firestore, 'appointments', appointmentId);
      const combinedNotes = `SUBJECTIVE:\n${soapNotes.subjective}\n\nOBJECTIVE:\n${soapNotes.objective}\n\nASSESSMENT:\n${soapNotes.assessment}\n\nPLAN:\n${soapNotes.plan}`;
      
      await updateDoc(appointmentRef, {
        status: 'COMPLETED',
        soapNotes: combinedNotes,
        completedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // 2. Create health record entry
      await addDoc(collection(firestore, 'healthRecords'), {
        userId: patientId,
        patientId,
        doctorId: user?.id,
        doctorName: user?.name,
        appointmentId,
        type: 'CONSULTATION',
        title: `Consultation - ${new Date().toLocaleDateString()}`,
        description: soapNotes.assessment,
        soapNotes: {
          subjective: soapNotes.subjective,
          objective: soapNotes.objective,
          assessment: soapNotes.assessment,
          plan: soapNotes.plan
        },
        recordedAt: serverTimestamp(),
        createdAt: serverTimestamp()
      });

      // 3. Generate and save prescription if exists
      if (prescriptions.length > 0) {
        const prescriptionDoc = await addDoc(collection(firestore, 'prescriptions'), {
          patientId,
          patientName,
          doctorId: user?.id,
          doctorName: user?.name,
          appointmentId,
          items: prescriptions,
          status: 'ACTIVE',
          createdAt: serverTimestamp(),
          expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) // 90 days validity
        });

        // Generate QR code for prescription
        const qrUrl = await generatePrescriptionQR(prescriptionDoc.id);
        setQrCodeUrl(qrUrl);

        // Update prescription with QR code
        await updateDoc(doc(firestore, 'prescriptions', prescriptionDoc.id), {
          qrCode: qrUrl
        });

        setShowPrescriptionPreview(true);
      }

      notify('Consultation completed successfully!', 'success');
      
      if (!showPrescriptionPreview && onComplete) {
        onComplete();
      }

    } catch (error) {
      console.error('Failed to save consultation:', error);
      notify('Failed to save consultation', 'error');
    } finally {
      setSaving(false);
    }
  };

  const printPrescription = () => {
    window.print();
  };

  const downloadPrescription = () => {
    // Create prescription document
    const prescriptionHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Prescription - ${patientName}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; }
            .header { text-align: center; border-bottom: 2px solid #0066CC; padding-bottom: 20px; margin-bottom: 30px; }
            .header h1 { color: #0066CC; margin: 0; }
            .section { margin: 20px 0; }
            .section h2 { color: #333; border-bottom: 1px solid #ddd; padding-bottom: 10px; }
            .rx-item { margin: 15px 0; padding: 15px; background: #f8f9fa; border-left: 4px solid #00A86B; }
            .qr-code { text-align: center; margin-top: 30px; }
            .footer { margin-top: 40px; text-align: center; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>NexaFya Telemedicine</h1>
            <p>Digital Prescription</p>
          </div>
          
          <div class="section">
            <h2>Patient Information</h2>
            <p><strong>Name:</strong> ${patientName}</p>
            <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
            <p><strong>Doctor:</strong> ${user?.name}</p>
          </div>

          <div class="section">
            <h2>Prescriptions</h2>
            ${prescriptions.map((rx, i) => `
              <div class="rx-item">
                <p><strong>${i + 1}. ${rx.medication}</strong></p>
                <p>Dosage: ${rx.dosage}</p>
                <p>Frequency: ${rx.frequency}</p>
                <p>Duration: ${rx.duration}</p>
                ${rx.instructions ? `<p>Instructions: ${rx.instructions}</p>` : ''}
              </div>
            `).join('')}
          </div>

          ${qrCodeUrl ? `
            <div class="qr-code">
              <h2>Digital Verification</h2>
              <img src="${qrCodeUrl}" alt="Prescription QR Code" />
              <p>Scan this QR code at any NexaFya partner pharmacy</p>
            </div>
          ` : ''}

          <div class="footer">
            <p>This is a digital prescription issued through NexaFya Telemedicine Platform</p>
            <p>For verification, contact: support@nexafya.com</p>
          </div>
        </body>
      </html>
    `;

    const blob = new Blob([prescriptionHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `prescription-${patientName}-${Date.now()}.html`;
    a.click();
    URL.revokeObjectURL(url);
    
    notify('Prescription downloaded successfully', 'success');
  };

  if (showPrescriptionPreview) {
    return (
      <div className="bg-white dark:bg-[#0F172A] rounded-3xl p-8 max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="text-green-600" size={32} />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Consultation Completed!
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Digital prescription generated for {patientName}
          </p>
        </div>

        {qrCodeUrl && (
          <div className="bg-gray-50 dark:bg-[#0A0F1C] rounded-2xl p-6 mb-6">
            <h3 className="font-bold text-lg mb-4 text-center">Digital Prescription QR Code</h3>
            <div className="flex justify-center mb-4">
              <img src={qrCodeUrl} alt="Prescription QR" className="rounded-xl shadow-lg" />
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
              Patient can present this QR code at any NexaFya partner pharmacy
            </p>
          </div>
        )}

        <div className="space-y-3">
          <button
            onClick={printPrescription}
            className="w-full btn-primary flex items-center justify-center gap-2"
          >
            <Printer size={20} /> Print Prescription
          </button>
          <button
            onClick={downloadPrescription}
            className="w-full btn-secondary flex items-center justify-center gap-2"
          >
            <Download size={20} /> Download Prescription
          </button>
          <button
            onClick={onComplete}
            className="w-full btn-outline"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-[#0F172A] rounded-3xl p-6 space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto">
      <div className="flex items-center justify-between sticky top-0 bg-white dark:bg-[#0F172A] pb-4 border-b border-gray-200 dark:border-gray-700 z-10">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Clinical Workspace</h2>
          <p className="text-sm text-gray-500">Patient: {patientName}</p>
        </div>
        <button
          onClick={handleEndConsultation}
          disabled={saving}
          className="btn-primary flex items-center gap-2"
        >
          {saving ? (
            <>
              <div className="spinner w-5 h-5" />
              Saving...
            </>
          ) : (
            <>
              <Save size={20} />
              End Consultation
            </>
          )}
        </button>
      </div>

      {/* SOAP Notes Sections */}
      <div className="space-y-6">
        {/* Subjective */}
        <div className="card-medical">
          <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
            📝 SUBJECTIVE (Patient's Story)
          </label>
          <textarea
            value={soapNotes.subjective}
            onChange={(e) => setSOAPNotes({ ...soapNotes, subjective: e.target.value })}
            className="input-medical min-h-[100px]"
            placeholder="What is the patient telling you? Chief complaint, symptoms, history..."
          />
        </div>

        {/* Objective */}
        <div className="card-medical">
          <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
            🔍 OBJECTIVE (Your Observations)
          </label>
          <textarea
            value={soapNotes.objective}
            onChange={(e) => setSOAPNotes({ ...soapNotes, objective: e.target.value })}
            className="input-medical min-h-[100px]"
            placeholder="Vital signs, physical examination findings, test results..."
          />
        </div>

        {/* Assessment */}
        <div className="card-medical">
          <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
            🎯 ASSESSMENT (Your Diagnosis) *
          </label>
          <textarea
            value={soapNotes.assessment}
            onChange={(e) => setSOAPNotes({ ...soapNotes, assessment: e.target.value })}
            className="input-medical min-h-[100px]"
            placeholder="Diagnosis, differential diagnosis, clinical impression..."
            required
          />
        </div>

        {/* Plan */}
        <div className="card-medical">
          <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
            📋 PLAN (Treatment Plan) *
          </label>
          <textarea
            value={soapNotes.plan}
            onChange={(e) => setSOAPNotes({ ...soapNotes, plan: e.target.value })}
            className="input-medical min-h-[100px]"
            placeholder="Treatment plan, medications, follow-up, patient education..."
            required
          />
        </div>
      </div>

      {/* Prescription Builder */}
      <div className="card-medical bg-nexafya-green/5 border-2 border-nexafya-green/20">
        <div className="flex items-center gap-2 mb-4">
          <Pill className="text-nexafya-green" size={24} />
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Prescription Builder</h3>
        </div>

        {/* Current Prescriptions */}
        {prescriptions.length > 0 && (
          <div className="space-y-3 mb-4">
            {prescriptions.map((rx, index) => (
              <div key={index} className="bg-white dark:bg-[#0F172A] rounded-xl p-4 flex justify-between items-start">
                <div className="flex-1">
                  <p className="font-bold text-gray-900 dark:text-white">{rx.medication}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {rx.dosage} | {rx.frequency} | {rx.duration}
                  </p>
                  {rx.instructions && (
                    <p className="text-xs text-gray-500 mt-1">{rx.instructions}</p>
                  )}
                </div>
                <button
                  onClick={() => removePrescription(index)}
                  className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add New Prescription */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <input
              type="text"
              value={newRx.medication}
              onChange={(e) => setNewRx({ ...newRx, medication: e.target.value })}
              className="input-medical"
              placeholder="Medication name"
            />
          </div>
          <input
            type="text"
            value={newRx.dosage}
            onChange={(e) => setNewRx({ ...newRx, dosage: e.target.value })}
            className="input-medical"
            placeholder="Dosage (e.g., 500mg)"
          />
          <select
            value={newRx.frequency}
            onChange={(e) => setNewRx({ ...newRx, frequency: e.target.value })}
            className="input-medical"
          >
            <option>Once daily</option>
            <option>Twice daily</option>
            <option>Three times daily</option>
            <option>Four times daily</option>
            <option>Every 6 hours</option>
            <option>As needed</option>
          </select>
          <input
            type="text"
            value={newRx.duration}
            onChange={(e) => setNewRx({ ...newRx, duration: e.target.value })}
            className="input-medical"
            placeholder="Duration (e.g., 7 days)"
          />
          <div className="md:col-span-2">
            <input
              type="text"
              value={newRx.instructions}
              onChange={(e) => setNewRx({ ...newRx, instructions: e.target.value })}
              className="input-medical"
              placeholder="Special instructions (optional)"
            />
          </div>
          <div className="md:col-span-2">
            <button
              onClick={addPrescription}
              className="w-full btn-secondary flex items-center justify-center gap-2"
            >
              <Plus size={20} />
              Add to Prescription
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

