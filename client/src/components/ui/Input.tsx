import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(({ label, error, helperText, className, ...props }, ref) => {
  return (
    <div className="w-full space-y-1">
      {label && <label className="block text-sm font-medium text-primary-text">{label}</label>}
      <input
        ref={ref}
        className={`block w-full px-3 py-2.5 border rounded-md bg-surface text-primary-text placeholder-secondary-text focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all ${
          error ? 'border-danger' : 'border-border'
        } ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-danger">{error}</p>}
      {helperText && <p className="text-xs text-secondary-text">{helperText}</p>}
    </div>
  );
});
Input.displayName = 'Input';
