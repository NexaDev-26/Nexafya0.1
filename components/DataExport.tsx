import React, { useState, useEffect } from 'react';
import { Download, FileText, Users, DollarSign, Calendar, Database } from 'lucide-react';
import { useNotification } from './NotificationSystem';
import { useAuth } from '../contexts/AuthContext';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db as firestore } from '../lib/firebase';

interface ExportOption {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  collection: string;
}

export const DataExport: React.FC = () => {
  const { user } = useAuth();
  const { notify } = useNotification();
  const [exporting, setExporting] = useState<string | null>(null);

  const exportOptions: ExportOption[] = [
    {
      id: 'users',
      name: 'Users',
      description: 'Export all user data',
      icon: <Users size={24} className="text-blue-600" />,
      collection: 'users',
    },
    {
      id: 'transactions',
      name: 'Transactions',
      description: 'Export all transaction records',
      icon: <DollarSign size={24} className="text-emerald-600" />,
      collection: 'transactions',
    },
    {
      id: 'appointments',
      name: 'Appointments',
      description: 'Export all appointment records',
      icon: <Calendar size={24} className="text-purple-600" />,
      collection: 'appointments',
    },
    {
      id: 'orders',
      name: 'Orders',
      description: 'Export all order records',
      icon: <FileText size={24} className="text-amber-600" />,
      collection: 'orders',
    },
  ];

  const convertToCSV = (data: any[], headers: string[]): string => {
    const csvRows = [
      headers.join(','),
      ...data.map(row =>
        headers.map(header => {
          const value = row[header] || '';
          // Handle nested objects and dates
          if (value && typeof value === 'object') {
            if (value.toDate) {
              return value.toDate().toISOString();
            }
            return JSON.stringify(value);
          }
          // Escape commas and quotes
          return `"${String(value).replace(/"/g, '""')}"`;
        }).join(',')
      )
    ];
    return csvRows.join('\n');
  };

  const handleExport = async (option: ExportOption) => {
    if (!user || user.role !== 'ADMIN') {
      notify('Access denied', 'error');
      return;
    }

    setExporting(option.id);
    try {
      const collectionRef = collection(firestore, option.collection);
      const snapshot = await getDocs(query(collectionRef, orderBy('createdAt', 'desc')));
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Define headers based on collection type
      let headers: string[] = [];
      if (data.length > 0) {
        headers = Object.keys(data[0]);
      }

      // Convert to CSV
      const csv = convertToCSV(data, headers);

      // Create download
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${option.collection}-export-${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      window.URL.revokeObjectURL(url);

      notify(`${option.name} exported successfully`, 'success');
    } catch (error) {
      console.error(`Failed to export ${option.name}:`, error);
      notify(`Failed to export ${option.name}`, 'error');
    } finally {
      setExporting(null);
    }
  };

  const handleExportAll = async () => {
    if (!user || user.role !== 'ADMIN') {
      notify('Access denied', 'error');
      return;
    }

    setExporting('all');
    try {
      const allData: Record<string, any[]> = {};

      // Export all collections
      for (const option of exportOptions) {
        const collectionRef = collection(firestore, option.collection);
        const snapshot = await getDocs(query(collectionRef, orderBy('createdAt', 'desc')));
        allData[option.collection] = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));
      }

      // Create a zip-like structure (combine into one CSV with sheets)
      // For simplicity, we'll create separate files
      for (const [collection, data] of Object.entries(allData)) {
        if (data.length > 0) {
          const headers = Object.keys(data[0]);
          const csv = convertToCSV(data, headers);
          const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `${collection}-export-${new Date().toISOString().split('T')[0]}.csv`;
          link.click();
          window.URL.revokeObjectURL(url);
          // Small delay between downloads
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      notify('All data exported successfully', 'success');
    } catch (error) {
      console.error('Failed to export all data:', error);
      notify('Failed to export all data', 'error');
    } finally {
      setExporting(null);
    }
  };

  if (user?.role !== 'ADMIN') {
    return (
      <div className="p-8 text-center text-gray-500 dark:text-gray-400">
        Access denied. Admin only.
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold font-display text-gray-900 dark:text-white">Data Export</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Export system data to CSV format</p>
        </div>
        <button
          onClick={handleExportAll}
          disabled={exporting === 'all'}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 disabled:opacity-50"
        >
          {exporting === 'all' ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              Exporting...
            </>
          ) : (
            <>
              <Database size={18} />
              Export All Data
            </>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {exportOptions.map(option => (
          <div
            key={option.id}
            className="bg-white dark:bg-[#0F172A] p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700/50 hover:shadow-md transition-all"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-gray-50 dark:bg-[#0A1B2E] rounded-xl">
                {option.icon}
              </div>
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white">{option.name}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">{option.description}</p>
              </div>
            </div>
            <button
              onClick={() => handleExport(option)}
              disabled={exporting === option.id || exporting === 'all'}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {exporting === option.id ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Exporting...
                </>
              ) : (
                <>
                  <Download size={16} />
                  Export CSV
                </>
              )}
            </button>
          </div>
        ))}
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-6">
        <div className="flex items-start gap-3">
          <FileText size={20} className="text-blue-600 dark:text-blue-400 mt-0.5" />
          <div>
            <h4 className="font-bold text-blue-900 dark:text-blue-300 mb-2">Export Information</h4>
            <ul className="text-sm text-blue-800 dark:text-blue-400 space-y-1">
              <li>• All data is exported in CSV format</li>
              <li>• Dates are exported in ISO format</li>
              <li>• Nested objects are exported as JSON strings</li>
              <li>• Files are named with collection name and export date</li>
              <li>• Large exports may take a few moments to process</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

