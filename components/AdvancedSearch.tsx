import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Clock, Filter } from 'lucide-react';

interface SearchFilter {
  category?: string;
  dateRange?: string;
  status?: string;
  [key: string]: any;
}

interface AdvancedSearchProps {
  onSearch: (query: string, filters?: SearchFilter) => void;
  onNavigate?: (view: string) => void;
  placeholder?: string;
  suggestions?: string[];
  recentSearches?: string[];
  showFilters?: boolean;
  className?: string;
}

export const AdvancedSearch: React.FC<AdvancedSearchProps> = ({
  onSearch,
  onNavigate,
  placeholder = 'Search...',
  suggestions = [],
  recentSearches = [],
  showFilters = true,
  className = ''
}) => {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filters, setFilters] = useState<SearchFilter>({});
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.length > 2) {
        onSearch(query, filters);
      } else if (query.length === 0) {
        onSearch('', filters);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, filters]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
        setIsFocused(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === 'Escape') {
        setShowSuggestions(false);
        inputRef.current?.blur();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
    setShowSuggestions(false);
    onSearch(suggestion, filters);
    inputRef.current?.focus();
  };

  const handleRecentSearchClick = (search: string) => {
    setQuery(search);
    setShowSuggestions(false);
    onSearch(search, filters);
  };

  const clearSearch = () => {
    setQuery('');
    setFilters({});
    onSearch('', {});
    inputRef.current?.focus();
  };

  const displaySuggestions = query.length > 0 
    ? suggestions.filter(s => s.toLowerCase().includes(query.toLowerCase()))
    : recentSearches.slice(0, 5);

  return (
    <div ref={searchRef} className={`relative ${className}`}>
      <div className="relative">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
          <Search size={20} />
        </div>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            setIsFocused(true);
            setShowSuggestions(true);
          }}
          placeholder={placeholder}
          className="w-full pl-12 pr-20 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-gray-900 dark:text-white placeholder-gray-400"
          aria-label="Search"
          aria-expanded={showSuggestions}
          aria-haspopup="listbox"
        />
        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
          {query && (
            <button
              onClick={clearSearch}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
              aria-label="Clear search"
            >
              <X size={18} />
            </button>
          )}
          {showFilters && (
            <button
              onClick={() => setShowFilterPanel(!showFilterPanel)}
              className={`p-1.5 rounded-lg transition-colors ${
                Object.keys(filters).length > 0
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                  : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
              aria-label="Toggle filters"
            >
              <Filter size={18} />
            </button>
          )}
          <kbd className="hidden md:inline-flex items-center px-2 py-1 text-xs font-semibold text-gray-500 bg-gray-100 dark:bg-gray-700 dark:text-gray-400 border border-gray-200 dark:border-gray-600 rounded">
            Ctrl+K
          </kbd>
        </div>
      </div>

      {/* Suggestions Dropdown */}
      {showSuggestions && isFocused && displaySuggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-[#0F172A] rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
          {query.length === 0 && recentSearches.length > 0 && (
            <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-2 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">
                <Clock size={14} />
                Recent Searches
              </div>
            </div>
          )}
          <div role="listbox">
            {displaySuggestions.map((item, index) => (
              <button
                key={index}
                onClick={() => handleSuggestionClick(item)}
                className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center gap-3"
                role="option"
              >
                <Search size={16} className="text-gray-400" />
                <span className="text-sm text-gray-900 dark:text-white">{item}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Filter Panel */}
      {showFilterPanel && showFilters && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-[#0F172A] rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-4 z-50 animate-in fade-in slide-in-from-top-2">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">
                Category
              </label>
              <select
                value={filters.category || ''}
                onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm"
              >
                <option value="">All Categories</option>
                <option value="appointments">Appointments</option>
                <option value="prescriptions">Prescriptions</option>
                <option value="articles">Articles</option>
                <option value="patients">Patients</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">
                Status
              </label>
              <select
                value={filters.status || ''}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm"
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="pending">Pending</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setFilters({})}
                className="flex-1 px-4 py-2 text-sm font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                Clear Filters
              </button>
              <button
                onClick={() => setShowFilterPanel(false)}
                className="flex-1 px-4 py-2 text-sm font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

