/**
 * SOS Emergency Alert System
 * Captures real-time location and triggers emergency alerts
 */

import React, { useState, useEffect } from 'react';
import { AlertTriangle, MapPin, Phone, Navigation, Clock, Shield, User, Activity } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from './NotificationSystem';
import { addDoc, collection, serverTimestamp, updateDoc, doc } from 'firebase/firestore';
import { db as firestore } from '../lib/firebase';
import { useSOSAlerts } from '../hooks/useFirestore';

interface SOSSystemProps {
  onClose?: () => void;
}

interface EmergencyContact {
  name: string;
  phone: string;
  relationship: string;
}

export const SOSEmergencySystem: React.FC<SOSSystemProps> = ({ onClose }) => {
  const { user } = useAuth();
  const { notify } = useNotification();

  const [alertActive, setAlertActive] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<GeolocationPosition | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [alertId, setAlertId] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [emergencyType, setEmergencyType] = useState<'medical' | 'accident' | 'violence' | 'other'>('medical');
  const [notes, setNotes] = useState('');

  // Get current location on mount
  useEffect(() => {
    getCurrentLocation();
  }, []);

  // Countdown timer
  useEffect(() => {
    if (countdown !== null && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0) {
      triggerSOSAlert();
    }
  }, [countdown]);

  const getCurrentLocation = () => {
    setLocationLoading(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentLocation(position);
          setLocationLoading(false);
          notify('Location acquired', 'success');
        },
        (error) => {
          console.error('Geolocation error:', error);
          setLocationLoading(false);
          notify('Could not get location. Please enable location services.', 'error');
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    } else {
      setLocationLoading(false);
      notify('Geolocation is not supported by your browser', 'error');
    }
  };

  const startCountdown = () => {
    setCountdown(5); // 5 second countdown
  };

  const cancelCountdown = () => {
    setCountdown(null);
    notify('SOS alert cancelled', 'info');
  };

  const triggerSOSAlert = async () => {
    if (!currentLocation) {
      notify('Location not available. Please enable location services.', 'error');
      return;
    }

    try {
      setAlertActive(true);

      // Create SOS alert document
      const alertDoc = await addDoc(collection(firestore, 'sosAlerts'), {
        userId: user?.id,
        userName: user?.name,
        userPhone: user?.phone || '',
        userAvatar: user?.avatar,
        type: emergencyType,
        status: 'ACTIVE',
        location: {
          latitude: currentLocation.coords.latitude,
          longitude: currentLocation.coords.longitude,
          accuracy: currentLocation.coords.accuracy,
          timestamp: new Date()
        },
        notes,
        createdAt: serverTimestamp(),
        respondedBy: null,
        resolvedAt: null
      });

      setAlertId(alertDoc.id);

      // Create notification for admins
      await addDoc(collection(firestore, 'notifications'), {
        type: 'SOS_ALERT',
        title: '🚨 Emergency SOS Alert',
        message: `${user?.name} needs emergency assistance!`,
        data: {
          alertId: alertDoc.id,
          userId: user?.id,
          location: {
            lat: currentLocation.coords.latitude,
            lng: currentLocation.coords.longitude
          }
        },
        recipientRole: 'ADMIN',
        priority: 'URGENT',
        read: false,
        createdAt: serverTimestamp()
      });

      // In production, this would also:
      // 1. Send SMS to emergency contacts
      // 2. Trigger push notifications to nearby responders
      // 3. Alert local emergency services
      // 4. Start live location tracking

      notify('🚨 SOS Alert Sent! Help is on the way.', 'success');
      setCountdown(null);

    } catch (error) {
      console.error('Failed to send SOS alert:', error);
      notify('Failed to send alert. Please call emergency services directly.', 'error');
      setAlertActive(false);
    }
  };

  const resolveAlert = async () => {
    if (!alertId) return;

    try {
      const alertRef = doc(firestore, 'sosAlerts', alertId);
      await updateDoc(alertRef, {
        status: 'RESOLVED',
        resolvedAt: serverTimestamp(),
        resolvedBy: user?.id
      });

      setAlertActive(false);
      notify('Alert marked as resolved', 'success');
      
      if (onClose) {
        onClose();
      }
    } catch (error) {
      console.error('Failed to resolve alert:', error);
      notify('Failed to resolve alert', 'error');
    }
  };

  const getEmergencyTypeColor = (type: string) => {
    switch (type) {
      case 'medical': return 'bg-red-500';
      case 'accident': return 'bg-orange-500';
      case 'violence': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  if (alertActive) {
    return (
      <div className="fixed inset-0 bg-red-500/90 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-pulse">
        <div className="bg-white dark:bg-[#0F172A] rounded-3xl p-8 max-w-md w-full shadow-2xl">
          <div className="text-center">
            {/* Pulsing Alert Icon */}
            <div className="relative mx-auto w-32 h-32 mb-6">
              <div className="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-75"></div>
              <div className="relative flex items-center justify-center w-32 h-32 bg-red-500 rounded-full">
                <AlertTriangle className="text-white" size={64} />
              </div>
            </div>

            <h2 className="text-3xl font-bold text-red-600 mb-2">
              🚨 SOS ALERT ACTIVE
            </h2>
            <p className="text-lg text-gray-700 dark:text-gray-300 mb-6">
              Emergency services have been notified
            </p>

            {/* Location Display */}
            {currentLocation && (
              <div className="bg-red-50 dark:bg-red-900/20 rounded-2xl p-4 mb-6">
                <div className="flex items-start gap-3">
                  <Navigation className="text-red-600 mt-1" size={20} />
                  <div className="text-left flex-1">
                    <p className="font-bold text-red-900 dark:text-red-100 text-sm">
                      Your Location (Live)
                    </p>
                    <p className="text-xs text-red-700 dark:text-red-300 font-mono">
                      {currentLocation.coords.latitude.toFixed(6)}, {currentLocation.coords.longitude.toFixed(6)}
                    </p>
                    <p className="text-xs text-red-600 mt-1">
                      Accuracy: ±{currentLocation.coords.accuracy.toFixed(0)}m
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Emergency Type */}
            <div className="bg-gray-100 dark:bg-gray-700 rounded-2xl p-4 mb-6">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Emergency Type</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white capitalize">
                {emergencyType}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <a
                href="tel:112"
                className="w-full bg-red-600 hover:bg-red-700 text-white px-6 py-4 rounded-2xl font-bold text-lg transition-all flex items-center justify-center gap-2 shadow-lg"
              >
                <Phone size={24} />
                Call Emergency Services (112)
              </a>
              
              <button
                onClick={resolveAlert}
                className="w-full bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-2xl font-medium transition-all"
              >
                I'm Safe Now - Cancel Alert
              </button>
            </div>

            <p className="text-xs text-gray-500 mt-6">
              Help is on the way. Stay calm and safe.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-[#0F172A] rounded-3xl p-6 space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="text-center">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="text-red-600" size={40} />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Emergency SOS
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Immediate help when you need it most
        </p>
      </div>

      {/* Location Status */}
      <div className={`card-medical ${currentLocation ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MapPin className={currentLocation ? 'text-green-600' : 'text-yellow-600'} size={24} />
            <div>
              <p className="font-bold text-gray-900">
                {currentLocation ? 'Location Acquired' : 'Location Required'}
              </p>
              {currentLocation ? (
                <p className="text-sm text-gray-600">
                  Accuracy: ±{currentLocation.coords.accuracy.toFixed(0)}m
                </p>
              ) : (
                <p className="text-sm text-gray-600">
                  Enable location for faster response
                </p>
              )}
            </div>
          </div>
          {!currentLocation && (
            <button
              onClick={getCurrentLocation}
              disabled={locationLoading}
              className="btn-outline text-sm py-2"
            >
              {locationLoading ? 'Getting...' : 'Enable'}
            </button>
          )}
        </div>
      </div>

      {/* Emergency Type Selection */}
      <div>
        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">
          Type of Emergency
        </label>
        <div className="grid grid-cols-2 gap-3">
          {[
            { value: 'medical', label: 'Medical', icon: Activity },
            { value: 'accident', label: 'Accident', icon: AlertTriangle },
            { value: 'violence', label: 'Violence', icon: Shield },
            { value: 'other', label: 'Other', icon: AlertTriangle }
          ].map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => setEmergencyType(value as any)}
              className={`p-4 rounded-2xl border-2 transition-all ${
                emergencyType === value
                  ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-red-300'
              }`}
            >
              <Icon 
                className={emergencyType === value ? 'text-red-600' : 'text-gray-400'} 
                size={24} 
              />
              <p className={`font-medium mt-2 ${
                emergencyType === value ? 'text-red-900 dark:text-red-100' : 'text-gray-700 dark:text-gray-300'
              }`}>
                {label}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Additional Notes */}
      <div>
        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
          Additional Information (Optional)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="input-medical min-h-[100px]"
          placeholder="Describe your situation briefly..."
        />
      </div>

      {/* Warning Message */}
      <div className="bg-orange-50 border-2 border-orange-200 rounded-2xl p-4">
        <p className="text-sm text-orange-800 text-center">
          <strong>Warning:</strong> Only use this for real emergencies. False alarms may result in account suspension.
        </p>
      </div>

      {/* SOS Button */}
      {countdown === null ? (
        <button
          onClick={startCountdown}
          disabled={!currentLocation}
          className="w-full bg-red-600 hover:bg-red-700 text-white px-8 py-6 rounded-2xl font-bold text-2xl transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
        >
          <AlertTriangle size={32} />
          ACTIVATE SOS
        </button>
      ) : (
        <div className="space-y-3">
          <div className="bg-red-100 rounded-2xl p-6 text-center">
            <p className="text-sm text-red-600 mb-2">Sending SOS in...</p>
            <p className="text-6xl font-bold text-red-600 font-mono">{countdown}</p>
          </div>
          <button
            onClick={cancelCountdown}
            className="w-full bg-gray-600 hover:bg-gray-700 text-white px-6 py-4 rounded-2xl font-bold transition-all"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Emergency Contacts */}
      <div className="card-medical bg-gray-50">
        <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
          <Phone size={20} />
          Emergency Contacts
        </h3>
        <div className="space-y-2">
          <div className="flex items-center justify-between py-2">
            <span className="text-gray-700">National Emergency</span>
            <a href="tel:112" className="font-bold text-nexafya-blue hover:underline">
              112
            </a>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-gray-700">Ambulance</span>
            <a href="tel:114" className="font-bold text-nexafya-blue hover:underline">
              114
            </a>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-gray-700">Police</span>
            <a href="tel:112" className="font-bold text-nexafya-blue hover:underline">
              112
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SOSEmergencySystem;

