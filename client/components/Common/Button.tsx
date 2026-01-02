import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg' | 'icon';
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  className = '', 
  ...props 
}) => {
  const baseStyles = "inline-flex items-center justify-center font-medium transition-all focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg active:scale-[0.98]";
  
  const variants = {
    primary: "bg-brand-600 text-white hover:bg-brand-700 shadow-sm border border-transparent focus:ring-brand-500",
    secondary: "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 focus:ring-slate-200",
    ghost: "text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200 border border-transparent",
    danger: "bg-rose-600 text-white hover:bg-rose-700 shadow-sm border border-transparent focus:ring-rose-500",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-xs h-8",
    md: "px-4 py-2 text-sm h-10",
    lg: "px-6 py-3 text-base h-12",
    icon: "p-2 h-9 w-9",
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`} 
      {...props}
    >
      {children}
    </button>
  );
};