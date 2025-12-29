
import React, { useState } from 'react';
import { User, Courier } from '../types';
import { Save, User as UserIcon, Truck, Star, Package, Phone, Mail, MapPin, ArrowLeft, Shield } from 'lucide-react';
import { useNotification } from './NotificationSystem';

interface DriverProfileProps {
  courier?: Courier; // Optional: If viewing another courier
  user?: User; // Optional: If viewing self
  onBack?: () => void;
}

export const DriverProfile: React.FC<DriverProfileProps> = ({ courier, user, onBack }) => {
  const { notify } = useNotification();
  
  // Mock initial data based on props
  const initialData = courier ? {
      name: courier.name,
      vehicle: courier.vehicle,
      rating: courier.rating,
      orders: courier.ordersDelivered,
      phone: '+255 712 345 678',
      email: 'driver@nexafya.com',
      plate: 'T 123 ABC',
      status: courier.status
  } : {
      name: user?.name || 'Juma K.',
      vehicle: 'Motorcycle',
      rating: 4.9,
      orders: 1450,
      phone: user?.phone || '+255 712 345 678',
      email: user?.email || 'me@nexafya.com',
      plate: 'T 888 XYZ',
      status: 'Available'
  };

  const [formData, setFormData] = useState(initialData);
  const [isEditing, setIsEditing] = useState(false);

  const handleSave = () => {
      setIsEditing(false);
      notify('Driver profile updated successfully.', 'success');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500 pb-20">
        <div className="flex items-center gap-4">
            {onBack && (
                <button onClick={onBack} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                    <ArrowLeft size={24} className="text-gray-600 dark:text-gray-300" />
                </button>
            )}
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Driver Profile</h1>
                <p className="text-gray-500 dark:text-gray-400">Manage vehicle details and contact info.</p>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* ID Card */}
            <div className="md:col-span-1">
                <div className="bg-white dark:bg-[#0F172A] rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 text-center relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-r from-blue-600 to-indigo-600"></div>
                    <div className="relative z-10 mt-12">
                        <div className="w-24 h-24 mx-auto bg-white dark:bg-[#0F172A] rounded-full p-1 shadow-lg">
                            <img 
                                src={`https://ui-avatars.com/api/?name=${formData.name}&background=random`} 
                                alt={formData.name} 
                                className="w-full h-full rounded-full object-cover"
                            />
                        </div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-4">{formData.name}</h2>
                        <div className="flex items-center justify-center gap-2 mt-2">
                            <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-bold uppercase rounded-full flex items-center gap-1">
                                <Truck size={12} /> {formData.vehicle}
                            </span>
                            <span className={`px-3 py-1 text-xs font-bold uppercase rounded-full ${
                                formData.status === 'Available' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'
                            }`}>
                                {formData.status}
                            </span>
                        </div>
                        
                        <div className="mt-6 flex justify-center gap-6 border-t border-gray-100 dark:border-gray-700 pt-6">
                            <div className="text-center">
                                <p className="text-lg font-bold text-gray-900 dark:text-white">{formData.rating}</p>
                                <p className="text-xs text-gray-500 uppercase flex items-center justify-center gap-1"><Star size={10} className="text-amber-500" fill="currentColor"/> Rating</p>
                            </div>
                            <div className="text-center">
                                <p className="text-lg font-bold text-gray-900 dark:text-white">{formData.orders}</p>
                                <p className="text-xs text-gray-500 uppercase flex items-center justify-center gap-1"><Package size={10}/> Orders</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Details Form */}
            <div className="md:col-span-2">
                <div className="bg-white dark:bg-[#0F172A] rounded-3xl p-8 shadow-sm border border-gray-100 dark:border-gray-700">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-lg text-gray-900 dark:text-white">Account Details</h3>
                        {!isEditing ? (
                            <button onClick={() => setIsEditing(true)} className="text-blue-600 font-bold text-sm hover:underline">Edit</button>
                        ) : (
                            <div className="flex gap-3">
                                <button onClick={() => setIsEditing(false)} className="text-gray-500 font-bold text-sm hover:underline">Cancel</button>
                                <button onClick={handleSave} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2">
                                    <Save size={16} /> Save
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Phone Number</label>
                                <div className="relative">
                                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                    <input 
                                        type="text" 
                                        value={formData.phone}
                                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                                        disabled={!isEditing}
                                        className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-[#0A0F1C]/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-70 disabled:cursor-not-allowed text-gray-900 dark:text-white"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Email</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                    <input 
                                        type="email" 
                                        value={formData.email}
                                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                                        disabled={!isEditing}
                                        className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-[#0A0F1C]/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-70 disabled:cursor-not-allowed text-gray-900 dark:text-white"
                                    />
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Vehicle Plate Number</label>
                            <div className="relative">
                                <Truck className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <input 
                                    type="text" 
                                    value={formData.plate}
                                    onChange={(e) => setFormData({...formData, plate: e.target.value})}
                                    disabled={!isEditing}
                                    className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-[#0A0F1C]/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-70 disabled:cursor-not-allowed text-gray-900 dark:text-white font-mono uppercase"
                                />
                            </div>
                        </div>

                        <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                            <h4 className="font-bold text-sm text-gray-900 dark:text-white mb-4">Verification Status</h4>
                            <div className="flex flex-wrap gap-4">
                                <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 px-3 py-2 rounded-lg text-sm font-bold border border-emerald-100 dark:border-emerald-800">
                                    <Shield size={16} /> Identity Verified
                                </div>
                                <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 px-3 py-2 rounded-lg text-sm font-bold border border-emerald-100 dark:border-emerald-800">
                                    <Shield size={16} /> License Valid
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
};
