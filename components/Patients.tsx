
import React, { useEffect, useMemo, useState } from 'react';
import { Search, Calendar, Clock, Filter, ChevronDown, ChevronRight, MessageSquare, Video, Phone, Users } from 'lucide-react';
import { useNotification } from './NotificationSystem';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../services/db';
import { Appointment, UserRole } from '../types';
import { handleError } from '../utils/errorHandler';
import { SkeletonLoader } from './SkeletonLoader';
import { EmptyState } from './EmptyState';

interface PatientsProps {
    onNavigate?: (view: string) => void;
}

export const Patients: React.FC<PatientsProps> = ({ onNavigate }) => {
  const { notify } = useNotification();
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!user || user.role !== UserRole.DOCTOR) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const apts = await db.getAppointments(user.id, UserRole.DOCTOR);
        setAppointments(apts || []);
      } catch (error) {
        handleError(error, notify);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user?.id, user?.role]);

  const patients = useMemo(() => {
    const map = new Map<string, any>();
    for (const apt of appointments) {
      if (!apt.patientId) continue;
      const existing = map.get(apt.patientId);
      const best = !existing ? apt : (new Date(`${apt.date} ${apt.time}`) > new Date(`${existing.next.date} ${existing.next.time}`) ? apt : existing.next);
      map.set(apt.patientId, {
        id: apt.patientId,
        name: apt.patientName,
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(apt.patientName)}&background=random`,
        next: best,
        status: apt.status
      });
    }
    return Array.from(map.values());
  }, [appointments]);

  const handleMessageClick = (patientName: string) => {
      if (onNavigate) {
          onNavigate('messages');
          notify(`Opening chat with ${patientName}`, 'info');
      } else {
          notify(`Messaging feature unavailable`, 'error');
      }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Patient List</h2>
          <p className="text-gray-500 dark:text-gray-300">Manage today's appointments and consults.</p>
        </div>
        
        <div className="flex gap-3 w-full md:w-auto">
             <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                    type="text" 
                    placeholder="Search patient..." 
                    className="w-full md:w-64 pl-10 pr-4 py-2 bg-white dark:bg-[#0F172A] border border-gray-200 dark:border-gray-700/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                />
             </div>
             <button className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-[#0F172A] border border-gray-200 dark:border-gray-700/50 rounded-xl font-medium text-gray-600 dark:text-white hover:bg-gray-50 dark:hover:bg-[#0A0F1C]">
                <Filter size={18} /> Filter <ChevronDown size={14} />
             </button>
        </div>
      </div>

      {/* Cards List Layout */}
      <div className="bg-white dark:bg-[#0F172A] rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-700/50">
         {loading ? (
           <SkeletonLoader type="list" count={5} />
         ) : (
           <div className="space-y-2">
            {patients.map((patient) => (
                <div key={patient.id} className={`flex flex-col md:flex-row items-center gap-6 p-4 rounded-2xl transition-colors group ${
                    patient.status === 'On-going' 
                    ? 'bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-900/30' 
                    : 'hover:bg-gray-50 dark:hover:bg-gray-700/30 border border-transparent'
                }`}>
                    {/* Avatar & Basic Info */}
                    <div className="flex items-center gap-4 w-full md:w-1/3">
                        <div className="relative">
                           <div className="w-14 h-14 rounded-full overflow-hidden">
                               <img src={patient.avatar} alt={patient.name} className="w-full h-full object-cover" />
                           </div>
                           {patient.status === 'On-going' && (
                               <span className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></span>
                           )}
                        </div>
                        <div>
                            <h4 className="font-bold text-gray-900 dark:text-gray-800 text-lg">{patient.name}</h4>
                            <p className="text-sm text-gray-500">Next: {patient.next?.date} • {patient.next?.time}</p>
                        </div>
                    </div>

                    {/* Schedule & Mode */}
                    <div className="w-full md:w-1/3 text-sm text-gray-600 dark:text-gray-600 flex items-center gap-3">
                        <div className="flex items-center gap-2"><Calendar size={16} className="text-gray-400" /> {patient.next?.date}</div>
                        <div className="flex items-center gap-2"><Clock size={16} className="text-gray-400" /> {patient.next?.time}</div>
                        <div className="flex items-center gap-2 font-bold text-blue-600">
                          {patient.next?.type === 'VIDEO' ? <Video size={16} /> : patient.next?.type === 'AUDIO' ? <Phone size={16} /> : <MessageSquare size={16} />}
                          {patient.next?.type}
                        </div>
                    </div>

                    {/* Time & Status */}
                    <div className="w-full md:w-1/4 flex flex-col md:flex-row items-start md:items-center gap-4">
                        <div className={`px-4 py-1.5 rounded-xl text-sm font-bold ${
                             patient.status === 'On-going' 
                             ? 'bg-white text-indigo-600 shadow-sm border border-indigo-100' 
                             : 'bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400'
                        }`}>
                            {patient.time}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="w-full md:w-auto ml-auto flex gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                         <button 
                            onClick={() => handleMessageClick(patient.name)}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                         >
                            <MessageSquare size={20} />
                         </button>
                         <button
                            onClick={() => { onNavigate?.('video-call'); notify('Starting call…', 'info'); }}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                            title="Start call"
                         >
                            {patient.next?.type === 'AUDIO' ? <Phone size={20} /> : <Video size={20} />}
                         </button>
                         <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                            <ChevronRight size={20} />
                         </button>
                    </div>
                </div>
            ))}
            {patients.length === 0 && (
              <EmptyState
                icon={Users}
                title="No patients found"
                description="Once patients book consultations with you, they will appear here."
              />
            )}
           </div>
         )}
      </div>
    </div>
  );
};
