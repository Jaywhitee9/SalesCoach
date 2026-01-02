
import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'indigo' | 'purple' | 'pink';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'neutral', className = '' }) => {
  const baseStyles = "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border border-transparent";

  const variants = {
    neutral: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700",
    brand: "bg-brand-100 text-brand-800 dark:bg-brand-900/30 dark:text-brand-300 dark:border-brand-800/50",
    success: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800/50",
    warning: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800/50",
    danger: "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-800/50",
    indigo: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800/50",
    purple: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800/50",
    pink: "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300 dark:border-pink-800/50",
  };

  return (
    <span className={`${baseStyles} ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
};
