import React from 'react';

export const LoadingSpinner = ({ size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4',
  };

  return (
    <div
      className={`animate-spin rounded-full border-brand-500 border-t-transparent ${sizeClasses[size] || sizeClasses.md} ${className}`}
    />
  );
};

export const PageLoader = ({ message = 'Loading...' }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[300px] py-16 gap-3">
      <LoadingSpinner size="lg" />
      <p className="text-slate-500 text-sm font-medium">{message}</p>
    </div>
  );
};

