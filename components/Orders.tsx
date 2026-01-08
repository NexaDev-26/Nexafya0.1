
import React, { useState, useEffect, memo } from 'react';
import { Package, Clock, CheckCircle, Truck, MapPin, MoreHorizontal, Printer, X, Eye, ShoppingBag, ArrowRight, Store, Building2, Phone, Mail, RefreshCw, Sparkles, ShoppingCart, Search, Filter, RotateCcw, Edit, Trash2, Save, AlertCircle } from 'lucide-react';
import { useNotification } from './NotificationSystem';
import { User, UserRole } from '../types';
import { db } from '../services/db';
import { SkeletonLoader } from './SkeletonLoader';
import { EmptyState } from './EmptyState';
import { handleError } from '../utils/errorHandler';
import { db as firestore } from '../lib/firebase';
import { collection, query, where, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
import { PullToRefresh } from './PullToRefresh';

interface OrdersProps {
    user?: User;
    onNavigate?: (view: string) => void;
}

const OrdersComponent: React.FC<OrdersProps> = ({ user, onNavigate }) => {
    const { notify } = useNotification();
    const [viewingReceipt, setViewingReceipt] = useState<any | null>(null);
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('ALL');
    const [editingOrder, setEditingOrder] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<{ delivery_address?: string; location?: string; notes?: string }>({});
    const [deletingOrder, setDeletingOrder] = useState<string | null>(null);
    const [cancellingOrder, setCancellingOrder] = useState<string | null>(null);
    const [cancelReason, setCancelReason] = useState('');

    const handleRefresh = async () => {
        // Force reload by resetting loading state
        setLoading(true);
        // The useEffect will handle the refresh automatically
    };

    useEffect(() => {
        if (!user) return;

                setLoading(true);
        
        // Use real-time listener for orders
        // Note: Using query without orderBy to avoid index requirement, then sorting client-side
        const ordersRef = collection(firestore, 'orders');
        const field = user.role === UserRole.PHARMACY ? 'pharmacy_id' : 'patient_id';
        const q = query(ordersRef, where(field, '==', user.id));

        const unsubscribe = onSnapshot(q, 
            (snapshot) => {
                const ordersData = snapshot.docs.map((doc) => {
                    const data = doc.data();
                    const createdAt = data.createdAt?.toDate?.() || (data.created_at?.toDate?.()) || new Date();
                    
                    // Format items for display
                    const items = Array.isArray(data.items) 
                        ? data.items.map((item: any) => `${item.quantity}x ${item.name || item.medicine_name || 'Medicine'}`).join(', ')
                        : data.items || 'Medicines';
                    
                    return {
                        id: doc.id,
                        orderId: doc.id.slice(0, 8).toUpperCase(),
                        items: items,
                        total: data.total_amount || data.total || 0,
                        status: data.status || data.delivery_status || 'PENDING',
                        payment_status: data.payment_status || 'PENDING',
                        date: createdAt.toLocaleDateString('en-US', { 
                            year: 'numeric', 
                            month: 'short', 
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                        }),
                        createdAt: createdAt,
                        location: data.delivery_address || data.location || 'Not specified',
                        customer: data.patient_name || data.customer || user.name,
                        pharmacy_name: data.pharmacy_name || 'Pharmacy',
                        pharmacy_branch: data.pharmacy_branch || '',
                        pharmacy_location: data.pharmacy_location || '',
                        delivery_status: data.delivery_status || data.status || 'PENDING',
                        items_list: Array.isArray(data.items) ? data.items : [],
                        status_timestamps: {
                            placed: createdAt,
                            processing: data.processing_at?.toDate?.() || null,
                            dispatched: data.dispatched_at?.toDate?.() || null,
                            delivered: data.delivered_at?.toDate?.() || null,
                            cancelled_at: data.cancelled_at?.toDate?.() || null
                        },
                        cancellation_reason: data.cancellation_reason || '',
                        notes: data.notes || ''
                    };
                }).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()); // Sort by date descending client-side
                
                setOrders(ordersData);
                setLoading(false);
            },
            (error) => {
                console.error('Orders listener error:', error);
                setOrders([]);
                setLoading(false);
                // Only show error notification for actual errors, not empty results
                if (error.code && error.code !== 'permission-denied') {
                    console.warn('Failed to load orders:', error.message);
                }
            }
        );

        return () => unsubscribe();
    }, [user, notify]);

    const handleStatusChange = (id: string, newStatus: string) => {
        notify(`Order ${id} marked as ${newStatus}`, 'success');
        // Logic to update status in DB would go here
    };

    // Patient CRUD handlers
    const handleEditOrder = (order: any) => {
        setEditingOrder(order.id);
        setEditForm({
            delivery_address: order.location || order.delivery_address || '',
            location: order.location || '',
            notes: order.notes || ''
        });
    };

    const handleSaveEdit = async (orderId: string) => {
        try {
            await db.updateOrder(orderId, {
                delivery_address: editForm.delivery_address || editForm.location,
                location: editForm.location || editForm.delivery_address,
                notes: editForm.notes
            });
            setEditingOrder(null);
            setEditForm({});
            notify('Order updated successfully', 'success');
        } catch (error) {
            handleError(error, notify);
        }
    };

    const handleCancelEdit = () => {
        setEditingOrder(null);
        setEditForm({});
    };

    const handleCancelOrder = async (orderId: string) => {
        if (!cancelReason.trim()) {
            notify('Please provide a cancellation reason', 'warning');
            return;
        }

        try {
            setCancellingOrder(orderId);
            await db.cancelOrder(orderId, cancelReason);
            setCancellingOrder(null);
            setCancelReason('');
            notify('Order cancelled successfully', 'success');
        } catch (error: any) {
            handleError(error, notify);
            setCancellingOrder(null);
        }
    };

    const handleDeleteOrder = async (orderId: string) => {
        if (!confirm('Are you sure you want to delete this order? This action cannot be undone.')) {
            return;
        }

        try {
            setDeletingOrder(orderId);
            await db.deleteOrder(orderId);
            setDeletingOrder(null);
            notify('Order deleted successfully', 'success');
        } catch (error: any) {
            handleError(error, notify);
            setDeletingOrder(null);
        }
    };

    const TimelineStep = ({ active, completed, label, icon: Icon, isLast, timestamp, estimate }: any) => (
        <div className={`flex flex-col items-center flex-1 relative ${isLast ? '' : ''}`}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center z-10 border-2 transition-all duration-300 ${
                completed ? 'bg-emerald-600 border-emerald-600 text-white shadow-[0_0_15px_rgba(16,185,129,0.5)] scale-110' : 
                active ? 'bg-white dark:bg-[#0F172A] border-blue-600 text-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.4)] scale-110 animate-pulse' : 
                'bg-white dark:bg-[#0F172A] border-gray-300 dark:border-gray-700 text-gray-300'
            }`}>
                <Icon size={16} />
            </div>
            <div className="mt-2 text-center">
                <span className={`text-[11px] font-bold uppercase block ${
                    completed ? 'text-emerald-600 dark:text-emerald-400' : active ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'
            }`}>{label}</span>
                {timestamp && (
                    <span className="text-[9px] text-gray-500 dark:text-gray-400 mt-1 block">{timestamp}</span>
                )}
                {estimate && active && !completed && (
                    <span className="text-[9px] text-blue-500 dark:text-blue-400 mt-0.5 block font-medium">{estimate}</span>
                )}
            </div>
            {!isLast && (
                <div className={`absolute top-5 left-1/2 w-full h-1 -z-0 transition-all duration-500 ${
                    completed ? 'bg-emerald-600' : active ? 'bg-blue-300 dark:bg-blue-700' : 'bg-gray-200 dark:bg-gray-600'
                }`} style={{ transform: 'translateX(-50%)' }}></div>
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
                    <p>Date: {order.date || new Date().toLocaleString()}</p>
                    <p>Receipt #: {order.orderId || order.id.slice(0, 8).toUpperCase()}</p>
                    <p>Customer: {order.customer || order.patient_name || 'Customer'}</p>
                    {order.pharmacy_name && (
                        <p>Pharmacy: {order.pharmacy_name}</p>
                    )}
                    {order.pharmacy_branch && (
                        <p>Branch: {order.pharmacy_branch}</p>
                    )}
                    {order.pharmacy_location && (
                        <p>Location: {order.pharmacy_location}</p>
                    )}
                    <p>Delivery: {order.location}</p>
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

    // Cancel Order Modal
    const CancelOrderModal = ({ orderId, onClose, onConfirm }: { orderId: string; onClose: () => void; onConfirm: (reason: string) => void }) => (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white dark:bg-[#0F172A] w-full max-w-md rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden animate-in zoom-in-95">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center">
                            <AlertCircle className="text-amber-600 dark:text-amber-400" size={24} />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">Cancel Order</h3>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                        Please provide a reason for cancelling this order. The inventory will be restored automatically.
                    </p>
                </div>
                
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                            Cancellation Reason <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            value={cancelReason}
                            onChange={(e) => setCancelReason(e.target.value)}
                            placeholder="e.g., Change of mind, wrong address, found alternative..."
                            rows={4}
                            className="w-full px-4 py-3 text-sm rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0A1B2E] text-gray-900 dark:text-white focus:ring-4 focus:ring-amber-100 dark:focus:ring-amber-900/30 focus:border-amber-400 dark:focus:border-amber-600 outline-none transition-all resize-none"
                            required
                        />
                    </div>
                    
                    <div className="flex gap-3 pt-2">
                        <button
                            onClick={onClose}
                            className="flex-1 px-4 py-3 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl font-bold transition-all"
                        >
                            Keep Order
                        </button>
                        <button
                            onClick={() => {
                                if (cancelReason.trim()) {
                                    onConfirm(cancelReason);
                                } else {
                                    notify('Please provide a cancellation reason', 'warning');
                                }
                            }}
                            disabled={cancellingOrder === orderId || !cancelReason.trim()}
                            className="flex-1 px-4 py-3 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2"
                        >
                            {cancellingOrder === orderId ? (
                                <>
                                    <RefreshCw size={16} className="animate-spin" />
                                    Cancelling...
                                </>
                            ) : (
                                <>
                                    <X size={16} />
                                    Cancel Order
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <>
            {viewingReceipt && <ReceiptModal order={viewingReceipt} onClose={() => setViewingReceipt(null)} />}
            {cancellingOrder && (
                <CancelOrderModal 
                    orderId={cancellingOrder} 
                    onClose={() => {
                        setCancellingOrder(null);
                        setCancelReason('');
                    }}
                    onConfirm={(reason) => {
                        if (reason && reason.trim()) {
                            handleCancelOrder(cancellingOrder);
                        } else {
                            notify('Please provide a cancellation reason', 'warning');
                        }
                    }}
                />
            )}
            
            <PullToRefresh onRefresh={handleRefresh} disabled={loading}>
                <div className="space-y-6 animate-in fade-in duration-500 pb-20">
                    <div className="flex flex-col gap-4">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div>
                                <h2 className="text-2xl font-bold font-display text-gray-900 dark:text-white">{user?.role === UserRole.PATIENT ? 'My Orders' : 'Pharmacy Orders'}</h2>
                                <p className="text-gray-500 dark:text-gray-300">{user?.role === UserRole.PATIENT ? 'Track your medication deliveries.' : 'Track and fulfill incoming medication requests.'}</p>
                            </div>
                            {user?.role === UserRole.PATIENT && onNavigate && (
                                <button
                                    onClick={() => onNavigate('pharmacy')}
                                    className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-blue-600/20 transition-all hover:scale-105 active:scale-95"
                                >
                                    <ShoppingCart size={20} />
                                    Browse Pharmacy
                                    <ArrowRight size={18} />
                                </button>
                            )}
                        </div>
                        
                        {/* Search and Filter Bar */}
                        {orders.length > 0 && (
                            <div className="flex flex-col md:flex-row gap-3 bg-white dark:bg-[#0F172A] rounded-2xl p-4 border border-gray-200 dark:border-gray-700/50">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                    <input
                                        type="text"
                                        placeholder="Search by order ID, medicine name..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-[#0A1B2E] border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm text-gray-900 dark:text-white"
                                    />
                                </div>
                                <div className="relative">
                                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                    <select
                                        value={statusFilter}
                                        onChange={(e) => setStatusFilter(e.target.value)}
                                        className="pl-10 pr-8 py-2.5 bg-gray-50 dark:bg-[#0A1B2E] border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm text-gray-900 dark:text-white font-medium appearance-none cursor-pointer"
                                    >
                                        <option value="ALL">All Status</option>
                                        <option value="PENDING">Pending</option>
                                        <option value="PROCESSING">Processing</option>
                                        <option value="DISPATCHED">Dispatched</option>
                                        <option value="DELIVERED">Delivered</option>
                                        <option value="CANCELLED">Cancelled</option>
                                    </select>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 gap-6">
                {loading ? (
                    <SkeletonLoader type="list" count={3} />
                ) : orders.length === 0 ? (
                    <div className="bg-gradient-to-br from-blue-50 via-white to-teal-50 dark:from-gray-900 dark:via-[#0F172A] dark:to-gray-900 rounded-3xl p-12 border border-gray-200 dark:border-gray-700/50">
                        <div className="max-w-md mx-auto text-center">
                            <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
                                <ShoppingBag className="text-blue-600 dark:text-blue-400" size={48} />
                            </div>
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">No Orders Yet</h3>
                            <p className="text-gray-600 dark:text-gray-400 mb-8 leading-relaxed">
                                {user?.role === UserRole.PATIENT 
                                    ? "Start shopping for your health needs! Browse our verified pharmacy network and get authentic medicines delivered to your door."
                            : "No orders to fulfill. Orders will appear here when patients place them."}
                            </p>
                            
                            {user?.role === UserRole.PATIENT && onNavigate && (
                                <>
                                    <button
                                        onClick={() => onNavigate('pharmacy')}
                                        className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-blue-600/30 transition-all hover:scale-105 active:scale-95 mb-4"
                                    >
                                        <Sparkles size={20} />
                                        Start Shopping
                                        <ArrowRight size={20} />
                                    </button>
                                    <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700">
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 font-medium">Quick Tips:</p>
                                        <div className="text-left space-y-2 text-sm text-gray-600 dark:text-gray-400">
                                            <div className="flex items-start gap-2">
                                                <CheckCircle className="text-emerald-500 mt-0.5 flex-shrink-0" size={16} />
                                                <span>Browse by category or search for specific medicines</span>
                                            </div>
                                            <div className="flex items-start gap-2">
                                                <CheckCircle className="text-emerald-500 mt-0.5 flex-shrink-0" size={16} />
                                                <span>View pharmacy details, branches, and locations</span>
                                            </div>
                                            <div className="flex items-start gap-2">
                                                <CheckCircle className="text-emerald-500 mt-0.5 flex-shrink-0" size={16} />
                                                <span>Track orders in real-time from here</span>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                ) : (
                    orders
                        .filter((order) => {
                            const matchesSearch = !searchQuery || 
                                order.orderId.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                order.items.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                order.pharmacy_name.toLowerCase().includes(searchQuery.toLowerCase());
                            const matchesStatus = statusFilter === 'ALL' || order.status === statusFilter;
                            return matchesSearch && matchesStatus;
                        })
                        .map((order) => (
                        <div key={order.id} className="bg-white dark:bg-[#0F172A] rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-700/50 transition-all hover:shadow-lg">
                            <div className="flex flex-col md:flex-row justify-between items-start mb-6 pb-6 border-b border-gray-100 dark:border-gray-700/50 gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-3 flex-wrap">
                                        <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-lg">
                                            #{order.orderId}
                                        </span>
                                        <span className="text-xs text-gray-400 flex items-center gap-1">
                                            <Clock size={12} /> {order.date}
                                        </span>
                                        <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                                            order.payment_status === 'PAID' || order.payment_status === 'COMPLETED'
                                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                                : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                        }`}>
                                            {order.payment_status === 'PAID' || order.payment_status === 'COMPLETED' ? 'Paid' : 'Pending Payment'}
                                        </span>
                                    </div>
                                    
                                    {/* Pharmacy Info */}
                                    {order.pharmacy_name && (
                                        <div className="bg-gray-50 dark:bg-[#0A1B2E] rounded-xl p-4 mb-3">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Store className="text-blue-600 dark:text-blue-400" size={18} />
                                                <h4 className="font-bold text-gray-900 dark:text-white">{order.pharmacy_name}</h4>
                                            </div>
                                            {order.pharmacy_branch && (
                                                <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1 mb-1">
                                                    <Building2 size={14} />
                                                    {order.pharmacy_branch}
                                                </p>
                                            )}
                                            {order.pharmacy_location && (
                                                <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                                                    <MapPin size={14} />
                                                    {order.pharmacy_location}
                                                </p>
                                            )}
                                        </div>
                                    )}
                                    
                                    {/* Order Items */}
                                    <div className="mb-3">
                                        <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-2">Order Items</h3>
                                        {order.items_list && order.items_list.length > 0 ? (
                                            <div className="space-y-2">
                                                {order.items_list.map((item: any, idx: number) => (
                                                    <div key={idx} className="flex justify-between items-center text-sm">
                                                        <span className="text-gray-700 dark:text-gray-300">
                                                            {item.quantity}x {item.name || item.medicine_name || 'Medicine'}
                                                        </span>
                                                        <span className="font-bold text-gray-900 dark:text-white">
                                                            TZS {((item.price || 0) * (item.quantity || 1)).toLocaleString()}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-gray-600 dark:text-gray-400">{order.items}</p>
                                        )}
                                    </div>
                                    
                                    {/* Delivery Address - Editable for Patients */}
                                    <div className="mb-3">
                                        <p className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1">
                                            <MapPin size={14}/> Delivery Address:
                                        </p>
                                        {editingOrder === order.id ? (
                                            <div className="space-y-3">
                                                <input
                                                    type="text"
                                                    value={editForm.location || editForm.delivery_address || ''}
                                                    onChange={(e) => setEditForm({ ...editForm, location: e.target.value, delivery_address: e.target.value })}
                                                    placeholder="Enter delivery address"
                                                    className="w-full px-4 py-3 text-sm rounded-xl border-2 border-blue-300 dark:border-blue-600 bg-white dark:bg-[#0A1B2E] text-gray-900 dark:text-white focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/30 outline-none transition-all"
                                                />
                                                <textarea
                                                    value={editForm.notes || ''}
                                                    onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                                                    placeholder="Additional notes (optional)"
                                                    rows={2}
                                                    className="w-full px-4 py-3 text-sm rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0A1B2E] text-gray-900 dark:text-white focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/30 outline-none transition-all resize-none"
                                                />
                                            </div>
                                        ) : (
                                            <p className="text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-[#0A1B2E] rounded-xl p-3 border border-gray-200 dark:border-gray-700">
                                                {order.location || order.delivery_address || 'Not specified'}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <div className="text-right md:ml-6">
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total Amount</p>
                                    <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">TZS {order.total.toLocaleString()}</p>
                                </div>
                            </div>

                            {/* Tracking Timeline */}
                            <div className="mb-6">
                                <div className="flex justify-between items-center mb-4">
                                    <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Order Status</h4>
                                    {(() => {
                                        const progress = order.status === 'PENDING' ? 25 : 
                                                       order.status === 'PROCESSING' ? 50 : 
                                                       order.status === 'DISPATCHED' ? 75 : 100;
                                        return (
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-gray-500 dark:text-gray-400">{progress}% Complete</span>
                                                <div className="w-24 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                                    <div 
                                                        className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all duration-500"
                                                        style={{ width: `${progress}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </div>
                                <div className="bg-gray-50 dark:bg-[#0A1B2E] rounded-2xl p-6 border border-gray-200 dark:border-gray-700/50">
                                    {order.status === 'CANCELLED' ? (
                                        <div className="text-center py-4">
                                            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
                                                <X className="text-red-600 dark:text-red-400" size={24} />
                                            </div>
                                            <h4 className="font-bold text-red-600 dark:text-red-400 mb-2">Order Cancelled</h4>
                                            {order.cancellation_reason && (
                                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                                                    Reason: {order.cancellation_reason}
                                                </p>
                                            )}
                                            <p className="text-xs text-gray-500 dark:text-gray-500">
                                                {order.status_timestamps?.cancelled_at?.toLocaleDateString('en-US', { 
                                                    month: 'short', 
                                                    day: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                }) || order.date}
                                            </p>
                                        </div>
                                    ) : (
                                    <div className="flex justify-between w-full max-w-3xl mx-auto">
                                    <TimelineStep 
                                            label="Order Placed" 
                                        icon={CheckCircle} 
                                        active={true} 
                                            completed={order.status !== 'PENDING'} 
                                            timestamp={order.status_timestamps?.placed ? order.status_timestamps.placed.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : order.date.split(',')[1]?.trim()}
                                    />
                                    <TimelineStep 
                                        label="Processing" 
                                        icon={Package} 
                                            active={order.status === 'PROCESSING' || order.status === 'DISPATCHED'} 
                                            completed={order.status === 'DISPATCHED' || order.status === 'DELIVERED'} 
                                            timestamp={order.status_timestamps?.processing?.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                            estimate={order.status === 'PROCESSING' ? '15-30 mins' : null}
                                    />
                                    <TimelineStep 
                                        label="Dispatched" 
                                        icon={Truck} 
                                            active={order.status === 'DISPATCHED'} 
                                            completed={order.status === 'DELIVERED'} 
                                            timestamp={order.status_timestamps?.dispatched?.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                            estimate={order.status === 'DISPATCHED' ? '30-60 mins' : null}
                                    />
                                    <TimelineStep 
                                        label="Delivered" 
                                        icon={MapPin} 
                                            active={order.status === 'DELIVERED'} 
                                            completed={order.status === 'DELIVERED'} 
                                            timestamp={order.status_timestamps?.delivered?.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                        isLast={true} 
                                    />
                                    </div>
                                    )}
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex justify-between items-center bg-gradient-to-r from-gray-50 to-blue-50/50 dark:from-[#0A1B2E] dark:to-blue-900/10 p-4 rounded-xl border border-gray-200 dark:border-gray-700/50">
                                <div className="flex items-center gap-3">
                                    <div className="text-sm">
                                        <span className="text-gray-500 dark:text-gray-400">Status:</span>
                                        <span className={`ml-2 font-bold px-3 py-1 rounded-full text-xs ${
                                            order.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                                            order.status === 'PROCESSING' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                                            order.status === 'DISPATCHED' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' :
                                            order.status === 'CANCELLED' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                                            order.status === 'DELIVERED' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                                            'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400'
                                        }`}>
                                            {order.status === 'PENDING' ? 'Pending' :
                                             order.status === 'PROCESSING' ? 'Processing' :
                                             order.status === 'DISPATCHED' ? 'On the Way' :
                                             order.status === 'CANCELLED' ? 'Cancelled' :
                                             order.status === 'DELIVERED' ? 'Delivered' : order.status}
                                        </span>
                                    </div>
                                </div>
                                
                                <div className="flex flex-wrap gap-2">
                                    {user?.role !== UserRole.PHARMACY ? (
                                        /* Patient Actions */
                                        <>
                                            {/* Edit Order (only for PENDING or CANCELLED) */}
                                            {(order.status === 'PENDING' || order.status === 'CANCELLED') && editingOrder !== order.id && (
                                                <button 
                                                    onClick={() => handleEditOrder(order)}
                                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold flex items-center gap-2 shadow-lg shadow-blue-600/20 transition-all"
                                                >
                                                    <Edit size={16} /> Edit Order
                                                </button>
                                            )}

                                            {/* Save Edit */}
                                            {editingOrder === order.id && (
                                                <>
                                                    <button 
                                                        onClick={() => handleSaveEdit(order.id)}
                                                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-bold flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition-all"
                                                    >
                                                        <Save size={16} /> Save Changes
                                                    </button>
                                                    <button 
                                                        onClick={handleCancelEdit}
                                                        className="px-4 py-2 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-sm font-bold flex items-center gap-2 transition-all"
                                                    >
                                                        <X size={16} /> Cancel
                                                    </button>
                                                </>
                                            )}

                                            {/* Cancel Order (only for PENDING or PROCESSING) */}
                                            {(order.status === 'PENDING' || order.status === 'PROCESSING') && editingOrder !== order.id && (
                                                <button 
                                                    onClick={() => {
                                                        setCancellingOrder(order.id);
                                                        setCancelReason('');
                                                    }}
                                                    disabled={cancellingOrder === order.id}
                                                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-bold flex items-center gap-2 shadow-lg shadow-amber-600/20 transition-all"
                                                >
                                                    {cancellingOrder === order.id ? (
                                                        <>
                                                            <RefreshCw size={16} className="animate-spin" />
                                                            Cancelling...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <X size={16} />
                                                            Cancel Order
                                                        </>
                                                    )}
                                                </button>
                                            )}

                                            {/* Delete Order (only for PENDING or CANCELLED) */}
                                            {(order.status === 'PENDING' || order.status === 'CANCELLED') && editingOrder !== order.id && (
                                                <button 
                                                    onClick={() => handleDeleteOrder(order.id)}
                                                    disabled={deletingOrder === order.id}
                                                    className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-bold flex items-center gap-2 shadow-lg shadow-red-600/20 transition-all"
                                                >
                                                    {deletingOrder === order.id ? (
                                                        <RefreshCw size={16} className="animate-spin" />
                                                    ) : (
                                                        <Trash2 size={16} />
                                                    )}
                                                    {deletingOrder === order.id ? 'Deleting...' : 'Delete'}
                                                </button>
                                            )}

                                            {/* Track Delivery */}
                                            {order.status === 'DISPATCHED' && (
                                                <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold flex items-center gap-2 shadow-lg shadow-blue-600/20 transition-all">
                                                    <Truck size={16} /> Track Delivery
                                        </button>
                                    )}
                                    
                                            {/* Buy Again & View Receipt for Delivered Orders */}
                                    {(order.status === 'DELIVERED' || order.status === 'Delivered') && (
                                        <>
                                            <button 
                                                onClick={() => {
                                                    if (onNavigate) {
                                                        onNavigate('pharmacy');
                                                    }
                                                    notify('Navigate to Pharmacy to reorder', 'info');
                                                }}
                                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold flex items-center gap-2 shadow-lg shadow-blue-600/20 transition-all"
                                                title="Buy these items again"
                                            >
                                                <ShoppingBag size={16} /> Buy Again
                                            </button>
                                                    <button 
                                                        onClick={() => setViewingReceipt(order)} 
                                                        className="px-4 py-2 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-sm font-bold flex items-center gap-2 transition-all"
                                                    >
                                                <Eye size={16} /> View Receipt
                                        </button>
                                                </>
                                            )}
                                        </>
                                    ) : (
                                        /* Pharmacy Actions */
                                        <>
                                            {(order.status === 'PENDING' || order.status === 'PROCESSING') && (
                                                <button onClick={() => handleStatusChange(order.id, 'DISPATCHED')} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold flex items-center gap-2 shadow-lg shadow-blue-600/20 transition-all">
                                                    <Truck size={16} /> Dispatch Order
                                                </button>
                                            )}
                                            {order.status === 'DISPATCHED' && (
                                                <button onClick={() => handleStatusChange(order.id, 'DELIVERED')} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-bold flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition-all">
                                                    <CheckCircle size={16} /> Mark Delivered
                                                </button>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                )}
                    </div>
                </div>
            </PullToRefresh>
        </>
    );
};

export const Orders = memo(OrdersComponent, (prevProps, nextProps) => {
  // Custom comparison for memo
  return prevProps.user?.id === nextProps.user?.id && 
         prevProps.user?.role === nextProps.user?.role;
});

Orders.displayName = 'Orders';
