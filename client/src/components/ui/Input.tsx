import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, className, icon, ...props }, ref) => {
    return (
      <div className="w-full space-y-1">
        {label && <label className="block text-sm font-medium text-primary-text">{label}</label>}
        <div className="relative flex items-center">
          {icon && <span className="absolute left-3 text-secondary-text pointer-events-none">{icon}</span>}
          <input
            ref={ref}
            className={`block w-full px-3 py-2.5 border rounded-md bg-surface text-primary-text placeholder-secondary-text focus:outline-none focus:ring-2 focus:ring-green focus:border-transparent transition-all ${
              icon ? 'pl-9' : ''
            } ${error ? 'border-danger' : 'border-border'} ${className || ''}`}
            {...props}
          />
        </div>
        {error && <p className="text-xs text-danger">{error}</p>}
        {helperText && <p className="text-xs text-secondary-text">{helperText}</p>}
      </div>
    );
  }
);
Input.displayName = 'Input';

