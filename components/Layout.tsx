
import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Calendar, 
  Users, 
  MessageSquare, 
  Activity, 
  FileText, 
  Settings, 
  LogOut, 
  Menu, 
  X, 
  Bell, 
  Search, 
  ChevronDown, 
  User as UserIcon, 
  Stethoscope, 
  ShoppingBag, 
  Truck, 
  Shield, 
  PieChart,
  Moon,
  Sun,
  Plus,
  Map,
  DollarSign,
  CheckCircle,
  BookOpen
} from 'lucide-react';
import { User, UserRole, FamilyMember } from '../types';
import { GlobalSearch } from './GlobalSearch';
import { NotificationsPanel } from './NotificationsPanel';
import { MobileBottomNav } from './MobileBottomNav';
import { notificationService } from '../services/notificationService';
import { useKeyboardShortcuts, createCommonShortcuts } from '../hooks/useKeyboardShortcuts';

interface LayoutProps {
  user: User;
  role: UserRole;
  currentView: string;
  setCurrentView: (view: string) => void;
  isDarkMode: boolean;
  toggleTheme: () => void;
  onLogout: () => void;
  onSwitchProfile: (name: string, relation: string) => void;
  familyMembers: FamilyMember[];
  onAddFamilyMember: (member: Omit<FamilyMember, 'id' | 'avatar'>) => void;
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ 
  user, 
  role, 
  currentView, 
  setCurrentView, 
  isDarkMode, 
  toggleTheme, 
  onLogout,
  onSwitchProfile,
  familyMembers,
  onAddFamilyMember,
  children 
}) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isNotificationMenuOpen, setIsNotificationMenuOpen] = useState(false);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);

  // Keyboard shortcuts
  useKeyboardShortcuts(
    createCommonShortcuts(setCurrentView, () => {
      // Focus search when available
      const searchInput = document.querySelector('input[type="text"][placeholder*="Search"]') as HTMLInputElement;
      searchInput?.focus();
    })
  );

  // Load unread notification count
  useEffect(() => {
    if (user?.id) {
      const loadUnreadCount = async () => {
        try {
          const count = await notificationService.getUnreadCount(user.id);
          setUnreadNotificationCount(count);
        } catch (error) {
          console.error('Load notification count error:', error);
        }
      };
      loadUnreadCount();

      // Subscribe to real-time updates
      const unsubscribe = notificationService.subscribeToNotifications(user.id, (notifications) => {
        setUnreadNotificationCount(notifications.filter(n => !n.read).length);
      });

      return () => unsubscribe();
    }
  }, [user?.id]);

  // Define navigation items based on role
  const getNavItems = () => {
    const common = [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'messages', label: 'Messages', icon: MessageSquare },
      { id: 'settings', label: 'Settings', icon: Settings },
    ];

    switch (role) {
      case UserRole.PATIENT:
        return [
          { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
          { id: 'care-center', label: 'Care Center', icon: Stethoscope },
          { id: 'resources', label: 'My Health', icon: Activity },
          { id: 'orders', label: 'My Orders', icon: ShoppingBag },
          { id: 'insurance', label: 'Insurance', icon: Shield },
          ...common.filter(i => i.id !== 'dashboard')
        ];
      case UserRole.DOCTOR:
        return [
          { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
          { id: 'consultations', label: 'Consultations', icon: Calendar },
          { id: 'patients', label: 'My Patients', icon: Users },
          { id: 'manage-articles', label: 'Articles', icon: FileText },
          { id: 'finance', label: 'Finance', icon: PieChart }, 
          ...common.filter(i => i.id !== 'dashboard')
        ];
      case UserRole.PHARMACY:
        return [
          { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
          { id: 'orders', label: 'Orders', icon: ShoppingBag },
          { id: 'inventory', label: 'Inventory', icon: Activity },
          { id: 'couriers', label: 'Dispatch', icon: Truck },
          ...common.filter(i => i.id !== 'dashboard')
        ];
      case UserRole.COURIER:
        return [
          { id: 'dashboard', label: 'Deliveries', icon: Truck },
          { id: 'map', label: 'Live Map', icon: Map },
          { id: 'earnings', label: 'Earnings', icon: DollarSign },
          { id: 'articles', label: 'Articles', icon: BookOpen },
          ...common.filter(i => i.id !== 'dashboard')
        ];
      case UserRole.ADMIN:
        return [
          { id: 'dashboard', label: 'Analytics', icon: PieChart },
          { id: 'users', label: 'User Mgmt', icon: Users },
          { id: 'articles', label: 'Articles', icon: BookOpen },
          { id: 'reports', label: 'Reports', icon: FileText },
          ...common.filter(i => i.id !== 'dashboard')
        ];
      case UserRole.CHW:
        return [
          { id: 'dashboard', label: 'Field Work', icon: Activity },
          { id: 'patients', label: 'Families', icon: Users },
          { id: 'reports', label: 'Reports', icon: FileText },
          ...common.filter(i => i.id !== 'dashboard')
        ];
      default:
        return common;
    }
  };

  const navItems = getNavItems();

  return (
    <div className="flex h-screen bg-[#F3F4F6] dark:bg-[#0A0F1C] transition-colors duration-300 font-sans">
      
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50 w-72 bg-white dark:bg-[#0F172A] border-r border-gray-200 dark:border-gray-700/50 transition-colors duration-300
        transform transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="h-full flex flex-col p-6">
          {/* Logo */}
          <div className="flex items-center gap-3 px-2 mb-10">
            <div className="w-10 h-10 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/20">
              <Activity className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-serif font-bold text-gray-900 dark:text-white leading-none">NexaFya</h1>
              <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest">Health</span>
            </div>
          </div>

          {/* Nav Items */}
          <nav className="flex-1 space-y-2">
            {navItems.map(item => (
              <button
                key={item.id}
                onClick={() => {
                  setCurrentView(item.id);
                  setIsSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-200 group relative ${
                  currentView === item.id 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' 
                    : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700/50 dark:text-gray-400'
                }`}
              >
                <item.icon size={22} className={`transition-transform duration-300 ${currentView === item.id ? 'scale-110' : 'group-hover:scale-110'}`} />
                <span className="font-bold text-sm">{item.label}</span>
                {currentView === item.id && (
                  <div className="absolute right-4 w-2 h-2 bg-white rounded-full"></div>
                )}
              </button>
            ))}
          </nav>

          {/* Bottom Card (Logout) */}
          <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-700">
             <button 
                onClick={onLogout}
                className="w-full flex items-center gap-4 px-4 py-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-2xl transition-colors font-bold text-sm"
             >
                <LogOut size={20} />
                Logout
             </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        {/* Top Bar */}
        <header className="bg-white dark:bg-[#0F172A] border-b border-gray-200 dark:border-gray-700/50 h-20 flex items-center justify-between px-6 lg:px-10 z-30 transition-colors duration-300">
          
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
            >
              <Menu size={24} />
            </button>
            
            <div className="hidden md:block">
               {/* Global Search Integration */}
               <GlobalSearch onNavigate={setCurrentView} />
            </div>
          </div>

          <div className="flex items-center gap-4 md:gap-6">
            <button 
                onClick={toggleTheme}
                className="p-2.5 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors duration-300"
                title={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
            >
                {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            <div className="relative">
              <button 
                onClick={() => setIsNotificationMenuOpen(!isNotificationMenuOpen)}
                className="relative p-2.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
              >
                <Bell size={20} />
                {unreadNotificationCount > 0 && (
                  <span className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center border-2 border-white dark:border-gray-800">
                    {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
                  </span>
                )}
              </button>
            </div>

            <div className="relative">
              <button 
                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                className="flex items-center gap-3 pl-2 pr-1 py-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors border border-transparent hover:border-gray-200 dark:hover:border-gray-600"
              >
                <img 
                  src={user.avatar} 
                  alt={user.name} 
                  className="w-9 h-9 rounded-full object-cover border border-gray-200 dark:border-gray-600"
                />
                <div className="hidden md:block text-left">
                    <p className="text-sm font-bold text-gray-900 dark:text-white leading-none">{user.name}</p>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mt-0.5">{role}</p>
                </div>
                <ChevronDown size={16} className="text-gray-400 mr-2" />
              </button>

              {/* Profile Dropdown */}
              {isProfileMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-[#0F172A] rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700/50 overflow-hidden animate-in fade-in slide-in-from-top-2 z-50">
                   {/* Switch Profile Section - Only visible if PATIENT */}
                   {role === UserRole.PATIENT && (
                     <div className="p-4 border-b border-gray-100 dark:border-gray-700/50">
                        <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-3">Switch Profile</p>
                        <div className="space-y-2">
                            <button 
                                onClick={() => {
                                    onSwitchProfile(user.name, 'Self');
                                    setIsProfileMenuOpen(false);
                                }}
                                className="w-full flex items-center gap-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl transition-colors"
                            >
                                <img src={user.avatar} className="w-8 h-8 rounded-full border border-gray-200 dark:border-gray-700" alt="Me" />
                                <div className="text-left">
                                    <p className="text-sm font-bold text-gray-900 dark:text-white">Me</p>
                                </div>
                                <div className="ml-auto w-2 h-2 bg-green-500 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
                            </button>
                            
                            {familyMembers.filter(m => m.name !== user.name).map(member => (
                                <button 
                                    key={member.id}
                                    onClick={() => {
                                        onSwitchProfile(member.name, member.relation);
                                        setIsProfileMenuOpen(false);
                                    }}
                                    className="w-full flex items-center gap-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl transition-colors"
                                >
                                    <img src={member.avatar} className="w-8 h-8 rounded-full border border-gray-200 dark:border-gray-700" alt={member.name} />
                                    <div className="text-left">
                                        <p className="text-sm font-bold text-gray-900 dark:text-white">{member.name}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">{member.relation}</p>
                                    </div>
                                </button>
                            ))}
                            
                            <button className="w-full flex items-center gap-3 p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-colors text-sm font-bold border border-dashed border-blue-200 dark:border-blue-800/50 justify-center mt-2">
                                <Plus size={16} /> Add Family Member
                            </button>
                        </div>
                     </div>
                   )}
                   
                   <div className="p-2">
                      <button 
                        onClick={() => { 
                            setCurrentView('profile'); 
                            setIsProfileMenuOpen(false); 
                        }} 
                        className="w-full flex items-center gap-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl text-sm text-gray-600 dark:text-gray-300 transition-colors font-bold"
                      >
                          <UserIcon size={16} /> My Profile
                      </button>
                      <button 
                        onClick={() => { 
                            setCurrentView('settings'); 
                            setIsProfileMenuOpen(false); 
                        }} 
                        className="w-full flex items-center gap-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl text-sm text-gray-600 dark:text-gray-300 transition-colors font-bold"
                      >
                          <Settings size={16} /> Settings
                      </button>
                      <button 
                        onClick={() => {
                            onLogout();
                            setIsProfileMenuOpen(false);
                        }}
                        className="w-full flex items-center gap-3 p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl text-sm text-red-600 dark:text-red-400 transition-colors font-bold"
                      >
                          <LogOut size={16} /> Logout
                      </button>
                   </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content Scroll Area */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-[#F3F4F6] dark:bg-[#0A0F1C] p-4 lg:p-8 transition-colors duration-300 pb-20 md:pb-8">
           {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav 
        currentView={currentView} 
        onNavigate={setCurrentView}
        role={role}
      />

      {/* Notifications Panel */}
      <NotificationsPanel 
        isOpen={isNotificationMenuOpen} 
        onClose={() => setIsNotificationMenuOpen(false)} 
      />
    </div>
  );
};
