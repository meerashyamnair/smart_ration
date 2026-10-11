import React from 'react';

interface LoadingSpinnerProps {
  label?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  label = 'Loading PDS Service Data...',
  size = 'md'
}) => {
  const sizeMap = {
    sm: 'w-5 h-5 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4'
  };

  return (
    <div className="flex flex-col items-center justify-center p-8 space-y-3">
      <div className={`${sizeMap[size]} border-emerald-500 border-t-transparent rounded-full animate-spin`} />
      {label && <p className="text-xs font-semibold text-slate-400">{label}</p>}
    </div>
  );
};
