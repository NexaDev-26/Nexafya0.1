import React, { useState } from 'react';
import { ShieldCheck, CreditCard, Activity, CheckCircle, AlertCircle, FileText } from 'lucide-react';
import { useNotification } from './NotificationSystem';

export const Insurance: React.FC = () => {
  const { notify } = useNotification();
  const [isVerified, setIsVerified] = useState(false);
  const [nhifNumber, setNhifNumber] = useState('');
  const [loading, setLoading] = useState(false);

  const handleVerify = () => {
    if (nhifNumber.length < 6) {
        notify('Invalid NHIF Number', 'error');
        return;
    }
    setLoading(true);
    setTimeout(() => {
        setIsVerified(true);
        setLoading(false);
        notify('NHIF Card Verified Successfully', 'success');
    }, 2000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
        {/* Header */}
        <div className="flex justify-between items-center">
            <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Insurance Coverage</h1>
                <p className="text-gray-500 dark:text-gray-400">Manage your NHIF and private health insurance.</p>
            </div>
            {isVerified && <div className="bg-emerald-100 text-emerald-700 px-4 py-2 rounded-full font-bold flex items-center gap-2"><ShieldCheck size={18}/> Active Coverage</div>}
        </div>

        {/* Verification Card */}
        <div className="bg-white dark:bg-[#0F172A] rounded-3xl p-8 shadow-sm border border-gray-100 dark:border-gray-700">
            {!isVerified ? (
                <div className="max-w-md">
                    <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Link NHIF Card</h3>
                    <p className="text-gray-500 mb-6">Enter your membership number to verify eligibility for cashless treatments.</p>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">NHIF Membership Number</label>
                            <input 
                                type="text" 
                                value={nhifNumber}
                                onChange={(e) => setNhifNumber(e.target.value)}
                                placeholder="e.g. 12345678"
                                className="w-full px-4 py-3 bg-gray-50 dark:bg-[#0A0F1C] border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-colors text-gray-900 dark:text-white"
                            />
                        </div>
                        <button 
                            onClick={handleVerify}
                            disabled={loading}
                            className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                        >
                            {loading ? 'Verifying...' : 'Verify Card'}
                        </button>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl p-6 text-white relative overflow-hidden shadow-lg">
                        <div className="flex justify-between items-start mb-8">
                            <h3 className="font-bold text-lg">NHIF Card</h3>
                            <ShieldCheck className="opacity-50" size={24} />
                        </div>
                        <div className="mb-6">
                            <p className="text-xs text-blue-200 uppercase tracking-wider mb-1">Membership No.</p>
                            <p className="font-mono text-xl tracking-widest">{nhifNumber}</p>
                        </div>
                        <div className="flex justify-between items-end">
                            <div>
                                <p className="text-xs text-blue-200 uppercase tracking-wider mb-1">Beneficiary</p>
                                <p className="font-bold">Juma Baraka</p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs text-blue-200 uppercase tracking-wider mb-1">Status</p>
                                <p className="font-bold bg-emerald-500/20 px-2 py-0.5 rounded">Active</p>
                            </div>
                        </div>
                        {/* Pattern overlay */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
                    </div>

                    <div className="space-y-6">
                        <h4 className="font-bold text-gray-900 dark:text-white">Coverage Benefits</h4>
                        <ul className="space-y-3">
                            <li className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
                                <CheckCircle size={16} className="text-emerald-500" /> Inpatient Services (unlimited)
                            </li>
                            <li className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
                                <CheckCircle size={16} className="text-emerald-500" /> Outpatient Consultation
                            </li>
                            <li className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
                                <CheckCircle size={16} className="text-emerald-500" /> Optical & Dental (Capped)
                            </li>
                            <li className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
                                <CheckCircle size={16} className="text-emerald-500" /> Surgical Procedures
                            </li>
                        </ul>
                        <button className="text-blue-600 text-sm font-bold hover:underline">View Full Policy Document</button>
                    </div>
                </div>
            )}
        </div>

        {/* Claims History */}
        <div className="bg-white dark:bg-[#0F172A] rounded-3xl p-8 shadow-sm border border-gray-100 dark:border-gray-700">
            <h3 className="font-bold text-xl mb-6 text-gray-900 dark:text-white">Recent Claims</h3>
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 dark:bg-[#0A0F1C]/50">
                        <tr>
                            <th className="p-4 rounded-l-xl text-xs font-bold text-gray-500 uppercase">Date</th>
                            <th className="p-4 text-xs font-bold text-gray-500 uppercase">Provider</th>
                            <th className="p-4 text-xs font-bold text-gray-500 uppercase">Service</th>
                            <th className="p-4 text-xs font-bold text-gray-500 uppercase">Amount</th>
                            <th className="p-4 rounded-r-xl text-xs font-bold text-gray-500 uppercase">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        <tr>
                            <td className="p-4 text-sm text-gray-600 dark:text-gray-300">Oct 15, 2023</td>
                            <td className="p-4 font-bold text-gray-900 dark:text-white">Aga Khan Hospital</td>
                            <td className="p-4 text-sm text-gray-600 dark:text-gray-300">General Consultation</td>
                            <td className="p-4 text-sm text-gray-600 dark:text-gray-300">TZS 35,000</td>
                            <td className="p-4"><span className="bg-emerald-100 text-emerald-700 text-xs px-2 py-1 rounded-full font-bold">Approved</span></td>
                        </tr>
                        <tr>
                            <td className="p-4 text-sm text-gray-600 dark:text-gray-300">Sep 28, 2023</td>
                            <td className="p-4 font-bold text-gray-900 dark:text-white">City Pharmacy</td>
                            <td className="p-4 text-sm text-gray-600 dark:text-gray-300">Medication (Amoxyl)</td>
                            <td className="p-4 text-sm text-gray-600 dark:text-gray-300">TZS 12,000</td>
                            <td className="p-4"><span className="bg-emerald-100 text-emerald-700 text-xs px-2 py-1 rounded-full font-bold">Approved</span></td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
  );
};
