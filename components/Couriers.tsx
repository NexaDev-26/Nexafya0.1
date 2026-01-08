
import React, { useState, useEffect } from 'react';
import { Courier } from '../types';
import { Truck, MapPin, Phone, Star, Bike, X, User, ChevronRight, Loader2 } from 'lucide-react';
import { useNotification } from './NotificationSystem';
import { db } from '../services/db';
import { SkeletonLoader } from './SkeletonLoader';

interface CouriersProps {
    onNavigate?: (view: string) => void;
}

export const Couriers: React.FC<CouriersProps> = ({ onNavigate }) => {
  const { notify } = useNotification();
  const [selectedCourier, setSelectedCourier] = useState<Courier | null>(null);
  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch couriers from database
  useEffect(() => {
    const loadCouriers = async () => {
      setLoading(true);
      try {
        const couriersData = await db.getCouriers();
        // Map to Courier type
        const mappedCouriers: Courier[] = couriersData.map((c: any) => ({
          id: c.id,
          name: c.name || 'Courier',
          vehicle: c.vehicle || 'Motorcycle',
          status: c.status || 'Offline',
          currentLocation: c.currentLocation || c.location || 'Not specified',
          ordersDelivered: c.ordersDelivered || c.orders_delivered || 0,
          rating: c.rating || 0,
          trustTier: c.trustTier || c.trust_tier,
          isTrusted: c.isTrusted || c.is_trusted || false,
          verificationStatus: c.verificationStatus || c.verification_status || 'Pending',
          phone: c.phone || '',
          email: c.email || '',
          avatar: c.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(c.name || 'Courier')}&background=random`
        }));
        setCouriers(mappedCouriers);
      } catch (error) {
        console.error('Failed to load couriers:', error);
        notify('Failed to load couriers', 'error');
        setCouriers([]);
      } finally {
        setLoading(false);
      }
    };
    
    loadCouriers();
  }, [notify]);

  const handleAssign = (courierName: string) => {
    notify(`Assigned delivery task to ${courierName}.`, 'success');
  };

  const handleViewProfile = () => {
      if (onNavigate) {
          onNavigate('driver-profile'); // In real app, pass ID
      } else {
          notify("Navigate to Driver Profile (Mock)", "info");
      }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 relative">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Delivery Dispatch</h2>
          <p className="text-gray-500 dark:text-gray-400">Track and assign couriers to pharmacy orders.</p>
        </div>
        <div className="bg-emerald-50 dark:bg-emerald-900/20 px-4 py-2 rounded-xl border border-emerald-100 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 text-sm font-medium flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            Live Tracking Active
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Map Placeholder */}
        <div className="lg:col-span-2 bg-gray-100 dark:bg-[#0F172A] rounded-2xl h-[400px] border-2 border-dashed border-gray-300 dark:border-gray-700 flex flex-col items-center justify-center relative overflow-hidden">
             <div className="absolute inset-0 opacity-20 dark:opacity-10" 
                  style={{ backgroundImage: 'radial-gradient(#6b7280 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
             </div>
             <MapPin size={48} className="text-blue-500 mb-2 z-10 animate-bounce" />
             <p className="text-gray-500 font-medium z-10">Live Map View</p>
             <p className="text-xs text-gray-400 z-10 mt-1">
               {loading ? 'Loading couriers...' : `Showing real-time positions of ${couriers.length} active courier${couriers.length !== 1 ? 's' : ''}`}
             </p>
        </div>

        {/* Courier List */}
        <div className="space-y-4">
          {loading ? (
            <SkeletonLoader type="list" count={3} />
          ) : couriers.length === 0 ? (
            <div className="bg-gray-50 dark:bg-[#0A1B2E] rounded-2xl p-8 text-center border border-gray-200 dark:border-gray-700">
              <Truck className="mx-auto text-gray-300 dark:text-gray-600 mb-4" size={48} />
              <p className="text-gray-500 dark:text-gray-400 font-medium mb-2">No couriers registered</p>
              <p className="text-sm text-gray-400 dark:text-gray-500">
                Registered couriers will appear here. Make sure couriers sign up with the COURIER role.
              </p>
            </div>
          ) : (
           couriers.map(courier => (
             <div 
                key={courier.id} 
                onClick={() => setSelectedCourier(courier)}
                className={`p-4 rounded-2xl shadow-sm border cursor-pointer transition-all hover:scale-[1.02] ${selectedCourier?.id === courier.id ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500' : 'bg-white dark:bg-[#0F172A] border-gray-100 dark:border-gray-700'}`}
             >
                <div className="flex justify-between items-start mb-2">
                   <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                         {courier.vehicle === 'Bicycle' ? <Bike size={20} /> : <Truck size={20} />}
                      </div>
                      <div>
                         <h4 className="font-bold text-gray-900 dark:text-white">{courier.name}</h4>
                         <p className="text-xs text-gray-500">{courier.vehicle}</p>
                      </div>
                   </div>
                   <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      courier.status === 'Available' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                      courier.status === 'Busy' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                      'bg-gray-100 text-gray-600'
                   }`}>
                      {courier.status}
                   </span>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-sm text-gray-500 dark:text-gray-400">
                   <div className="flex items-center gap-1">
                      <MapPin size={14} /> {courier.currentLocation}
                   </div>
                   <div className="flex items-center gap-1 justify-end">
                      <Star size={14} className="text-yellow-500" fill="currentColor" /> {courier.rating}
                   </div>
                </div>
             </div>
           ))
          )}
        </div>
      </div>

      {/* Slide-over Details Panel */}
      {selectedCourier && (
          <div className="fixed inset-y-0 right-0 w-80 bg-white dark:bg-[#0A0F1C] shadow-2xl z-[60] border-l border-gray-200 dark:border-gray-800 p-6 flex flex-col animate-in slide-in-from-right duration-300">
              <div className="flex justify-between items-center mb-8">
                  <h3 className="font-bold text-lg text-gray-900 dark:text-white">Driver Details</h3>
                  <button onClick={() => setSelectedCourier(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
                      <X size={20} />
                  </button>
              </div>

              <div className="flex flex-col items-center mb-8">
                  <div className="w-24 h-24 bg-gray-100 dark:bg-[#0F172A] rounded-full mb-4 overflow-hidden border-4 border-gray-50 dark:border-gray-700">
                      <img src={`https://ui-avatars.com/api/?name=${selectedCourier.name}&background=random`} className="w-full h-full object-cover" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">{selectedCourier.name}</h2>
                  <p className="text-sm text-gray-500">{selectedCourier.vehicle} • {selectedCourier.ordersDelivered} Deliveries</p>
              </div>

              <div className="space-y-4 mb-8">
                  <div className="bg-gray-50 dark:bg-[#0F172A] p-4 rounded-xl flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-500">Status</span>
                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                          selectedCourier.status === 'Available' ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'
                      }`}>{selectedCourier.status}</span>
                  </div>
                  <div className="bg-gray-50 dark:bg-[#0F172A] p-4 rounded-xl flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-500">Location</span>
                      <span className="text-sm font-bold text-gray-900 dark:text-white">{selectedCourier.currentLocation}</span>
                  </div>
                  <div className="bg-gray-50 dark:bg-[#0F172A] p-4 rounded-xl flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-500">Rating</span>
                      <span className="text-sm font-bold text-amber-500 flex items-center gap-1"><Star size={14} fill="currentColor"/> {selectedCourier.rating}</span>
                  </div>
              </div>

              <div className="flex flex-col gap-3 mt-auto">
                  <button onClick={() => handleAssign(selectedCourier.name)} disabled={selectedCourier.status !== 'Available'} className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg disabled:opacity-50">
                      Assign Task
                  </button>
                  <button className="w-full py-3 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-800">
                      <Phone size={18} /> Call Driver
                  </button>
                  <button onClick={handleViewProfile} className="w-full py-3 text-blue-600 dark:text-blue-400 font-bold text-sm hover:underline flex items-center justify-center gap-1">
                      View Full Profile <ChevronRight size={16} />
                  </button>
              </div>
          </div>
      )}
    </div>
  );
};
