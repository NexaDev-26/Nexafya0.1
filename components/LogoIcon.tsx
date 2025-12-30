/**
 * Logo Icon Component
 * Displays the app logo icon from settings or default icon
 */

import React, { useState, useEffect } from 'react';
import { Activity } from 'lucide-react';
import { settingsService } from '../services/settingsService';

interface LogoIconProps {
  className?: string;
  size?: number;
}

export const LogoIcon: React.FC<LogoIconProps> = ({ className = "w-10 h-10", size }) => {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadLogo = async () => {
      try {
        const settings = await settingsService.getSettings();
        if (settings.appLogo) {
          setLogoUrl(settings.appLogo);
        }
      } catch (error) {
        console.error('Error loading logo:', error);
      } finally {
        setLoading(false);
      }
    };

    loadLogo();
  }, []);

  // If logo URL exists, display image
  if (logoUrl && !loading) {
    return (
      <div className={`${className} bg-teal-600 dark:bg-teal-500 rounded-xl flex items-center justify-center shadow-lg shadow-teal-600/20 overflow-hidden transition-transform group-hover:scale-105`}>
        <img 
          src={logoUrl} 
          alt="NexaFya Logo" 
          className="w-full h-full object-cover"
          onError={() => setLogoUrl(null)} // Fallback to default if image fails to load
        />
      </div>
    );
  }

  // Default icon
  return (
    <div className={`${className} bg-teal-600 dark:bg-teal-500 rounded-xl flex items-center justify-center shadow-lg shadow-teal-600/20 transition-transform group-hover:scale-105`}>
      {size ? (
        <Activity className="text-white" size={size} />
      ) : (
        <Activity className="text-white" size={24} />
      )}
    </div>
  );
};

