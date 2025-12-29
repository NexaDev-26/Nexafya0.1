import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight,
  Plus,
  Clock,
  Video,
  Phone,
  MessageSquare,
  Filter,
  Search,
  X
} from 'lucide-react';
import { Appointment } from '../types';
import { db } from '../services/db';
import { useNotification } from './NotificationSystem';
import { useAuth } from '../contexts/AuthContext';
import { EmptyState } from './EmptyState';
import { SkeletonLoader } from './SkeletonLoader';
import { handleError } from '../utils/errorHandler';

type ViewMode = 'month' | 'week' | 'day';
type AppointmentType = 'CHAT' | 'AUDIO' | 'VIDEO' | 'IN_PERSON';

export const EnhancedCalendar: React.FC = () => {
  const { notify } = useNotification();
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<AppointmentType | 'ALL'>('ALL');

  useEffect(() => {
    loadAppointments();
  }, []);

  const loadAppointments = async () => {
    try {
      setLoading(true);
      const data = await db.getAppointments(user?.id || '', user?.role || 'PATIENT');
      setAppointments(data);
    } catch (error) {
      handleError(error, notify);
    } finally {
      setLoading(false);
    }
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + (direction === 'next' ? 1 : -1));
      return newDate;
    });
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setDate(prev.getDate() + (direction === 'next' ? 7 : -7));
      return newDate;
    });
  };

  const navigateDay = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setDate(prev.getDate() + (direction === 'next' ? 1 : -1));
      return newDate;
    });
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(null);
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    // Add empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    // Add days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }

    return days;
  };

  const getWeekDays = (date: Date) => {
    const weekStart = new Date(date);
    const day = weekStart.getDay();
    const diff = weekStart.getDate() - day;
    weekStart.setDate(diff);

    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(weekStart);
      day.setDate(weekStart.getDate() + i);
      days.push(day);
    }
    return days;
  };

  const getAppointmentsForDate = (date: Date) => {
    return appointments.filter(apt => {
      const aptDate = new Date(apt.date);
      return aptDate.toDateString() === date.toDateString() &&
        (filterType === 'ALL' || apt.type === filterType) &&
        (apt.patientName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
         apt.doctorName?.toLowerCase().includes(searchQuery.toLowerCase()));
    });
  };

  const getAppointmentsForDay = (date: Date) => {
    const dayAppts = getAppointmentsForDate(date);
    return dayAppts.sort((a, b) => {
      const timeA = a.time.split(':').map(Number);
      const timeB = b.time.split(':').map(Number);
      return timeA[0] * 60 + timeA[1] - (timeB[0] * 60 + timeB[1]);
    });
  };

  const filteredAppointments = appointments.filter(apt => {
    const matchesType = filterType === 'ALL' || apt.type === filterType;
    const matchesSearch = 
      apt.patientName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      apt.doctorName?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  const getAppointmentColor = (type: AppointmentType) => {
    switch (type) {
      case 'VIDEO':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'AUDIO':
        return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
      case 'CHAT':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  const getAppointmentIcon = (type: AppointmentType) => {
    switch (type) {
      case 'VIDEO':
        return Video;
      case 'AUDIO':
        return Phone;
      case 'CHAT':
        return MessageSquare;
      default:
        return Clock;
    }
  };

  const renderMonthView = () => {
    const days = getDaysInMonth(currentDate);
    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return (
      <div className="bg-white dark:bg-[#0F172A] rounded-3xl border border-gray-100 dark:border-gray-700/50 p-6">
        <div className="grid grid-cols-7 gap-2 mb-4">
          {weekDays.map(day => (
            <div key={day} className="text-center text-xs font-bold text-gray-500 dark:text-gray-400 py-2">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-2">
          {days.map((day, index) => {
            if (!day) {
              return <div key={index} className="aspect-square" />;
            }

            const dayAppts = getAppointmentsForDate(day);
            const isToday = day.toDateString() === new Date().toDateString();
            const isSelected = selectedDate?.toDateString() === day.toDateString();

            return (
              <div
                key={index}
                onClick={() => setSelectedDate(day)}
                className={`aspect-square p-2 rounded-xl cursor-pointer transition-all hover:bg-gray-50 dark:hover:bg-gray-800 ${
                  isToday ? 'bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-500' : ''
                } ${isSelected ? 'ring-2 ring-blue-500' : ''}`}
              >
                <div className={`text-sm font-bold mb-1 ${
                  isToday ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-white'
                }`}>
                  {day.getDate()}
                </div>
                {dayAppts.length > 0 && (
                  <div className="space-y-1">
                    {dayAppts.slice(0, 3).map((apt, aptIndex) => {
                      const Icon = getAppointmentIcon(apt.type as AppointmentType);
                      return (
                        <div
                          key={aptIndex}
                          className={`text-xs px-1 py-0.5 rounded ${getAppointmentColor(apt.type as AppointmentType)} truncate flex items-center gap-1`}
                        >
                          <Icon size={10} />
                          {apt.time}
                        </div>
                      );
                    })}
                    {dayAppts.length > 3 && (
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        +{dayAppts.length - 3} more
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderWeekView = () => {
    const weekDays = getWeekDays(currentDate);
    const weekDaysNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return (
      <div className="bg-white dark:bg-[#0F172A] rounded-3xl border border-gray-100 dark:border-gray-700/50 p-6">
        <div className="grid grid-cols-7 gap-4">
          {weekDays.map((day, index) => {
            const dayAppts = getAppointmentsForDay(day);
            const isToday = day.toDateString() === new Date().toDateString();

            return (
              <div key={index} className="min-h-[400px]">
                <div className={`text-center p-2 rounded-lg mb-2 ${
                  isToday ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                }`}>
                  <div className="text-xs text-gray-500 dark:text-gray-400 font-bold">
                    {weekDaysNames[index]}
                  </div>
                  <div className={`text-lg font-bold ${
                    isToday ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-white'
                  }`}>
                    {day.getDate()}
                  </div>
                </div>
                <div className="space-y-2">
                  {dayAppts.map((apt, aptIndex) => {
                    const Icon = getAppointmentIcon(apt.type as AppointmentType);
                    return (
                      <div
                        key={aptIndex}
                        className={`p-2 rounded-lg border ${getAppointmentColor(apt.type as AppointmentType)} border-current/20`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Icon size={14} />
                          <span className="text-xs font-bold">{apt.time}</span>
                        </div>
                        <div className="text-xs font-bold truncate">
                          {apt.patientName || apt.doctorName}
                        </div>
                        <div className="text-xs opacity-75 truncate">
                          {apt.type}
                        </div>
                      </div>
                    );
                  })}
                  {dayAppts.length === 0 && (
                    <div className="text-xs text-gray-400 dark:text-gray-600 text-center py-4">
                      No appointments
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderDayView = () => {
    const dayAppts = getAppointmentsForDay(currentDate);
    const hours = Array.from({ length: 24 }, (_, i) => i);

    return (
      <div className="bg-white dark:bg-[#0F172A] rounded-3xl border border-gray-100 dark:border-gray-700/50 p-6">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {currentDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </h2>
        </div>
        <div className="space-y-4">
          {hours.map(hour => {
            const hourAppts = dayAppts.filter(apt => {
              const aptHour = parseInt(apt.time.split(':')[0]);
              return aptHour === hour;
            });

            return (
              <div key={hour} className="flex gap-4">
                <div className="w-16 text-right text-sm font-bold text-gray-500 dark:text-gray-400">
                  {hour.toString().padStart(2, '0')}:00
                </div>
                <div className="flex-1">
                  {hourAppts.map((apt, index) => {
                    const Icon = getAppointmentIcon(apt.type as AppointmentType);
                    return (
                      <div
                        key={index}
                        className={`p-3 rounded-lg mb-2 ${getAppointmentColor(apt.type as AppointmentType)}`}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <Icon size={16} />
                          <span className="font-bold">{apt.time}</span>
                        </div>
                        <div className="font-bold text-sm">
                          {apt.patientName || apt.doctorName}
                        </div>
                        <div className="text-xs opacity-75">
                          {apt.type} • {apt.status}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  if (loading) {
    return <SkeletonLoader type="dashboard" />;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Calendar</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">View and manage your appointments</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={goToToday}
            className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl font-bold hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            Today
          </button>
          <button
            onClick={() => notify('New appointment feature coming soon', 'info')}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg flex items-center gap-2 transition-colors"
          >
            <Plus size={20} />
            New Appointment
          </button>
        </div>
      </div>

      {/* View Mode & Navigation */}
      <div className="bg-white dark:bg-[#0F172A] rounded-3xl border border-gray-100 dark:border-gray-700/50 p-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
          {/* View Mode Selector */}
          <div className="flex gap-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
            {(['month', 'week', 'day'] as ViewMode[]).map(mode => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors ${
                  viewMode === mode
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </button>
            ))}
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => viewMode === 'month' ? navigateMonth('prev') : viewMode === 'week' ? navigateWeek('prev') : navigateDay('prev')}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <ChevronLeft size={20} className="text-gray-600 dark:text-gray-400" />
            </button>
            <div className="text-lg font-bold text-gray-900 dark:text-white min-w-[200px] text-center">
              {viewMode === 'month' && currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              {viewMode === 'week' && `${getWeekDays(currentDate)[0].toLocaleDateString()} - ${getWeekDays(currentDate)[6].toLocaleDateString()}`}
              {viewMode === 'day' && currentDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </div>
            <button
              onClick={() => viewMode === 'month' ? navigateMonth('next') : viewMode === 'week' ? navigateWeek('next') : navigateDay('next')}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <ChevronRight size={20} className="text-gray-600 dark:text-gray-400" />
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search appointments..."
              className="w-full pl-12 pr-4 py-2 bg-gray-50 dark:bg-[#0A0F1C] border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
            />
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
            className="px-4 py-2 bg-gray-50 dark:bg-[#0A0F1C] border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
          >
            <option value="ALL">All Types</option>
            <option value="VIDEO">Video</option>
            <option value="AUDIO">Audio</option>
            <option value="CHAT">Chat</option>
            <option value="IN_PERSON">In Person</option>
          </select>
        </div>

        {/* Calendar View */}
        {viewMode === 'month' && renderMonthView()}
        {viewMode === 'week' && renderWeekView()}
        {viewMode === 'day' && renderDayView()}
      </div>

      {/* Selected Date Appointments */}
      {selectedDate && (
        <div className="bg-white dark:bg-[#0F172A] rounded-3xl border border-gray-100 dark:border-gray-700/50 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Appointments for {selectedDate.toLocaleDateString()}
            </h2>
            <button
              onClick={() => setSelectedDate(null)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              <X size={20} />
            </button>
          </div>
          <div className="space-y-3">
            {getAppointmentsForDay(selectedDate).map((apt, index) => {
              const Icon = getAppointmentIcon(apt.type as AppointmentType);
              return (
                <div
                  key={index}
                  className={`p-4 rounded-xl ${getAppointmentColor(apt.type as AppointmentType)}`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <Icon size={20} />
                    <span className="font-bold">{apt.time}</span>
                    <span className="text-xs opacity-75">{apt.status}</span>
                  </div>
                  <div className="font-bold">
                    {apt.patientName || apt.doctorName}
                  </div>
                  <div className="text-sm opacity-75">
                    {apt.type} • {apt.location || 'Online'}
                  </div>
                </div>
              );
            })}
            {getAppointmentsForDay(selectedDate).length === 0 && (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                No appointments scheduled for this date
              </div>
            )}
          </div>
        </div>
      )}

      {appointments.length === 0 && (
        <EmptyState
          icon={CalendarIcon}
          title="No appointments scheduled"
          description="Your appointments will appear here when you have scheduled consultations"
        />
      )}
    </div>
  );
};

