import React from 'react';

interface SkeletonLoaderProps {
  type?: 'card' | 'list' | 'text' | 'avatar' | 'table' | 'dashboard';
  count?: number;
  className?: string;
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({ 
  type = 'card', 
  count = 1,
  className = '' 
}) => {
  const renderSkeleton = () => {
    switch (type) {
      case 'card':
        return (
          <div className={`animate-pulse bg-white dark:bg-[#0F172A] p-6 rounded-3xl border border-gray-100 dark:border-gray-700/50 ${className}`}>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-4"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
          </div>
        );

      case 'list':
        return (
          <div className={`animate-pulse space-y-3 ${className}`}>
            {Array.from({ length: count }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-4 bg-white dark:bg-[#0F172A] rounded-2xl border border-gray-100 dark:border-gray-700/50">
                <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        );

      case 'text':
        return (
          <div className={`animate-pulse space-y-2 ${className}`}>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-4/6"></div>
          </div>
        );

      case 'avatar':
        return (
          <div className={`animate-pulse ${className}`}>
            <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
          </div>
        );

      case 'table':
        return (
          <div className={`animate-pulse ${className}`}>
            <div className="space-y-3">
              {Array.from({ length: count }).map((_, i) => (
                <div key={i} className="flex gap-4 p-4 border-b border-gray-100 dark:border-gray-700/50">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded flex-1"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'dashboard':
        return (
          <div className={`animate-pulse space-y-6 ${className}`}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="bg-white dark:bg-[#0F172A] p-6 rounded-3xl border border-gray-100 dark:border-gray-700/50">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-4"></div>
                  <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
                </div>
              ))}
            </div>
            <div className="bg-white dark:bg-[#0F172A] p-6 rounded-3xl border border-gray-100 dark:border-gray-700/50">
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
              <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </div>
          </div>
        );

      default:
        return <div className="animate-pulse h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>;
    }
  };

  if (type === 'list' || type === 'table') {
    return <>{renderSkeleton()}</>;
  }

  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <React.Fragment key={i}>{renderSkeleton()}</React.Fragment>
      ))}
    </>
  );
};

