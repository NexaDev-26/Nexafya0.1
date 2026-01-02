/**
 * Logo Icon Component
 * Displays the app logo icon from settings or default icon
 * Uses localStorage cache to persist logo across page refreshes
 */

import React, { useState, useEffect } from 'react';
import { Activity } from 'lucide-react';
import { settingsService } from '../services/settingsService';

interface LogoIconProps {
  className?: string;
  size?: number;
}

const LOGO_CACHE_KEY = 'nexafya_app_logo_url';
const LOGO_CACHE_TIMESTAMP_KEY = 'nexafya_app_logo_timestamp';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

export const LogoIcon: React.FC<LogoIconProps> = ({ className = "w-10 h-10", size }) => {
  const [logoUrl, setLogoUrl] = useState<string | null>(() => {
    // Load from cache immediately on mount
    try {
      const cachedUrl = localStorage.getItem(LOGO_CACHE_KEY);
      const cachedTimestamp = localStorage.getItem(LOGO_CACHE_TIMESTAMP_KEY);
      
      if (cachedUrl && cachedTimestamp) {
        const age = Date.now() - parseInt(cachedTimestamp, 10);
        if (age < CACHE_DURATION) {
          return cachedUrl;
        } else {
          // Cache expired, clear it
          localStorage.removeItem(LOGO_CACHE_KEY);
          localStorage.removeItem(LOGO_CACHE_TIMESTAMP_KEY);
        }
      }
    } catch (error) {
      console.warn('Error reading logo from cache:', error);
    }
    return null;
  });
  const [loading, setLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    const loadLogo = async () => {
      try {
        setImageError(false);
        const settings = await settingsService.getSettings();
        
        if (settings.appLogo) {
          // Update cache
          try {
            localStorage.setItem(LOGO_CACHE_KEY, settings.appLogo);
            localStorage.setItem(LOGO_CACHE_TIMESTAMP_KEY, Date.now().toString());
          } catch (error) {
            console.warn('Error caching logo:', error);
          }
          
          setLogoUrl(settings.appLogo);
        } else {
          // No logo in settings, clear cache
          try {
            localStorage.removeItem(LOGO_CACHE_KEY);
            localStorage.removeItem(LOGO_CACHE_TIMESTAMP_KEY);
          } catch (error) {
            console.warn('Error clearing logo cache:', error);
          }
          
          setLogoUrl(null);
        }
      } catch (error) {
        console.error('Error loading logo from settings:', error);
        // Keep existing logoUrl (from cache) on error
      } finally {
        setLoading(false);
      }
    };

    // Only load from Firestore if we don't have a cached logo
    if (!logoUrl) {
      loadLogo();
    } else {
      // We have cached logo, but still try to update in background
      loadLogo();
    }

    // Listen for logo update events
    const handleLogoUpdate = () => {
      loadLogo();
    };

    window.addEventListener('appLogoUpdated', handleLogoUpdate);
    
    // Refresh on window focus (in case logo was updated in another tab)
    window.addEventListener('focus', loadLogo);

    return () => {
      window.removeEventListener('appLogoUpdated', handleLogoUpdate);
      window.removeEventListener('focus', loadLogo);
    };
  }, []); // Empty deps - only run on mount

  // Handle image load error - keep the URL but mark as error for fallback
  const handleImageError = () => {
    console.warn('Logo image failed to load:', logoUrl);
    setImageError(true);
  };

  // Always render something - show default icon if loading, no logo, or error
  const showDefaultIcon = loading || !logoUrl || imageError;
  const iconSize = size || 24;

  return (
    <div className={`${className} bg-white dark:bg-white rounded-xl flex items-center justify-center shadow-lg border border-gray-200 dark:border-gray-300 overflow-hidden transition-transform group-hover:scale-105`}>
      {showDefaultIcon ? (
        <Activity className="text-teal-600 dark:text-teal-600" size={iconSize} />
      ) : (
        <img 
          key={logoUrl} // Use key to force remount if URL changes
          src={logoUrl} 
          alt="NexaFya Logo" 
          className="w-full h-full object-cover"
          onError={handleImageError}
          onLoad={() => setImageError(false)}
          loading="eager"
        />
      )}
    </div>
  );
};

