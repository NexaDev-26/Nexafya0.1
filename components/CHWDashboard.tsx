
import React, { useState, useEffect } from 'react';
import { User, HouseholdVisit } from '../types';
import { MapPin, Users, Baby, AlertTriangle, Plus, Calendar, FileText, CheckCircle } from 'lucide-react';
import { useNotification } from './NotificationSystem';
import { db } from '../services/db';

interface CHWDashboardProps {
  user: User;
}

export const CHWDashboard: React.FC<CHWDashboardProps> = ({ user }) => {
  const { notify } = useNotification();
  const [showForm, setShowForm] = useState(false);
  const [visits, setVisits] = useState<HouseholdVisit[]>([]);

  // Load visits
  useEffect(() => {
      const loadVisits = async () => {
          const data = await db.getHouseholdVisits(user.id);
          setVisits(data);
      };
      loadVisits();
  }, [user.id]);

  const [newVisit, setNewVisit] = useState({
    headOfHouse: '',
    location: '',
    status: 'Routine',
    notes: '',
    maternalStatus: 'None'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const visitPayload = {
      chw_id: user.id,
      head_of_household: newVisit.headOfHouse,
      location_name: newVisit.location,
      visit_date: new Date().toISOString(),
      status: newVisit.status as any,
      notes: newVisit.notes,
      maternal_status: newVisit.maternalStatus as any
    };

    // Save to DB
    const savedVisit = await db.recordHouseholdVisit(visitPayload as any);
    
    setVisits([savedVisit, ...visits]);
    setShowForm(false);
    notify('Household visit recorded successfully', 'success');
    setNewVisit({ headOfHouse: '', location: '', status: 'Routine', notes: '', maternalStatus: 'None' });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* Hero / Stats */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-3xl p-8 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10">
          <h1 className="text-3xl font-bold mb-2">Jambo, {user.name}</h1>
          <p className="text-emerald-100 mb-8 max-w-lg">
            Community Health Worker Dashboard. Tracking community health, one household at a time.
          </p>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
             <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="flex items-center gap-2 mb-1 text-emerald-100 text-sm">
                   <Users size={16} /> Households
                </div>
                <span className="text-2xl font-bold">142</span>
             </div>
             <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="flex items-center gap-2 mb-1 text-emerald-100 text-sm">
                   <Baby size={16} /> Maternal
                </div>
                <span className="text-2xl font-bold">8</span>
             </div>
             <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="flex items-center gap-2 mb-1 text-emerald-100 text-sm">
                   <AlertTriangle size={16} /> Alerts
                </div>
                <span className="text-2xl font-bold">3</span>
             </div>
             <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="flex items-center gap-2 mb-1 text-emerald-100 text-sm">
                   <CheckCircle size={16} /> Visits
                </div>
                <span className="text-2xl font-bold">{visits.length}</span>
             </div>
          </div>
        </div>
        {/* Decorative */}
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-white opacity-10 rounded-full blur-3xl"></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Visit Log */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Recent Household Visits</h2>
            <button 
              onClick={() => setShowForm(!showForm)}
              className="bg-emerald-600 text-white px-4 py-2 rounded-xl font-medium flex items-center gap-2 hover:bg-emerald-700 transition-colors"
            >
              <Plus size={18} /> New Report
            </button>
          </div>

          {showForm && (
            <div className="bg-white dark:bg-[#0F172A] p-6 rounded-2xl shadow-sm border border-emerald-100 dark:border-emerald-900/30 mb-6 animate-in slide-in-from-top-4">
               <h3 className="font-bold text-lg mb-4 text-gray-900 dark:text-white">Record Visit Details</h3>
               <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Head of Household</label>
                      <input required type="text" className="w-full px-4 py-2 rounded-xl bg-gray-50 dark:bg-[#0A0F1C] border border-gray-200 dark:border-gray-700/50 text-gray-900 dark:text-white" 
                        value={newVisit.headOfHouse} onChange={e => setNewVisit({...newVisit, headOfHouse: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Location</label>
                      <input required type="text" className="w-full px-4 py-2 rounded-xl bg-gray-50 dark:bg-[#0A0F1C] border border-gray-200 dark:border-gray-700/50 text-gray-900 dark:text-white" 
                        value={newVisit.location} onChange={e => setNewVisit({...newVisit, location: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Visit Type</label>
                      <select className="w-full px-4 py-2 rounded-xl bg-gray-50 dark:bg-[#0A0F1C] border border-gray-200 dark:border-gray-700/50 text-gray-900 dark:text-white"
                        value={newVisit.status} onChange={e => setNewVisit({...newVisit, status: e.target.value})}>
                        <option>Routine</option>
                        <option>Urgent</option>
                        <option>Follow-up</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Maternal Status</label>
                      <select className="w-full px-4 py-2 rounded-xl bg-gray-50 dark:bg-[#0A0F1C] border border-gray-200 dark:border-gray-700/50 text-gray-900 dark:text-white"
                        value={newVisit.maternalStatus} onChange={e => setNewVisit({...newVisit, maternalStatus: e.target.value})}>
                        <option>None</option>
                        <option>Pregnant</option>
                        <option>Lactating</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes / Observations</label>
                    <textarea className="w-full px-4 py-2 rounded-xl bg-gray-50 dark:bg-[#0A0F1C] border border-gray-200 dark:border-gray-700/50 text-gray-900 dark:text-white" rows={3}
                       value={newVisit.notes} onChange={e => setNewVisit({...newVisit, notes: e.target.value})}></textarea>
                  </div>
                  <div className="flex gap-3 justify-end">
                    <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-gray-500 hover:text-gray-700">Cancel</button>
                    <button type="submit" className="px-6 py-2 bg-emerald-600 text-white rounded-xl font-bold">Submit Record</button>
                  </div>
               </form>
            </div>
          )}

          <div className="space-y-4">
            {visits.map((visit) => (
              <div key={visit.id} className="bg-white dark:bg-[#0F172A] p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700/50 flex flex-col md:flex-row gap-4 items-start">
                 <div className={`p-3 rounded-full flex-shrink-0 ${
                   (visit.risk_level as any) === 'Urgent' ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'
                 }`}>
                   {(visit.risk_level as any) === 'Urgent' ? <AlertTriangle size={24} /> : <FileText size={24} />}
                 </div>
                 <div className="flex-1">
                    <div className="flex justify-between items-start">
                       <h3 className="font-bold text-lg text-gray-900 dark:text-white">{visit.head_of_household}</h3>
                       <span className="text-xs text-gray-400 flex items-center gap-1"><Calendar size={12} /> {new Date(visit.visit_date).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400 mt-1 mb-2">
                       <span className="flex items-center gap-1"><MapPin size={14} /> {visit.location_name}</span>
                       <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                         visit.maternal_status && visit.maternal_status !== 'None' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' : 'hidden'
                       }`}>
                         {visit.maternal_status}
                       </span>
                    </div>
                    <p className="text-gray-600 dark:text-gray-300 text-sm bg-gray-50 dark:bg-[#0A0F1C]/50 p-3 rounded-lg border border-gray-100 dark:border-gray-700/50">
                      {visit.notes}
                    </p>
                 </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
           <div className="bg-white dark:bg-[#0F172A] p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700/50">
              <h3 className="font-bold text-lg mb-4 text-gray-900 dark:text-white">Local Alerts</h3>
              <div className="space-y-3">
                 <div className="flex gap-3 items-start p-3 bg-red-50 dark:bg-red-900/10 rounded-xl border border-red-100 dark:border-red-900/30">
                    <AlertTriangle className="text-red-500 flex-shrink-0" size={18} />
                    <div>
                       <h4 className="font-bold text-red-700 dark:text-red-400 text-sm">Cholera Outbreak</h4>
                       <p className="text-xs text-red-600/80 dark:text-red-400/70 mt-1">Reported in Mbagala area. Monitor water sources.</p>
                    </div>
                 </div>
                 <div className="flex gap-3 items-start p-3 bg-blue-50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-900/30">
                    <CheckCircle className="text-blue-500 flex-shrink-0" size={18} />
                    <div>
                       <h4 className="font-bold text-blue-700 dark:text-blue-400 text-sm">Vaccination Drive</h4>
                       <p className="text-xs text-blue-600/80 dark:text-blue-400/70 mt-1">Polio drive scheduled for next Tuesday.</p>
                    </div>
                 </div>
              </div>
           </div>

           <div className="bg-purple-600 text-white p-6 rounded-2xl shadow-lg relative overflow-hidden">
              <div className="relative z-10">
                 <h3 className="font-bold text-lg mb-2">Referral System</h3>
                 <p className="text-purple-100 text-sm mb-4">Need to refer a critical patient to a doctor?</p>
                 <button className="w-full bg-white text-purple-600 py-2 rounded-lg font-bold hover:bg-purple-50 transition-colors">
                    Create Referral
                 </button>
              </div>
              <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-white opacity-10 rounded-full blur-2xl"></div>
           </div>
        </div>
      </div>
    </div>
  );
};
