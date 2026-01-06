/**
 * Logo Icon Component
 * Displays the app logo icon from settings or default icon
 * Logo is cached in localStorage and persists across page refreshes
 */

import React, { useState, useEffect, useRef } from 'react';
import { Activity } from 'lucide-react';
import { settingsService } from '../services/settingsService';

interface LogoIconProps {
  className?: string;
  size?: number;
}

const LOGO_CACHE_KEY = 'nexafya_logo_url';
const LOGO_CACHE_TIMESTAMP_KEY = 'nexafya_logo_cache_timestamp';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

// Get cached logo helper function
const getCachedLogo = (): string | null => {
  try {
    const cachedUrl = localStorage.getItem(LOGO_CACHE_KEY);
    if (cachedUrl) {
      // Always return cached logo if it exists, even if expired
      // This ensures logo persists across refreshes
      return cachedUrl;
    }
  } catch (error) {
    console.warn('Error reading logo from cache:', error);
  }
  return null;
};

export const LogoIcon: React.FC<LogoIconProps> = ({ className = "w-10 h-10", size }) => {
  // Initialize from cache immediately - this ensures logo shows on first render
  const [logoUrl, setLogoUrl] = useState<string | null>(getCachedLogo);
  const [imageError, setImageError] = useState(false);
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    let isMounted = true;
    
    const loadLogo = async () => {
      // Prevent multiple simultaneous loads
      if (hasLoadedRef.current) return;
      hasLoadedRef.current = true;
      
      try {
        setImageError(false);
        const settings = await settingsService.getSettings();
        
        if (settings.appLogo) {
          // Update logo if we got a new one from Firestore
          if (isMounted) {
            setLogoUrl(settings.appLogo);
            // Cache the logo URL in localStorage
            try {
              localStorage.setItem(LOGO_CACHE_KEY, settings.appLogo);
              localStorage.setItem(LOGO_CACHE_TIMESTAMP_KEY, Date.now().toString());
            } catch (cacheError) {
              console.warn('Error caching logo:', cacheError);
            }
          }
        }
        // If Firestore doesn't have a logo, we keep using the cached one
        // Never clear the logoUrl state - always preserve what we have
      } catch (error) {
        console.error('Error loading logo:', error);
        // On error, keep using cached logo - never clear it
        // The logoUrl state already has the cached value from initialization
      } finally {
        hasLoadedRef.current = false;
      }
    };

    // Listen for logo update events
    const handleLogoUpdate = () => {
      hasLoadedRef.current = false;
      loadLogo();
    };

    // Load logo from Firestore in background
    // This updates the logo if there's a new one, but doesn't clear it if there isn't
    loadLogo();

    window.addEventListener('appLogoUpdated', handleLogoUpdate);
    
    // Refresh on window focus (in case logo was updated in another tab)
    window.addEventListener('focus', handleLogoUpdate);

    return () => {
      isMounted = false;
      window.removeEventListener('appLogoUpdated', handleLogoUpdate);
      window.removeEventListener('focus', handleLogoUpdate);
    };
  }, []); // Empty dependency array - only run once on mount

  // Handle image load error - keep the URL but mark as error for fallback
  const handleImageError = () => {
    console.warn('Logo image failed to load:', logoUrl);
    setImageError(true);
  };

  // Always show logo if we have one (from cache or Firestore)
  if (logoUrl) {
    return (
      <div className={`${className} bg-white dark:bg-white rounded-xl flex items-center justify-center shadow-lg border border-gray-200 dark:border-gray-300 overflow-hidden transition-transform group-hover:scale-105`}>
        {!imageError ? (
          <img 
            key={logoUrl} // Use key to force remount if URL changes
            src={logoUrl} 
            alt="NexaFya Logo" 
            className="w-full h-full object-cover"
            onError={handleImageError}
            onLoad={() => setImageError(false)}
            loading="eager"
          />
        ) : (
          // Fallback to default icon if image failed to load
          <Activity className="text-teal-600 dark:text-teal-600" size={size || 24} />
        )}
      </div>
    );
  }

  // Default icon (shown when no logo URL available)
  return (
    <div className={`${className} bg-white dark:bg-white rounded-xl flex items-center justify-center shadow-lg border border-gray-200 dark:border-gray-300 transition-transform group-hover:scale-105`}>
      {size ? (
        <Activity className="text-teal-600 dark:text-teal-600" size={size} />
      ) : (
        <Activity className="text-teal-600 dark:text-teal-600" size={24} />
      )}
    </div>
  );
};
