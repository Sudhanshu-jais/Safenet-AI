import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hoverable?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  onClick,
  hoverable = false,
}) => {
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.05)] ${
        hoverable ? 'hover:border-slate-300 hover:shadow-md transition-all duration-150 cursor-pointer' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
};
