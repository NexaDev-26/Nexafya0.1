
import React, { useState, useEffect, useRef } from 'react';
import { Camera, Heart, Activity, X, Zap } from 'lucide-react';
import { useNotification } from './NotificationSystem';
import { useAuth } from '../contexts/AuthContext';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db as firestore } from '../lib/firebase';

interface VitalsScannerProps {
    onClose: () => void;
}

export const VitalsScanner: React.FC<VitalsScannerProps> = ({ onClose }) => {
    const { user } = useAuth();
    const { notify } = useNotification();
    const [step, setStep] = useState<'intro' | 'scanning' | 'results'>('intro');
    const [progress, setProgress] = useState(0);
    const videoRef = useRef<HTMLVideoElement>(null);
    const [results, setResults] = useState({ bpm: 0, spo2: 0 });

    const startScan = async () => {
        setStep('scanning');
        setProgress(0);
        
        // Simulate Camera Access
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch (e) {
            console.error("Camera access denied", e);
            notify("Camera access required for scanning.", "error");
            onClose();
            return;
        }

        // Simulate Scanning Process
        let p = 0;
        const interval = setInterval(() => {
            p += 2;
            setProgress(p);
            if (p >= 100) {
                clearInterval(interval);
                finishScan();
            }
        }, 100);
    };

    const finishScan = () => {
        // Stop Camera
        if (videoRef.current && videoRef.current.srcObject) {
            const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
            tracks.forEach(track => track.stop());
        }
        
        // Mock Results (Simulated rPPG)
        const bpm = Math.floor(Math.random() * (85 - 65) + 65);
        const spo2 = Math.floor(Math.random() * (99 - 96) + 96);
        setResults({ bpm, spo2 });
        setStep('results');

        // Save to DB automatically if user is logged in
        if (user) {
            saveToDb(bpm, spo2);
        }
    };

    const saveToDb = async (bpm: number, spo2: number) => {
        if (!user) return;
        
        try {
            // Save to Firestore
            await addDoc(collection(firestore, 'healthMetrics'), {
                userId: user.id,
                type: 'HEART_RATE',
                value: bpm,
                unit: 'bpm',
                source: 'AI_SCAN',
                recordedAt: serverTimestamp(),
                createdAt: serverTimestamp()
            });
            await addDoc(collection(firestore, 'healthMetrics'), {
                userId: user.id,
                type: 'SPO2',
                value: spo2,
                unit: '%',
                source: 'AI_SCAN',
                recordedAt: serverTimestamp(),
                createdAt: serverTimestamp()
            });
            notify("Vitals recorded to health history", "success");
        } catch (e) {
            console.error("Failed to save metrics", e);
            notify("Failed to save vitals", "error");
        }
    };

    return (
        <div className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white dark:bg-[#0F172A] w-full max-w-md rounded-[2rem] overflow-hidden relative shadow-2xl border border-gray-800 dark:border-gray-700/50">
                <button onClick={onClose} className="absolute top-4 right-4 z-20 p-2 bg-black/20 hover:bg-black/40 rounded-full text-white">
                    <X size={24} />
                </button>

                {step === 'intro' && (
                    <div className="p-8 text-center">
                        <div className="w-20 h-20 bg-red-100 dark:bg-red-900/20 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Heart size={40} className="animate-pulse" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">AI Vitals Scan</h2>
                        <p className="text-gray-500 mb-8">
                            We'll use your camera to detect subtle color changes in your face to estimate your heart rate and oxygen levels.
                        </p>
                        <button onClick={startScan} className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg transition-transform hover:scale-[1.02] flex items-center justify-center gap-2">
                            <Camera size={20} /> Start Scan
                        </button>
                    </div>
                )}

                {step === 'scanning' && (
                    <div className="relative h-96 bg-black">
                        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover opacity-80" />
                        <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
                            <div className="w-64 h-64 border-4 border-white/30 rounded-full flex items-center justify-center relative">
                                <div className="absolute inset-0 border-4 border-t-red-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin" style={{ animationDuration: '2s' }}></div>
                                <span className="text-4xl font-bold text-white font-mono">{progress}%</span>
                            </div>
                            <p className="text-white font-bold mt-8 bg-black/50 px-4 py-2 rounded-full backdrop-blur-sm">Keep your face still...</p>
                        </div>
                    </div>
                )}

                {step === 'results' && (
                    <div className="p-8 text-center animate-in zoom-in-95">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Scan Complete</h2>
                        
                        <div className="grid grid-cols-2 gap-4 mb-8">
                            <div className="bg-red-50 dark:bg-red-900/10 p-4 rounded-2xl border border-red-100 dark:border-red-900/30">
                                <Heart className="text-red-500 mx-auto mb-2" size={24} />
                                <p className="text-xs text-gray-500 uppercase font-bold">Heart Rate</p>
                                <p className="text-3xl font-bold text-gray-900 dark:text-white">{results.bpm} <span className="text-sm font-normal">bpm</span></p>
                            </div>
                            <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-2xl border border-blue-100 dark:border-blue-900/30">
                                <Activity className="text-blue-500 mx-auto mb-2" size={24} />
                                <p className="text-xs text-gray-500 uppercase font-bold">Oxygen (SpO2)</p>
                                <p className="text-3xl font-bold text-gray-900 dark:text-white">{results.spo2}%</p>
                            </div>
                        </div>

                        <p className="text-xs text-gray-400 mb-6">
                            *This is an AI estimation and not a medical diagnosis. Consult a doctor if you feel unwell.
                        </p>

                        <button onClick={onClose} className="w-full py-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl font-bold">
                            Done
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
