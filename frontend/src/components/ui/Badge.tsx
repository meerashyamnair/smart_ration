import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'emerald' | 'amber' | 'blue' | 'rose' | 'slate' | 'saffron';
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'emerald',
  size = 'md'
}) => {
  const variants = {
    emerald: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    amber: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    saffron: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
    blue: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
    rose: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
    slate: 'bg-slate-800 text-slate-300 border-slate-700'
  };

  const sizes = {
    sm: 'text-[10px] px-2 py-0.5 font-bold',
    md: 'text-xs px-2.5 py-1 font-semibold'
  };

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border ${variants[variant]} ${sizes[size]}`}>
      {children}
    </span>
  );
};
