
import React, { useState, useEffect, useRef } from 'react';
import { Search, User, Pill, FileText, ChevronRight, X, ChevronDown } from 'lucide-react';
import { db } from '../services/db';
import { Doctor, Medicine, Article } from '../types';
import { MOCK_ARTICLES } from '../constants'; // Keeping articles mock until DB population

interface GlobalSearchProps {
  onNavigate: (view: string) => void;
}

export const GlobalSearch: React.FC<GlobalSearchProps> = ({ onNavigate }) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  // Use mock articles for now as DB articles might be empty
  const [articles, setArticles] = useState<Article[]>(MOCK_ARTICLES);

  useEffect(() => {
      // Pre-fetch data for client-side search (or in real app, debounce fetch on query change)
      const loadData = async () => {
          try {
              const [docData, medData] = await Promise.all([
                  db.getDoctors(),
                  db.getMedicines()
              ]);
              setDoctors(docData);
              setMedicines(medData);
          } catch(e) {
              console.error("Search data load error", e);
          }
      };
      loadData();
  }, []);

  const hasQuery = query.trim().length > 0;

  // Filter Data
  const filteredDoctors = hasQuery ? doctors.filter(d => 
    d.name.toLowerCase().includes(query.toLowerCase()) || 
    d.specialty.toLowerCase().includes(query.toLowerCase())
  ) : [];

  const filteredMedicines = hasQuery ? medicines.filter(m => 
    m.name.toLowerCase().includes(query.toLowerCase()) || 
    m.category.toLowerCase().includes(query.toLowerCase()) ||
    m.description.toLowerCase().includes(query.toLowerCase())
  ) : [];

  const filteredArticles = hasQuery ? articles.filter(a => 
    a.title.toLowerCase().includes(query.toLowerCase()) || 
    a.category.toLowerCase().includes(query.toLowerCase())
  ) : [];

  const hasResults = filteredDoctors.length > 0 || filteredMedicines.length > 0 || filteredArticles.length > 0;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (view: string) => {
    onNavigate(view);
    setIsOpen(false);
    setQuery('');
  };

  return (
    <div className="relative w-full max-w-2xl" ref={searchRef}>
      <div className="relative flex items-center bg-gray-100 dark:bg-[#0A1B2E] rounded-full shadow-sm hover:shadow-md transition-shadow border border-transparent hover:border-gray-200 dark:hover:border-gray-700 group">
        
        {/* Category Dropdown Trigger Style */}
        <button className="flex items-center gap-2 pl-5 pr-3 py-3 border-r border-gray-300 dark:border-gray-700 text-sm font-bold text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors">
            All <ChevronDown size={14} strokeWidth={2.5} />
        </button>

        <div className="flex-1 relative">
            <input
            type="text"
            value={query}
            onChange={(e) => {
                setQuery(e.target.value);
                setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            placeholder="Search..."
            className="w-full pl-4 pr-12 py-3.5 bg-transparent border-none focus:outline-none text-gray-900 dark:text-white placeholder-gray-400 font-medium"
            />
            {query ? (
                <button 
                    onClick={() => {
                    setQuery('');
                    setIsOpen(false);
                    }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 bg-gray-200 dark:bg-gray-700 rounded-full p-1"
                >
                    <X size={14} />
                </button>
            ) : (
                <Search className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 group-hover:text-blue-500 transition-colors" size={20} />
            )}
        </div>
      </div>

      {isOpen && hasQuery && (
        <div className="absolute top-[calc(100%+8px)] left-0 w-full bg-white dark:bg-[#0F172A] rounded-3xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden z-50 max-h-[80vh] overflow-y-auto animate-in slide-in-from-top-2">
          {!hasResults ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              <p className="font-medium">No results found for "{query}"</p>
            </div>
          ) : (
            <div className="py-2">
              {/* Doctors Section */}
              {filteredDoctors.length > 0 && (
                <div className="mb-2">
                  <h4 className="px-5 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider">Doctors</h4>
                  {filteredDoctors.map(doc => (
                    <button
                      key={doc.id}
                      onClick={() => handleSelect('consultations')}
                      className="w-full px-5 py-3 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-left group"
                    >
                      <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:bg-blue-200 dark:group-hover:bg-blue-900/50 transition-colors">
                        <User size={18} />
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-gray-900 dark:text-white text-sm">{doc.name}</p>
                        <p className="text-xs text-gray-500">{doc.specialty}</p>
                      </div>
                      <ChevronRight size={16} className="text-gray-300 group-hover:text-blue-500" />
                    </button>
                  ))}
                </div>
              )}

              {/* Medicines Section */}
              {filteredMedicines.length > 0 && (
                <div className="mb-2">
                  <h4 className="px-5 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider">Pharmacy</h4>
                  {filteredMedicines.map(med => (
                    <button
                      key={med.id}
                      onClick={() => handleSelect('pharmacy')}
                      className="w-full px-5 py-3 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-left group"
                    >
                      <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-200 dark:group-hover:bg-emerald-900/50 transition-colors">
                        <Pill size={18} />
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-gray-900 dark:text-white text-sm">{med.name}</p>
                        <p className="text-xs text-gray-500">{med.category}</p>
                      </div>
                      <ChevronRight size={16} className="text-gray-300 group-hover:text-emerald-500" />
                    </button>
                  ))}
                </div>
              )}

              {/* Articles Section */}
              {filteredArticles.length > 0 && (
                <div className="mb-2">
                  <h4 className="px-5 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider">Articles</h4>
                  {filteredArticles.map(article => (
                    <button
                      key={article.id}
                      onClick={() => handleSelect('articles')}
                      className="w-full px-5 py-3 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-left group"
                    >
                      <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400 group-hover:bg-purple-200 dark:group-hover:bg-purple-900/50 transition-colors">
                        <FileText size={18} />
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-gray-900 dark:text-white text-sm">{article.title}</p>
                        <p className="text-xs text-gray-500">{article.category}</p>
                      </div>
                      <ChevronRight size={16} className="text-gray-300 group-hover:text-purple-500" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
