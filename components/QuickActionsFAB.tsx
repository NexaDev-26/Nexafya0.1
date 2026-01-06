import React, { useState } from 'react';
import { Plus, X, QrCode, Package, ShoppingCart, Scan } from 'lucide-react';

interface QuickAction {
  id: string;
  label: string;
  icon: React.ElementType;
  onClick: () => void;
  color?: string;
}

interface QuickActionsFABProps {
  actions: QuickAction[];
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
}

export const QuickActionsFAB: React.FC<QuickActionsFABProps> = ({
  actions,
  position = 'bottom-right',
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const positionClasses = {
    'bottom-right': 'bottom-20 right-4 md:bottom-6 md:right-6',
    'bottom-left': 'bottom-20 left-4 md:bottom-6 md:left-6',
    'top-right': 'top-20 right-4 md:top-6 md:right-6',
    'top-left': 'top-20 left-4 md:top-6 md:left-6',
  };

  return (
    <div className={`fixed ${positionClasses[position]} z-40 md:z-30`}>
      {/* Action Buttons */}
      <div
        className={`flex flex-col gap-3 mb-3 transition-all duration-300 ${
          isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
        }`}
      >
        {actions.map((action, index) => (
          <button
            key={action.id}
            onClick={() => {
              action.onClick();
              setIsOpen(false);
            }}
            className={`flex items-center gap-3 px-4 py-3 bg-white dark:bg-[#0F172A] rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white font-bold text-sm hover:scale-105 active:scale-95 transition-all animate-in slide-in-from-bottom-${index + 1}`}
            style={{
              animationDelay: `${index * 50}ms`,
            }}
          >
            <action.icon
              size={20}
              className={action.color || 'text-blue-600 dark:text-blue-400'}
            />
            <span>{action.label}</span>
          </button>
        ))}
      </div>

      {/* Main FAB Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg shadow-blue-600/30 flex items-center justify-center transition-all hover:scale-110 active:scale-95"
        aria-label={isOpen ? 'Close quick actions' : 'Open quick actions'}
      >
        {isOpen ? <X size={24} /> : <Plus size={24} />}
      </button>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-30 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};
