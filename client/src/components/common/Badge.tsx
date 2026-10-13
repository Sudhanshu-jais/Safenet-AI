import React from 'react';

export type BadgeVariant = 'primary' | 'success' | 'warning' | 'critical' | 'neutral' | 'simulation' | 'info';

export const getPriorityBadgeVariant = (priority?: string): BadgeVariant => {
  switch (priority) {
    case 'CRITICAL':
      return 'critical';
    case 'HIGH':
      return 'warning';
    case 'MEDIUM':
      return 'info';
    case 'LOW':
    default:
      return 'neutral';
  }
};

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
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
    primary: 'bg-pink-50 text-pink-700 border border-pink-200 font-medium',
    success: 'bg-emerald-50 text-emerald-800 border border-emerald-200 font-medium',
    warning: 'bg-amber-50 text-amber-800 border border-amber-200 font-medium',
    critical: 'bg-red-50 text-red-800 border border-red-200 font-medium',
    neutral: 'bg-slate-100 text-slate-700 border border-slate-200 font-medium',
    simulation: 'bg-pink-50 text-pink-700 border border-pink-200 font-medium tracking-wide uppercase',
    info: 'bg-sky-50 text-sky-800 border border-sky-200 font-medium',
  }[variant];

  return (
    <span className={`inline-flex items-center gap-1 rounded-full font-medium ${sizeClasses} ${variantClasses} ${className}`}>
      {children}
    </span>
  );
};
