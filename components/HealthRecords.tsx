import React, { useState, useRef, useEffect } from 'react';
import { HealthRecord } from '../types';
import { FileText, Download, Share2, Upload, Search, Eye, Clock, Loader2, Lock } from 'lucide-react';
import { useNotification } from './NotificationSystem';
import { db } from '../services/db'; 
import { useAuth } from '../contexts/AuthContext'; 
import { storage } from '../lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'; 

interface HealthRecordsProps {
    records?: HealthRecord[];
    onAddRecord?: (record: HealthRecord) => void;
}

export const HealthRecords: React.FC<HealthRecordsProps> = ({ 
    records = [], 
    onAddRecord 
}) => {
  const { user } = useAuth();
  const { notify } = useNotification();
  const [searchTerm, setSearchTerm] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleViewFile = async (record: HealthRecord) => {
      try {
          // If fileUrl is a Firebase Storage path, get download URL
          if (record.fileUrl.startsWith('health-records/') || record.fileUrl.startsWith('private/')) {
              const storageRef = ref(storage, record.fileUrl);
              const url = await getDownloadURL(storageRef);
              window.open(url, '_blank');
          } else {
              window.open(record.fileUrl, '_blank');
          }
      } catch (err: any) {
          notify(`Could not access document: ${err.message}`, 'error');
      }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && user) {
          try {
              setIsUploading(true);
              notify(`Uploading secure document...`, 'info');
              
              const fileExt = file.name.split('.').pop() || 'pdf';
              const filePath = `health-records/${user.id}/${Date.now()}_${file.name}`;

              const storageRef = ref(storage, filePath);
              await uploadBytes(storageRef, file);
              const fileUrl = await getDownloadURL(storageRef);

              const newRecord: HealthRecord = {
                  id: Date.now().toString(),
                  type: 'Lab Result', 
                  title: file.name,
                  doctor: 'Self Upload',
                  date: new Date().toISOString().split('T')[0],
                  fileUrl: fileUrl, // Store the download URL
                  status: 'Active'
              };
              
              await db.createHealthRecord(user.id, newRecord);
              if (onAddRecord) onAddRecord(newRecord);

              notify('Document saved securely in your private vault.', 'success');
          } catch (error: any) {
              notify(`Upload failed: ${error.message}`, 'error');
          } finally {
              setIsUploading(false);
          }
      }
  };

  const filteredRecords = records.filter(r => 
      r.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Health Vault</h2>
          <p className="text-gray-500">Your private, encrypted medical documents.</p>
        </div>
        
        <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg hover:bg-blue-700 disabled:opacity-50"
        >
            {isUploading ? <Loader2 className="animate-spin" size={18}/> : <Upload size={18} />} 
            Upload Private File
        </button>
        <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} />
      </div>

      <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
              type="text" 
              placeholder="Search vault..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white dark:bg-[#0F172A] border border-gray-200 dark:border-gray-700 rounded-xl outline-none"
          />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRecords.map(record => (
              <div key={record.id} className="bg-white dark:bg-[#0F172A] p-6 rounded-[2rem] shadow-sm border border-gray-100 dark:border-gray-700 group hover:shadow-md transition-all">
                  <div className="flex justify-between items-start mb-4">
                      <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600">
                          <FileText size={24} />
                      </div>
                      <span className="flex items-center gap-1 bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase px-2 py-0.5 rounded-full">
                         <Lock size={10}/> {record.status}
                      </span>
                  </div>
                  
                  <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-1">{record.title}</h3>
                  <p className="text-sm text-gray-500 mb-4">{record.doctor}</p>
                  
                  <div className="flex items-center gap-2 text-xs text-gray-400 mb-6">
                      <Clock size={12} /> {record.date}
                  </div>

                  <div className="flex gap-2 pt-4 border-t border-gray-100 dark:border-gray-700">
                      <button 
                        onClick={() => handleViewFile(record)}
                        className="flex-1 py-2.5 text-xs font-bold text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 rounded-lg flex items-center justify-center gap-2 hover:bg-gray-100"
                      >
                          <Eye size={16} /> View Securely
                      </button>
                      <button className="p-2.5 text-gray-400 hover:text-blue-600 bg-gray-50 dark:bg-gray-700 rounded-lg">
                          <Share2 size={16} />
                      </button>
                  </div>
              </div>
          ))}
      </div>
    </div>
  );
};