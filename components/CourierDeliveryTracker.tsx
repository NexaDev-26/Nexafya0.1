/**
 * Courier Tracking & OTP Verification System
 * Handles the full lifecycle of order delivery with OTP proof
 */

import React, { useState, useEffect } from 'react';
import { Package, MapPin, Truck, CheckCircle, Clock, Phone, Shield, Navigation } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from './NotificationSystem';
import { useCourierTracking } from '../hooks/useFirestore';
import { updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db as firestore } from '../lib/firebase';

interface CourierDeliveryProps {
  orderId: string;
  onComplete?: () => void;
}

// Generate 6-digit OTP
const generateOTP = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const CourierDeliveryTracker: React.FC<CourierDeliveryProps> = ({
  orderId,
  onComplete
}) => {
  const { user } = useAuth();
  const { notify } = useNotification();
  const { data: orderData, loading } = useCourierTracking(orderId);

  const [deliveryOTP, setDeliveryOTP] = useState('');
  const [enteredOTP, setEnteredOTP] = useState('');
  const [currentLocation, setCurrentLocation] = useState<GeolocationPosition | null>(null);
  const [trackingHistory, setTrackingHistory] = useState<any[]>([]);

  // Get current location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => setCurrentLocation(position),
        (error) => console.error('Geolocation error:', error)
      );
    }
  }, []);

  // Generate OTP when order is out for delivery
  useEffect(() => {
    if (orderData?.status === 'OUT_FOR_DELIVERY' && !deliveryOTP) {
      const otp = generateOTP();
      setDeliveryOTP(otp);
      // In real app, send this OTP to customer via SMS/Email
      console.log('Delivery OTP:', otp); // For demo purposes
    }
  }, [orderData?.status]);

  const updateOrderStatus = async (newStatus: string, notes?: string) => {
    try {
      const orderRef = doc(firestore, 'orders', orderId);
      const updateData: any = {
        status: newStatus,
        updatedAt: serverTimestamp()
      };

      if (currentLocation) {
        updateData.courierLocation = {
          latitude: currentLocation.coords.latitude,
          longitude: currentLocation.coords.longitude,
          timestamp: new Date()
        };
      }

      if (notes) {
        updateData.deliveryNotes = notes;
      }

      if (newStatus === 'DELIVERED') {
        updateData.deliveredAt = serverTimestamp();
        updateData.deliveryProof = {
          otp: enteredOTP,
          verifiedAt: new Date(),
          courierId: user?.id
        };
      }

      await updateDoc(orderRef, updateData);

      // Add to tracking history
      setTrackingHistory([
        ...trackingHistory,
        {
          status: newStatus,
          timestamp: new Date(),
          location: currentLocation ? {
            lat: currentLocation.coords.latitude,
            lng: currentLocation.coords.longitude
          } : null
        }
      ]);

      notify(`Order status updated to: ${newStatus}`, 'success');
    } catch (error) {
      console.error('Failed to update order:', error);
      notify('Failed to update order status', 'error');
    }
  };

  const handleAcceptOrder = async () => {
    await updateOrderStatus('ACCEPTED', 'Courier accepted the delivery');
  };

  const handleStartDelivery = async () => {
    if (!currentLocation) {
      notify('Please enable location services', 'warning');
      return;
    }
    await updateOrderStatus('OUT_FOR_DELIVERY', 'Order is out for delivery');
  };

  const handleCompleteDelivery = async () => {
    if (enteredOTP !== deliveryOTP) {
      notify('Invalid OTP! Please verify with customer', 'error');
      return;
    }

    await updateOrderStatus('DELIVERED', 'Order delivered successfully');
    notify('Delivery completed! Payment processed', 'success');
    
    if (onComplete) {
      onComplete();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner" />
      </div>
    );
  }

  if (!orderData) {
    return (
      <div className="text-center p-8">
        <p className="text-gray-500">Order not found</p>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case 'ACCEPTED': return 'bg-blue-100 text-blue-800';
      case 'OUT_FOR_DELIVERY': return 'bg-purple-100 text-purple-800';
      case 'DELIVERED': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING': return <Clock size={20} />;
      case 'ACCEPTED': return <CheckCircle size={20} />;
      case 'OUT_FOR_DELIVERY': return <Truck size={20} />;
      case 'DELIVERED': return <Package size={20} />;
      default: return <Clock size={20} />;
    }
  };

  return (
    <div className="bg-white dark:bg-[#0F172A] rounded-3xl p-6 space-y-6 max-w-2xl mx-auto">
      {/* Order Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Order #{orderId.slice(0, 8)}
          </h2>
          <p className="text-gray-500">Customer: {orderData.customerName || 'Patient'}</p>
        </div>
        <span className={`px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2 ${getStatusColor(orderData.status)}`}>
          {getStatusIcon(orderData.status)}
          {orderData.status}
        </span>
      </div>

      {/* Delivery Address */}
      <div className="card-medical bg-blue-50">
        <div className="flex items-start gap-3">
          <MapPin className="text-nexafya-blue mt-1" size={20} />
          <div>
            <p className="font-bold text-gray-900">Delivery Address</p>
            <p className="text-gray-600 text-sm">
              {orderData.deliveryAddress || 'Address not available'}
            </p>
            <p className="text-gray-500 text-xs mt-1">
              Phone: {orderData.customerPhone || 'Not provided'}
            </p>
          </div>
        </div>
      </div>

      {/* Order Items */}
      <div className="card-medical">
        <h3 className="font-bold text-lg mb-3">Order Items</h3>
        <div className="space-y-2">
          {orderData.items?.map((item: any, index: number) => (
            <div key={index} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
              <div>
                <p className="font-medium text-gray-900">{item.name || item.medication}</p>
                <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
              </div>
              <p className="font-bold text-nexafya-blue">
                {item.price ? `${item.price} TZS` : 'Price N/A'}
              </p>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t-2 border-gray-200 flex justify-between items-center">
          <span className="font-bold text-lg">Total</span>
          <span className="font-bold text-2xl text-nexafya-blue">
            {orderData.totalAmount || 0} TZS
          </span>
        </div>
      </div>

      {/* Action Buttons based on Status */}
      {orderData.status === 'PENDING' && user?.role === 'COURIER' && (
        <div className="space-y-3">
          <button
            onClick={handleAcceptOrder}
            className="w-full btn-primary flex items-center justify-center gap-2"
          >
            <CheckCircle size={20} />
            Accept Delivery
          </button>
        </div>
      )}

      {orderData.status === 'ACCEPTED' && user?.role === 'COURIER' && (
        <div className="space-y-3">
          <button
            onClick={handleStartDelivery}
            className="w-full btn-primary flex items-center justify-center gap-2"
            disabled={!currentLocation}
          >
            <Truck size={20} />
            {currentLocation ? 'Start Delivery' : 'Enable Location First'}
          </button>
          {!currentLocation && (
            <p className="text-xs text-center text-orange-600">
              Location services are required for delivery tracking
            </p>
          )}
        </div>
      )}

      {orderData.status === 'OUT_FOR_DELIVERY' && user?.role === 'COURIER' && (
        <div className="space-y-4">
          {/* OTP Display for Courier */}
          <div className="card-medical bg-green-50 border-2 border-green-200">
            <div className="text-center">
              <Shield className="text-green-600 mx-auto mb-2" size={32} />
              <p className="text-sm font-bold text-green-800 mb-2">
                Customer's OTP (For Verification)
              </p>
              <p className="text-3xl font-mono font-bold text-green-900 tracking-widest">
                {deliveryOTP}
              </p>
              <p className="text-xs text-green-700 mt-2">
                Customer must provide this code upon delivery
              </p>
            </div>
          </div>

          {/* OTP Input */}
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
              Enter Customer's OTP
            </label>
            <input
              type="text"
              value={enteredOTP}
              onChange={(e) => setEnteredOTP(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="Enter 6-digit code"
              className="input-medical text-center text-2xl font-mono tracking-widest"
              maxLength={6}
            />
          </div>

          <button
            onClick={handleCompleteDelivery}
            disabled={enteredOTP.length !== 6}
            className="w-full btn-secondary flex items-center justify-center gap-2"
          >
            <Package size={20} />
            Complete Delivery
          </button>
        </div>
      )}

      {orderData.status === 'DELIVERED' && (
        <div className="card-medical bg-green-50 border-2 border-green-200 text-center">
          <CheckCircle className="text-green-600 mx-auto mb-3" size={48} />
          <h3 className="text-xl font-bold text-green-900 mb-2">
            Delivery Completed!
          </h3>
          <p className="text-sm text-green-700">
            Delivered on {orderData.deliveredAt?.toDate?.()?.toLocaleString() || 'Just now'}
          </p>
          {orderData.deliveryProof && (
            <div className="mt-4 pt-4 border-t border-green-200">
              <p className="text-xs text-green-600">Verified with OTP</p>
              <p className="font-mono text-lg font-bold text-green-900">
                {orderData.deliveryProof.otp}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Current Location Display */}
      {currentLocation && user?.role === 'COURIER' && (
        <div className="card-medical bg-purple-50">
          <div className="flex items-center gap-2 mb-2">
            <Navigation className="text-purple-600" size={20} />
            <span className="font-bold text-purple-900">Your Current Location</span>
          </div>
          <p className="text-sm text-gray-600">
            Lat: {currentLocation.coords.latitude.toFixed(6)}, 
            Lng: {currentLocation.coords.longitude.toFixed(6)}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Accuracy: ±{currentLocation.coords.accuracy.toFixed(0)}m
          </p>
        </div>
      )}
    </div>
  );
};

export default CourierDeliveryTracker;

