
import React, { useState, useEffect } from 'react';
import { Package, Clock, CheckCircle, Truck, MapPin, MoreHorizontal, Printer, X, Eye, ShoppingBag, ArrowRight } from 'lucide-react';
import { useNotification } from './NotificationSystem';
import { User, UserRole } from '../types';
import { db } from '../services/db';
import { SkeletonLoader } from './SkeletonLoader';
import { EmptyState } from './EmptyState';
import { handleError } from '../utils/errorHandler';

interface OrdersProps {
    user?: User;
}

export const Orders: React.FC<OrdersProps> = ({ user }) => {
    const { notify } = useNotification();
    const [viewingReceipt, setViewingReceipt] = useState<any | null>(null);
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) return;

        const loadOrders = async () => {
            try {
                setLoading(true);
                const data = await db.getOrders(user.id, user.role);
                setOrders(data);
            } catch (error) {
                handleError(error, notify);
            } finally {
                setLoading(false);
            }
        };
        loadOrders();

        // Note: Real-time updates can be implemented using Firebase Firestore listeners if needed
        // For now, orders are loaded once on mount
    }, [user, notify]);

    const handleStatusChange = (id: string, newStatus: string) => {
        notify(`Order ${id} marked as ${newStatus}`, 'success');
        // Logic to update status in DB would go here
    };

    const TimelineStep = ({ active, completed, label, icon: Icon, isLast }: any) => (
        <div className={`flex flex-col items-center flex-1 relative ${isLast ? '' : ''}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center z-10 border-2 transition-colors ${
                completed ? 'bg-emerald-600 border-emerald-600 text-white shadow-[0_0_10px_rgba(16,185,129,0.4)]' : 
                active ? 'bg-white dark:bg-[#0F172A] border-blue-600 text-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.2)]' : 
                'bg-white dark:bg-[#0F172A] border-gray-300 dark:border-gray-700 text-gray-300'
            }`}>
                <Icon size={14} />
            </div>
            <span className={`text-[10px] font-bold uppercase mt-2 ${
                completed ? 'text-emerald-600' : active ? 'text-blue-600' : 'text-gray-400'
            }`}>{label}</span>
            {!isLast && (
                <div className={`absolute top-4 left-1/2 w-full h-0.5 -z-0 ${
                    completed ? 'bg-emerald-600' : 'bg-gray-200 dark:bg-gray-600'
                }`}></div>
            )}
        </div>
    );

    const ReceiptModal = ({ order, onClose }: { order: any, onClose: () => void }) => (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white dark:bg-gray-100 w-full max-w-sm p-6 shadow-2xl relative rounded-none border-t-8 border-gray-900" style={{ fontFamily: '"Courier New", Courier, monospace' }}>
                <button onClick={onClose} className="absolute top-2 right-2 p-2 hover:bg-gray-100 dark:hover:bg-gray-200 rounded-full text-gray-500">
                    <X size={20} />
                </button>
                
                <div className="text-center border-b border-dashed border-gray-400 pb-4 mb-4 text-gray-900">
                    <h3 className="font-bold text-lg uppercase">NexaFya Network</h3>
                    <p className="text-xs">TRA REGISTERED</p>
                    <p className="text-xs">TIN: 100-200-300 | VRN: 40-1234567</p>
                </div>
                
                <div className="text-xs mb-4 space-y-1 text-gray-800">
                    <p>Date: {new Date().toLocaleString()}</p>
                    <p>Receipt #: {order.id}</p>
                    <p>Customer: {order.customer}</p>
                    <p>Loc: {order.location}</p>
                </div>

                <div className="border-b border-dashed border-gray-400 pb-2 mb-2 text-gray-800">
                    <div className="text-xs mb-1">
                        <p>{order.items}</p>
                    </div>
                </div>

                <div className="flex justify-between font-bold text-sm mb-6 text-gray-900">
                    <span>TOTAL (TZS)</span>
                    <span>{order.total.toLocaleString()}</span>
                </div>

                <div className="text-center text-[10px] space-y-1 border-t border-dashed border-gray-400 pt-4 text-gray-600">
                    <p>** START OF LEGAL RECEIPT **</p>
                    <p>UIN: 09F123849123</p>
                    <p>VERIFICATION: GH82</p>
                    <p>** END OF LEGAL RECEIPT **</p>
                </div>

                <div className="mt-6 flex gap-2 no-print">
                    <button onClick={() => window.print()} className="flex-1 bg-gray-900 text-white py-2 font-sans font-bold text-xs rounded hover:bg-black transition-colors">Print</button>
                    <button onClick={onClose} className="flex-1 border border-gray-300 text-gray-700 py-2 font-sans font-bold text-xs rounded hover:bg-gray-50 transition-colors">Close</button>
                </div>
            </div>
        </div>
    );

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {viewingReceipt && <ReceiptModal order={viewingReceipt} onClose={() => setViewingReceipt(null)} />}

            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold font-display text-gray-900 dark:text-white">{user?.role === UserRole.PATIENT ? 'My Orders' : 'Pharmacy Orders'}</h2>
                    <p className="text-gray-500 dark:text-gray-300">{user?.role === UserRole.PATIENT ? 'Track your medication deliveries.' : 'Track and fulfill incoming medication requests.'}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
                {loading ? (
                    <SkeletonLoader type="list" count={3} />
                ) : orders.length === 0 ? (
                    <EmptyState
                        icon={ShoppingBag}
                        title="No orders found"
                        description={user?.role === UserRole.PATIENT 
                            ? "You haven't placed any orders yet. Start shopping to see your orders here."
                            : "No orders to fulfill. Orders will appear here when patients place them."}
                    />
                ) : (
                    orders.map((order) => (
                        <div key={order.id} className="bg-white dark:bg-[#0F172A] rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-700/50 transition-all hover:shadow-md">
                            <div className="flex flex-col md:flex-row justify-between items-start mb-6 pb-6 border-b border-gray-100 dark:border-gray-700/50 gap-4">
                                <div>
                                    <div className="flex items-center gap-3 mb-2">
                                        <span className="font-mono text-xs font-bold text-gray-500 bg-gray-100 dark:bg-gray-600 px-2 py-1 rounded">{order.id.slice(0,8)}</span>
                                        <span className="text-xs text-gray-400 flex items-center gap-1">
                                            <Clock size={12} /> {order.date}
                                        </span>
                                    </div>
                                    <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-1">{order.items}</h3>
                                    <p className="text-sm text-gray-500 flex items-center gap-1"><MapPin size={14}/> {order.location}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-2xl font-bold text-gray-900 dark:text-white">TZS {order.total.toLocaleString()}</p>
                                    <p className="text-xs text-gray-500">Mobile Money</p>
                                </div>
                            </div>

                            {/* Tracking Timeline */}
                            <div className="mb-6 px-4">
                                <div className="flex justify-between w-full max-w-2xl mx-auto">
                                    <TimelineStep 
                                        label="Confirmed" 
                                        icon={CheckCircle} 
                                        active={true} 
                                        completed={order.status !== 'Pending'} 
                                    />
                                    <TimelineStep 
                                        label="Processing" 
                                        icon={Package} 
                                        active={order.status === 'Pending' || order.status === 'Dispatched'} 
                                        completed={order.status === 'Dispatched' || order.status === 'Delivered'} 
                                    />
                                    <TimelineStep 
                                        label="Dispatched" 
                                        icon={Truck} 
                                        active={order.status === 'Dispatched'} 
                                        completed={order.status === 'Delivered'} 
                                    />
                                    <TimelineStep 
                                        label="Delivered" 
                                        icon={MapPin} 
                                        active={order.status === 'Delivered'} 
                                        completed={order.status === 'Delivered'} 
                                        isLast={true} 
                                    />
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex justify-between items-center bg-gray-50 dark:bg-[#0A1B2E]/50 p-4 rounded-xl">
                                <div className="text-sm font-medium text-gray-600 dark:text-gray-300">
                                    Status: <span className={`font-bold ${
                                        order.status === 'Pending' ? 'text-yellow-600' :
                                        order.status === 'Dispatched' ? 'text-blue-600' : 'text-emerald-600'
                                    }`}>{order.status}</span>
                                </div>
                                
                                <div className="flex gap-2">
                                    {user?.role !== UserRole.PATIENT ? (
                                        <>
                                            {order.status === 'Pending' && (
                                                <button onClick={() => handleStatusChange(order.id, 'Dispatched')} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold flex items-center gap-2">
                                                    <Truck size={16} /> Dispatch
                                                </button>
                                            )}
                                            {order.status === 'Dispatched' && (
                                                <button onClick={() => handleStatusChange(order.id, 'Delivered')} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-bold flex items-center gap-2">
                                                    <CheckCircle size={16} /> Mark Done
                                                </button>
                                            )}
                                        </>
                                    ) : (
                                        <button className="text-blue-600 text-sm font-bold flex items-center gap-1 hover:underline">
                                            Track on Map <ArrowRight size={14} />
                                        </button>
                                    )}
                                    
                                    {order.status === 'Delivered' && (
                                        <button onClick={() => setViewingReceipt(order)} className="px-4 py-2 border border-gray-200 dark:border-gray-700/50 text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-700 rounded-lg text-sm font-bold flex items-center gap-2">
                                            <Eye size={16} /> Receipt
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
