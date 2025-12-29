/**
 * USSD Info Component
 * Displays USSD fallback information for feature phone users
 */

import React from 'react';
import { Phone, Smartphone, Info, ArrowRight } from 'lucide-react';
import { ussdService } from '../services/ussdService';
import { usePreferences } from '../contexts/PreferencesContext';

export const USSDInfo: React.FC = () => {
  const { t, language } = usePreferences();
  const instructions = ussdService.getInstructions();

  const menuItems = [
    { code: '*150*60*1#', label: language === 'sw' ? 'Panga Miadi' : 'Book Appointment' },
    { code: '*150*60*2#', label: language === 'sw' ? 'Angalia Dawa' : 'Check Medicine' },
    { code: '*150*60*3#', label: language === 'sw' ? 'Vidokezo vya Afya' : 'Health Tips' },
    { code: '*150*60*4#', label: language === 'sw' ? 'Dharura' : 'Emergency SOS' },
    { code: '*150*60*5#', label: language === 'sw' ? 'Akaunti Yangu' : 'My Account' },
  ];

  return (
    <div className="bg-gradient-to-br from-nexafya-blue/10 to-nexafya-green/10 rounded-2xl p-6 border border-nexafya-blue/20">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 bg-nexafya-blue/20 rounded-full flex items-center justify-center flex-shrink-0">
          <Phone className="text-nexafya-blue" size={24} />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              {language === 'sw' ? 'Huduma za USSD' : 'USSD Service'}
            </h3>
            <Info className="text-gray-400" size={18} />
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            {language === 'sw'
              ? 'Piga nambari hii kutumia huduma za NexaFya bila mtandao'
              : 'Dial this number to access NexaFya services without internet'}
          </p>

          <div className="bg-white dark:bg-[#0F172A] rounded-xl p-4 mb-4 border border-gray-200 dark:border-gray-700/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Smartphone className="text-nexafya-blue" size={20} />
                <div>
                  <p className="text-xs text-gray-500">Dial Code</p>
                  <p className="text-xl font-bold text-nexafya-blue font-mono">*150*60#</p>
                </div>
              </div>
              <div className="px-3 py-1 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-full text-xs font-medium">
                {language === 'sw' ? 'Hakuna Mtandao Inahitajika' : 'No Internet Required'}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
              {language === 'sw' ? 'Huduma Zinazopatikana:' : 'Available Services:'}
            </p>
            {menuItems.map((item, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-2 bg-white/50 dark:bg-[#0F172A]/50 rounded-lg text-sm"
              >
                <span className="text-gray-700 dark:text-gray-300">{item.label}</span>
                <code className="text-nexafya-blue font-mono text-xs">{item.code}</code>
              </div>
            ))}
          </div>

          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-xs text-blue-800 dark:text-blue-300">
              {language === 'sw'
                ? 'Inafanya kazi kwenye mitandao yote ya Tanzania: Vodacom, Tigo, Airtel, Halotel'
                : 'Works on all Tanzanian networks: Vodacom, Tigo, Airtel, Halotel'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

