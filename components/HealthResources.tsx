
import React, { useState } from 'react';
import { HealthRecords } from './HealthRecords';
import { Articles } from './Articles';
import { MedicationTracker } from './MedicationTracker';
import { WearableIntegration } from './WearableIntegration';
import { ConditionsAndDiseases } from './ConditionsAndDiseases';
import { User, Article, HealthRecord, UserRole } from '../types';
import { FileText, BookOpen, Stethoscope, HeartPulse, Search, Pill, Watch, AlertCircle } from 'lucide-react';

interface HealthResourcesProps {
  user: User;
  articles: Article[];
  setArticles: React.Dispatch<React.SetStateAction<Article[]>>;
  onNavigate?: (view: string) => void;
  onViewDoctor?: (doctorId: string) => void;
  onViewAuthor?: (authorId: string) => void;
  healthRecords?: HealthRecord[];
  onAddHealthRecord?: (record: HealthRecord) => void;
}

export const HealthResources: React.FC<HealthResourcesProps> = ({ 
    user, 
    articles, 
    setArticles, 
    onNavigate, 
    onViewDoctor,
    onViewAuthor,
    healthRecords,
    onAddHealthRecord
}) => {
  const [activeTab, setActiveTab] = useState<'library' | 'conditions' | 'records' | 'medications' | 'wearables'>('library');
  const [librarySubTab, setLibrarySubTab] = useState<'articles' | 'conditions'>('articles');

  // Hide Health Hub header and tabs for COURIER role - they should only see articles
  const isCourier = user.role === UserRole.COURIER;
  
  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      
      {/* Header Section (Ada-style) - Hidden for Couriers */}
      {!isCourier && (
        <div className="bg-white dark:bg-white rounded-[2.5rem] p-8 md:p-10 shadow-sm border border-gray-100 dark:border-gray-600 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5">
                <Stethoscope size={200} />
            </div>
            
            <div className="relative z-10">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-serif font-bold text-gray-900 dark:text-gray-800 mb-2">Health Hub</h1>
                        <p className="text-lg text-gray-500 dark:text-gray-600 max-w-xl">
                            Your centralized space for medical knowledge and personal history.
                        </p>
                    </div>
                    
                    {/* Tab Switcher */}
                    <div className="bg-gray-100 dark:bg-[#0A1B2E] p-1.5 rounded-2xl flex shadow-inner overflow-x-auto">
                        <button 
                            onClick={() => setActiveTab('library')}
                            className={`px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2 transition-all whitespace-nowrap ${activeTab === 'library' ? 'bg-white dark:bg-white shadow-sm text-teal-600' : 'text-gray-500'}`}
                        >
                            <BookOpen size={18} /> Medical Library
                        </button>
                        <button 
                            onClick={() => setActiveTab('conditions')}
                            className={`px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2 transition-all whitespace-nowrap ${activeTab === 'conditions' ? 'bg-white dark:bg-white shadow-sm text-red-600' : 'text-gray-500'}`}
                        >
                            <AlertCircle size={18} /> Conditions
                        </button>
                        <button 
                            onClick={() => setActiveTab('records')}
                            className={`px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2 transition-all whitespace-nowrap ${activeTab === 'records' ? 'bg-white dark:bg-white shadow-sm text-blue-600' : 'text-gray-500'}`}
                        >
                            <FileText size={18} /> My Records
                        </button>
                        <button 
                            onClick={() => setActiveTab('medications')}
                            className={`px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2 transition-all whitespace-nowrap ${activeTab === 'medications' ? 'bg-white dark:bg-white shadow-sm text-green-600' : 'text-gray-500'}`}
                        >
                            <Pill size={18} /> Medications
                        </button>
                        <button 
                            onClick={() => setActiveTab('wearables')}
                            className={`px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2 transition-all whitespace-nowrap ${activeTab === 'wearables' ? 'bg-white dark:bg-white shadow-sm text-purple-600' : 'text-gray-500'}`}
                        >
                            <Watch size={18} /> Wearables
                        </button>
                    </div>
                </div>

                {/* Search Bar - Featured */}
                {activeTab === 'library' && (
                    <div className="space-y-4">
                        {/* Sub-tabs for Medical Library */}
                        <div className="flex gap-2">
                            <button
                                onClick={() => setLibrarySubTab('articles')}
                                className={`px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 transition-all ${
                                    librarySubTab === 'articles' 
                                        ? 'bg-teal-600 text-white shadow-sm' 
                                        : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                                }`}
                            >
                                <BookOpen size={16} /> Articles
                            </button>
                            <button
                                onClick={() => setLibrarySubTab('conditions')}
                                className={`px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 transition-all ${
                                    librarySubTab === 'conditions' 
                                        ? 'bg-teal-600 text-white shadow-sm' 
                                        : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                                }`}
                            >
                                <AlertCircle size={16} /> Conditions & Diseases
                            </button>
                        </div>
                        {librarySubTab === 'articles' && (
                    <div className="max-w-2xl relative">
                        <input 
                            type="text" 
                                    placeholder="Search articles, treatments, or health topics..." 
                            className="w-full pl-12 pr-4 py-4 rounded-2xl bg-gray-50 dark:bg-[#0A1B2E] border border-gray-200 dark:border-gray-600 text-lg focus:ring-2 focus:ring-teal-500 outline-none transition-shadow"
                        />
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
      )}

      {/* Content Area */}
      <div className="min-h-[500px]">
        {/* For couriers, always show articles. For others, show based on active tab */}
        {isCourier ? (
            <Articles 
                user={user} 
                articles={articles} 
                setArticles={setArticles} 
                viewMode="public" 
                onNavigate={onNavigate}
                onViewDoctor={onViewDoctor}
                onViewAuthor={onViewAuthor}
            />
        ) : activeTab === 'conditions' ? (
            <ConditionsAndDiseases onNavigate={onNavigate} />
        ) : activeTab === 'records' ? (
            <HealthRecords records={healthRecords} onAddRecord={onAddHealthRecord} />
        ) : activeTab === 'medications' ? (
            <MedicationTracker />
        ) : activeTab === 'wearables' ? (
            <WearableIntegration />
        ) : activeTab === 'library' && librarySubTab === 'conditions' ? (
            <ConditionsAndDiseases onNavigate={onNavigate} />
        ) : (
            <Articles 
                user={user} 
                articles={articles} 
                setArticles={setArticles} 
                viewMode="public" 
                onNavigate={onNavigate}
                onViewDoctor={onViewDoctor}
                onViewAuthor={onViewAuthor}
            />
        )}
      </div>
    </div>
  );
};
