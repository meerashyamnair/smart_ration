import React from 'react';
import { AlertCircle, CheckCircle2, Info, AlertTriangle } from 'lucide-react';

interface AlertProps {
  type?: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export const Alert: React.FC<AlertProps> = ({
  type = 'info',
  title,
  children,
  className = ''
}) => {
  const styles = {
    info: {
      bg: 'bg-blue-950/40 border-blue-800/60 text-blue-300',
      icon: <Info className="w-5 h-5 text-blue-400 shrink-0" />
    },
    success: {
      bg: 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300',
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
    },
    warning: {
      bg: 'bg-amber-950/40 border-amber-800/60 text-amber-300',
      icon: <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
    },
    error: {
      bg: 'bg-rose-950/40 border-rose-800/60 text-rose-300',
      icon: <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
    }
  };

  const current = styles[type];

  return (
    <div className={`p-4 rounded-xl border flex items-start gap-3 text-xs leading-relaxed ${current.bg} ${className}`}>
      {current.icon}
      <div>
        {title && <h5 className="font-bold text-sm mb-0.5 text-white">{title}</h5>}
        <div>{children}</div>
      </div>
    </div>
  );
};
