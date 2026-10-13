import React from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost' | 'success';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  icon,
  className = '',
  disabled,
  ...props
}) => {
  const sizeClasses = {
    sm: 'px-2.5 py-1.5 text-xs font-medium',
    md: 'px-3.5 py-2 text-sm font-medium',
    lg: 'px-5 py-2.5 text-base font-medium',
  }[size];

  const variantClasses = {
    primary: 'bg-pink-600 text-white hover:bg-pink-700 shadow-sm shadow-pink-600/20 focus:ring-2 focus:ring-pink-500 focus:ring-offset-1 border border-transparent font-semibold',
    secondary: 'bg-white text-textPrimary hover:bg-slate-50 border border-slate-200 shadow-sm focus:ring-2 focus:ring-slate-300',
    outline: 'bg-transparent text-pink-700 hover:bg-pink-50 border border-pink-300 font-semibold',
    danger: 'bg-red-600 text-white hover:bg-red-700 shadow-sm focus:ring-2 focus:ring-red-500 border border-transparent',
    success: 'bg-emerald-700 text-white hover:bg-emerald-800 shadow-sm focus:ring-2 focus:ring-emerald-600 border border-transparent',
    ghost: 'bg-transparent text-textSecondary hover:text-textPrimary hover:bg-slate-100',
  }[variant];

  return (
    <button
      disabled={disabled || isLoading}
      className={`inline-flex items-center justify-center gap-2 rounded-lg transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed ${sizeClasses} ${variantClasses} ${className}`}
      {...props}
    >
      {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : icon}
      {children}
    </button>
  );
};
