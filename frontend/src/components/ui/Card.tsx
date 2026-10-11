import React from 'react';

interface CardProps {
  children: React.ReactNode;
  title?: React.ReactNode;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
  footer?: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
  children,
  title,
  subtitle,
  action,
  className = '',
  footer
}) => {
  return (
    <div className={`bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-md flex flex-col justify-between ${className}`}>
      <div>
        {(title || action) && (
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800/80">
            <div>
              {typeof title === 'string' ? (
                <h3 className="font-bold text-white text-lg tracking-tight">{title}</h3>
              ) : (
                title
              )}
              {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
            </div>
            {action && <div>{action}</div>}
          </div>
        )}
        <div>{children}</div>
      </div>
      {footer && <div className="mt-4 pt-4 border-t border-slate-800/80 text-xs">{footer}</div>}
    </div>
  );
};
