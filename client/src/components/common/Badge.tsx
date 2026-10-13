import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'primary' | 'success' | 'warning' | 'critical' | 'neutral' | 'simulation';
  size?: 'sm' | 'md';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'md',
  className = '',
}) => {
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  const variantClasses = {
    primary: 'bg-blue-50 text-blue-700 border border-blue-200 font-medium',
    success: 'bg-emerald-50 text-emerald-800 border border-emerald-200 font-medium',
    warning: 'bg-amber-50 text-amber-800 border border-amber-200 font-medium',
    critical: 'bg-red-50 text-red-800 border border-red-200 font-medium',
    neutral: 'bg-slate-100 text-slate-700 border border-slate-200 font-medium',
    simulation: 'bg-purple-50 text-purple-700 border border-purple-200 font-medium tracking-wide uppercase',
  }[variant];

  return (
    <span className={`inline-flex items-center gap-1 rounded-full font-medium ${sizeClasses} ${variantClasses} ${className}`}>
      {children}
    </span>
  );
};
