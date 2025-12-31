import React, { useState, useEffect } from 'react';
import { Settings, Save, Upload, Palette, CreditCard, Bell, Globe, Shield, Database, DollarSign, Mail, Phone, X } from 'lucide-react';
import { useNotification } from './NotificationSystem';
import { useAuth } from '../contexts/AuthContext';
import { collection, doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db as firestore, storage } from '../lib/firebase';
import { cleanFirestoreData } from '../utils/firestoreHelpers';
import { settingsService } from '../services/settingsService';

interface PlatformSettings {
  appName: string;
  appLogo?: string;
  primaryColor: string;
  secondaryColor: string;
  commissionRate: number;
  transactionFee: number;
  minWithdrawal: number;
  maxWithdrawal: number;
  mpesaShortcode?: string;
  tigoPesaShortcode?: string;
  airtelMoneyShortcode?: string;
  smsEnabled: boolean;
  emailEnabled: boolean;
  maintenanceMode: boolean;
  maintenanceMessage?: string;
}

export const AdminSettings: React.FC = () => {
  const { user } = useAuth();
  const { notify } = useNotification();
  const [loading, setLoading] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [settings, setSettings] = useState<PlatformSettings>({
    appName: 'NexaFya',
    primaryColor: '#0066CC',
    secondaryColor: '#10B981',
    commissionRate: 15,
    transactionFee: 2.5,
    minWithdrawal: 5000,
    maxWithdrawal: 5000000,
    smsEnabled: true,
    emailEnabled: true,
    maintenanceMode: false,
  });

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    if (settings.appLogo) {
      setLogoPreview(settings.appLogo);
    }
  }, [settings.appLogo]);

  const loadSettings = async () => {
    try {
      // Try systemSettings first (new format), fallback to platformSettings (old format)
      let settingsRef = doc(firestore, 'systemSettings', 'main');
      let settingsSnap = await getDoc(settingsRef);
      
      if (!settingsSnap.exists()) {
        settingsRef = doc(firestore, 'platformSettings', 'main');
        settingsSnap = await getDoc(settingsRef);
      }
      
      if (settingsSnap.exists()) {
        const data = settingsSnap.data() as Partial<PlatformSettings>;
        // Merge with defaults to ensure all required fields exist
        setSettings({
          appName: data.appName || 'NexaFya',
          appLogo: data.appLogo,
          primaryColor: data.primaryColor || '#0066CC',
          secondaryColor: data.secondaryColor || '#10B981',
          commissionRate: typeof data.commissionRate === 'number' ? data.commissionRate : 15,
          transactionFee: typeof data.transactionFee === 'number' ? data.transactionFee : 2.5,
          minWithdrawal: typeof data.minWithdrawal === 'number' ? data.minWithdrawal : 5000,
          maxWithdrawal: typeof data.maxWithdrawal === 'number' ? data.maxWithdrawal : 5000000,
          mpesaShortcode: data.mpesaShortcode,
          tigoPesaShortcode: data.tigoPesaShortcode,
          airtelMoneyShortcode: data.airtelMoneyShortcode,
          smsEnabled: data.smsEnabled ?? true,
          emailEnabled: data.emailEnabled ?? true,
          maintenanceMode: data.maintenanceMode ?? false,
          maintenanceMessage: data.maintenanceMessage,
        });
        if (data.appLogo) {
          setLogoPreview(data.appLogo);
        }
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
      notify('Failed to load settings', 'error');
    }
  };

  const handleLogoUpload = async (file: File): Promise<string | null> => {
    if (!user) return null;
    setUploadingLogo(true);
    try {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        notify('Please select an image file', 'error');
        setUploadingLogo(false);
        return null;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        notify('Image size should be less than 5MB', 'error');
        setUploadingLogo(false);
        return null;
      }

      // Upload to Firebase Storage
      const ext = file.name.split('.').pop();
      const timestamp = Date.now();
      const path = `platform/logo-${timestamp}.${ext}`;
      const storageRef = ref(storage, path);
      
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);

      // Update settings with new logo URL
      setSettings((prev) => ({ ...prev, appLogo: downloadURL }));
      setLogoPreview(downloadURL);
      setLogoFile(null);
      notify('Logo uploaded successfully', 'success');
      return downloadURL;
    } catch (error: any) {
      console.error('Failed to upload logo:', error);
      notify(`Failed to upload logo: ${error.message || 'Unknown error'}`, 'error');
      return null;
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleRemoveLogo = () => {
    setSettings({ ...settings, appLogo: '' });
    setLogoPreview(null);
    setLogoFile(null);
  };

  const handleSave = async () => {
    if (!user) return;
    setLoading(true);
    try {
      let finalLogoUrl = settings.appLogo;
      
      // If logo file is selected but not uploaded, upload it first
      if (logoFile && !uploadingLogo) {
        // Check if preview is a data URL (not yet uploaded)
        if (logoPreview && (logoPreview.startsWith('data:') || !logoPreview.startsWith('http'))) {
          const uploadedUrl = await handleLogoUpload(logoFile);
          if (uploadedUrl) {
            finalLogoUrl = uploadedUrl;
          } else {
            // Upload failed, don't proceed with save
            setLoading(false);
            return;
          }
        } else if (logoPreview && logoPreview.startsWith('http')) {
          // Already uploaded, use the preview URL
          finalLogoUrl = logoPreview;
        }
      } else if (logoPreview && logoPreview.startsWith('http')) {
        // Use existing preview URL if no file to upload
        finalLogoUrl = logoPreview;
      }
      
      // Ensure all financial fields have valid numbers and no undefined values
      const settingsToSave: PlatformSettings = {
        appName: settings.appName || 'NexaFya',
        appLogo: finalLogoUrl || settings.appLogo || '',
        primaryColor: settings.primaryColor || '#0066CC',
        secondaryColor: settings.secondaryColor || '#10B981',
        commissionRate: typeof settings.commissionRate === 'number' ? settings.commissionRate : 15,
        transactionFee: typeof settings.transactionFee === 'number' ? settings.transactionFee : 2.5,
        minWithdrawal: typeof settings.minWithdrawal === 'number' ? settings.minWithdrawal : 5000,
        maxWithdrawal: typeof settings.maxWithdrawal === 'number' ? settings.maxWithdrawal : 5000000,
        mpesaShortcode: settings.mpesaShortcode || '',
        tigoPesaShortcode: settings.tigoPesaShortcode || '',
        airtelMoneyShortcode: settings.airtelMoneyShortcode || '',
        smsEnabled: settings.smsEnabled ?? true,
        emailEnabled: settings.emailEnabled ?? true,
        maintenanceMode: settings.maintenanceMode ?? false,
        maintenanceMessage: settings.maintenanceMessage || '',
      };
      
      // Prepare system settings (only include appLogo if it has a value)
      const systemSettingsData: any = {
        appName: settingsToSave.appName,
        primaryColor: settingsToSave.primaryColor,
        secondaryColor: settingsToSave.secondaryColor,
        updatedBy: user.id,
        updatedAt: serverTimestamp(),
      };
      
      // Only include appLogo if it has a value
      if (settingsToSave.appLogo && settingsToSave.appLogo.trim() !== '') {
        systemSettingsData.appLogo = settingsToSave.appLogo;
      }
      
      // Save to both systemSettings (new) and platformSettings (legacy) for compatibility
      const systemSettingsRef = doc(firestore, 'systemSettings', 'main');
      const platformSettingsRef = doc(firestore, 'platformSettings', 'main');
      
      // Prepare platform settings (remove undefined values using helper)
      const platformSettingsData = cleanFirestoreData({
        ...settingsToSave,
        updatedBy: user.id,
        updatedAt: serverTimestamp(),
      });
      
      await Promise.all([
        setDoc(systemSettingsRef, systemSettingsData, { merge: true }),
        setDoc(platformSettingsRef, platformSettingsData, { merge: true })
      ]);
      
      // Update settingsService to invalidate cache
      await settingsService.updateSettings({
        appName: settingsToSave.appName,
        appLogo: settingsToSave.appLogo || undefined,
        primaryColor: settingsToSave.primaryColor,
        secondaryColor: settingsToSave.secondaryColor,
      } as any, user.id);
      
      // Dispatch custom event to notify LogoIcon components to refresh
      window.dispatchEvent(new CustomEvent('appLogoUpdated'));
      
      notify('Settings saved successfully', 'success');
      logAdminAction('Updated platform settings');
    } catch (error: any) {
      console.error('Failed to save settings:', error);
      notify(`Failed to save settings: ${error.message || 'Unknown error'}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const logAdminAction = async (action: string) => {
    if (!user) return;
    try {
      const logsRef = collection(firestore, 'adminLogs');
      await setDoc(doc(logsRef, Date.now().toString()), {
        adminId: user.id,
        adminName: user.name,
        action,
        timestamp: serverTimestamp(),
      });
    } catch (error) {
      console.error('Failed to log action:', error);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold font-display text-gray-900 dark:text-white">System Settings</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Configure platform settings and preferences</p>
        </div>
        <button
          onClick={handleSave}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 disabled:opacity-50"
        >
          <Save size={18} /> {loading ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {/* General Settings */}
      <div className="bg-white dark:bg-[#0F172A] rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700/50 p-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <Globe size={20} className="text-blue-600" /> General Settings
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">App Name</label>
            <input
              type="text"
              value={settings.appName}
              onChange={(e) => setSettings({ ...settings, appName: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700/50 bg-gray-50 dark:bg-[#0A1B2E] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">App Logo</label>
            <div className="space-y-4">
              {/* Logo Preview */}
              {logoPreview && (
                <div className="relative w-32 h-32 rounded-xl overflow-hidden border-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                  <img 
                    src={logoPreview} 
                    alt="App Logo" 
                    className="w-full h-full object-contain"
                  />
                  <button
                    onClick={handleRemoveLogo}
                    className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                    type="button"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}
              
              {/* Upload Button */}
              <div>
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setLogoFile(file);
                        // Create preview
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          setLogoPreview(event.target?.result as string);
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="hidden"
                  />
                  <div className="flex items-center gap-3 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm w-fit transition-colors">
                    {uploadingLogo ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload size={16} />
                        {logoPreview ? 'Change Logo' : 'Upload Logo'}
                      </>
                    )}
                  </div>
                </label>
                {logoFile && !uploadingLogo && (
                  <button
                    onClick={() => handleLogoUpload(logoFile)}
                    className="ml-3 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm transition-colors"
                    type="button"
                  >
                    <Save size={14} className="inline mr-2" />
                    Save Logo
                  </button>
                )}
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Recommended: Square image, max 5MB (PNG, JPG, SVG)</p>
              </div>
              
              {/* Alternative URL Input */}
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Or Enter Logo URL</label>
                <input
                  type="url"
                  value={settings.appLogo || ''}
                  onChange={(e) => {
                    setSettings({ ...settings, appLogo: e.target.value });
                    setLogoPreview(e.target.value);
                  }}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700/50 bg-gray-50 dark:bg-[#0A1B2E] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="https://example.com/logo.png"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Branding */}
      <div className="bg-white dark:bg-[#0F172A] rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700/50 p-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <Palette size={20} className="text-purple-600" /> Branding
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Primary Color</label>
            <div className="flex gap-2">
              <input
                type="color"
                value={settings.primaryColor}
                onChange={(e) => setSettings({ ...settings, primaryColor: e.target.value })}
                className="w-16 h-12 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer"
              />
              <input
                type="text"
                value={settings.primaryColor}
                onChange={(e) => setSettings({ ...settings, primaryColor: e.target.value })}
                className="flex-1 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700/50 bg-gray-50 dark:bg-[#0A1B2E] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Secondary Color</label>
            <div className="flex gap-2">
              <input
                type="color"
                value={settings.secondaryColor}
                onChange={(e) => setSettings({ ...settings, secondaryColor: e.target.value })}
                className="w-16 h-12 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer"
              />
              <input
                type="text"
                value={settings.secondaryColor}
                onChange={(e) => setSettings({ ...settings, secondaryColor: e.target.value })}
                className="flex-1 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700/50 bg-gray-50 dark:bg-[#0A1B2E] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Financial Settings */}
      <div className="bg-white dark:bg-[#0F172A] rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700/50 p-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <DollarSign size={20} className="text-emerald-600" /> Financial Settings
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Commission Rate (%)</label>
            <input
              type="number"
              value={settings.commissionRate ?? 15}
              onChange={(e) => setSettings({ ...settings, commissionRate: Number(e.target.value) || 0 })}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700/50 bg-gray-50 dark:bg-[#0A1B2E] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
              min="0"
              max="100"
              step="0.1"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Transaction Fee (%)</label>
            <input
              type="number"
              value={settings.transactionFee ?? 2.5}
              onChange={(e) => setSettings({ ...settings, transactionFee: Number(e.target.value) || 0 })}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700/50 bg-gray-50 dark:bg-[#0A1B2E] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
              min="0"
              max="100"
              step="0.1"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Min Withdrawal (TZS)</label>
            <input
              type="number"
              value={settings.minWithdrawal ?? 5000}
              onChange={(e) => setSettings({ ...settings, minWithdrawal: Number(e.target.value) || 0 })}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700/50 bg-gray-50 dark:bg-[#0A1B2E] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
              min="0"
              step="1000"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Max Withdrawal (TZS)</label>
            <input
              type="number"
              value={settings.maxWithdrawal ?? 5000000}
              onChange={(e) => setSettings({ ...settings, maxWithdrawal: Number(e.target.value) || 0 })}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700/50 bg-gray-50 dark:bg-[#0A1B2E] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
              min="0"
              step="100000"
            />
          </div>
        </div>
      </div>

      {/* Payment Gateway Settings */}
      <div className="bg-white dark:bg-[#0F172A] rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700/50 p-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <CreditCard size={20} className="text-blue-600" /> Payment Gateway Settings
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">M-Pesa Shortcode</label>
            <input
              type="text"
              value={settings.mpesaShortcode || ''}
              onChange={(e) => setSettings({ ...settings, mpesaShortcode: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700/50 bg-gray-50 dark:bg-[#0A1B2E] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="e.g., 174379"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Tigo Pesa Shortcode</label>
            <input
              type="text"
              value={settings.tigoPesaShortcode || ''}
              onChange={(e) => setSettings({ ...settings, tigoPesaShortcode: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700/50 bg-gray-50 dark:bg-[#0A1B2E] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="e.g., 174379"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Airtel Money Shortcode</label>
            <input
              type="text"
              value={settings.airtelMoneyShortcode || ''}
              onChange={(e) => setSettings({ ...settings, airtelMoneyShortcode: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700/50 bg-gray-50 dark:bg-[#0A1B2E] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="e.g., 174379"
            />
          </div>
        </div>
      </div>

      {/* Notification Settings */}
      <div className="bg-white dark:bg-[#0F172A] rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700/50 p-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <Bell size={20} className="text-amber-600" /> Notification Settings
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-[#0A1B2E] rounded-xl">
            <div>
              <label className="font-bold text-gray-900 dark:text-white">SMS Notifications</label>
              <p className="text-sm text-gray-500 dark:text-gray-400">Enable SMS notifications</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.smsEnabled}
                onChange={(e) => setSettings({ ...settings, smsEnabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
            </label>
          </div>
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-[#0A1B2E] rounded-xl">
            <div>
              <label className="font-bold text-gray-900 dark:text-white">Email Notifications</label>
              <p className="text-sm text-gray-500 dark:text-gray-400">Enable email notifications</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.emailEnabled}
                onChange={(e) => setSettings({ ...settings, emailEnabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Maintenance Mode */}
      <div className="bg-white dark:bg-[#0F172A] rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700/50 p-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
          <Shield size={20} className="text-red-600" /> Maintenance Mode
        </h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-[#0A1B2E] rounded-xl">
            <div>
              <label className="font-bold text-gray-900 dark:text-white">Enable Maintenance Mode</label>
              <p className="text-sm text-gray-500 dark:text-gray-400">Put the platform in maintenance mode</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.maintenanceMode}
                onChange={(e) => setSettings({ ...settings, maintenanceMode: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 dark:peer-focus:ring-red-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-red-600"></div>
            </label>
          </div>
          {settings.maintenanceMode && (
            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Maintenance Message</label>
              <textarea
                value={settings.maintenanceMessage || ''}
                onChange={(e) => setSettings({ ...settings, maintenanceMessage: e.target.value })}
                rows={3}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700/50 bg-gray-50 dark:bg-[#0A1B2E] text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                placeholder="We're currently performing scheduled maintenance. We'll be back soon!"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

