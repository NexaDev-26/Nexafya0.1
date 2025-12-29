import React from 'react';
import { 
  LayoutDashboard, 
  Calendar, 
  ShoppingBag, 
  MessageSquare, 
  User,
  Stethoscope,
  Users,
  FileText,
  Activity,
  Truck,
  Map,
  DollarSign,
  PieChart
} from 'lucide-react';
import { UserRole } from '../types';

interface MobileBottomNavProps {
  currentView: string;
  onNavigate: (view: string) => void;
  role: UserRole;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ 
  currentView, 
  onNavigate,
  role 
}) => {
  const getNavItems = () => {
    switch (role) {
      case UserRole.PATIENT:
        return [
          { id: 'dashboard', icon: LayoutDashboard, label: 'Home' },
          { id: 'care-center', icon: Stethoscope, label: 'Care' },
          { id: 'orders', icon: ShoppingBag, label: 'Orders' },
          { id: 'messages', icon: MessageSquare, label: 'Messages' },
          { id: 'profile', icon: User, label: 'Profile' },
        ];
      case UserRole.DOCTOR:
        return [
          { id: 'dashboard', icon: LayoutDashboard, label: 'Overview' },
          { id: 'consultations', icon: Calendar, label: 'Consults' },
          { id: 'patients', icon: Users, label: 'Patients' },
          { id: 'manage-articles', icon: FileText, label: 'Articles' },
          { id: 'profile', icon: User, label: 'Profile' },
        ];
      case UserRole.PHARMACY:
        return [
          { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
          { id: 'orders', icon: ShoppingBag, label: 'Orders' },
          { id: 'inventory', icon: Activity, label: 'Inventory' },
          { id: 'couriers', icon: Truck, label: 'Dispatch' },
          { id: 'profile', icon: User, label: 'Profile' },
        ];
      case UserRole.COURIER:
        return [
          { id: 'dashboard', icon: Truck, label: 'Deliveries' },
          { id: 'map', icon: Map, label: 'Map' },
          { id: 'earnings', icon: DollarSign, label: 'Earnings' },
          { id: 'messages', icon: MessageSquare, label: 'Messages' },
          { id: 'profile', icon: User, label: 'Profile' },
        ];
      case UserRole.ADMIN:
        return [
          { id: 'dashboard', icon: PieChart, label: 'Analytics' },
          { id: 'users', icon: Users, label: 'Users' },
          { id: 'reports', icon: FileText, label: 'Reports' },
          { id: 'messages', icon: MessageSquare, label: 'Messages' },
          { id: 'profile', icon: User, label: 'Profile' },
        ];
      default:
        return [
          { id: 'dashboard', icon: LayoutDashboard, label: 'Home' },
          { id: 'messages', icon: MessageSquare, label: 'Messages' },
          { id: 'profile', icon: User, label: 'Profile' },
        ];
    }
  };

  const navItems = getNavItems();

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 bg-white dark:bg-[#0F172A] border-t border-gray-200 dark:border-gray-700 md:hidden z-50 safe-area-bottom"
      aria-label="Mobile navigation"
    >
      <div className="flex justify-around items-center h-16 px-2">
        {navItems.map((item) => {
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`flex flex-col items-center gap-1 flex-1 px-2 py-1 rounded-xl transition-all ${
                isActive 
                  ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20' 
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
            >
              <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[10px] font-bold leading-tight">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

