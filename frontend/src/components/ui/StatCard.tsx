import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  color?: 'emerald' | 'amber' | 'blue' | 'purple' | 'rose';
  description?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  trend,
  color = 'emerald',
  description
}) => {
  const colorStyles = {
    emerald: 'bg-emerald-950/40 border-emerald-800/40 text-emerald-400',
    amber: 'bg-amber-950/40 border-amber-800/40 text-amber-400',
    blue: 'bg-blue-950/40 border-blue-800/40 text-blue-400',
    purple: 'bg-purple-950/40 border-purple-800/40 text-purple-400',
    rose: 'bg-rose-950/40 border-rose-800/40 text-rose-400',
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex items-center justify-between hover:border-slate-700 transition-all">
      <div className="space-y-1">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{title}</p>
        <h3 className="text-2xl font-black text-white tracking-tight">{value}</h3>
        {description && <p className="text-xs text-slate-500">{description}</p>}
        {trend && (
          <div className={`text-xs font-semibold flex items-center gap-1 ${trend.isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
            <span>{trend.isPositive ? '↑' : '↓'}</span>
            <span>{trend.value}</span>
            <span className="text-slate-500 font-normal">vs last month</span>
          </div>
        )}
      </div>

      <div className={`w-12 h-12 rounded-xl border flex items-center justify-center shrink-0 ${colorStyles[color]}`}>
        {icon}
      </div>
    </div>
  );
};
