import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none rounded-md';

  const variants = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
    secondary: 'bg-slate-800 text-white hover:bg-slate-900 focus:ring-slate-500',
    outline: 'border border-slate-300 text-slate-700 bg-transparent hover:bg-slate-50 focus:ring-slate-500',
    ghost: 'bg-transparent text-slate-700 hover:bg-slate-100 hover:text-slate-900',
  };

  const sizes = {
    sm: 'h-8 px-3 text-sm',
    md: 'h-10 px-4 py-2',
    lg: 'h-12 px-6 text-lg',
  };

  // If className contains color/background classes, don't apply variant styles
  // We check for 'bg-' but exclude 'bg-transparent' which might be used with outline/ghost
  // We check for 'text-' but exclude size classes like 'text-sm', 'text-lg', 'text-xl'
  const hasCustomBg = className.split(' ').some(cls => cls.startsWith('bg-') && cls !== 'bg-transparent');
  const hasCustomText = className.split(' ').some(cls => cls.startsWith('text-') && !['text-xs', 'text-sm', 'text-base', 'text-lg', 'text-xl', 'text-2xl', 'text-3xl'].includes(cls));

  const variantClass = (hasCustomBg || hasCustomText) ? '' : variants[variant];

  return (
    <button
      className={`${baseStyles} ${sizes[size]} ${variantClass} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
