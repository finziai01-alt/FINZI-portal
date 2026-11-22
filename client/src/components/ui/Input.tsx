import React from 'react';
import { cn } from '../../utils/cn';

const FIELD_BASE = cn(
  'block w-full rounded-lg border bg-surface text-primary-text',
  'text-[13px] leading-5 placeholder:text-ink-3',
  'transition-[border-color,box-shadow,background-color] duration-micro ease-swift',
  'hover:border-line-strong',
  'focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand-ring',
  'disabled:cursor-not-allowed disabled:bg-sub disabled:text-ink-3 disabled:hover:border-line',
  'aria-[invalid=true]:border-error aria-[invalid=true]:focus:border-error aria-[invalid=true]:focus:ring-error/25'
);

const LABEL = 'block text-[12px] font-medium leading-4 text-ink-2';
const HELP = 'text-[11.5px] leading-4 text-ink-3';
const ERR = 'text-[11.5px] leading-4 text-danger-ink';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: React.ReactNode;
  /** Right-hand slot: a units suffix, a copy action, a clear button. */
  trailing?: React.ReactNode;
  /** A short note under the label, above the field. */
  hint?: string;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  hint?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, helperText, hint, className, id, ...props }, ref) => {
    const autoId = React.useId();
    const fieldId = id || `s${autoId}`;
    const describedBy = error ? `${fieldId}-err` : helperText ? `${fieldId}-help` : undefined;

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <div className="flex items-baseline justify-between gap-3">
            <label htmlFor={fieldId} className={LABEL}>
              {label}
            </label>
            {hint && <span className={cn(HELP, 'text-ink-4')}>{hint}</span>}
          </div>
        )}
        <select
          ref={ref}
          id={fieldId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(FIELD_BASE, 'h-10 px-3', 'appearance-none', className)}
          {...props}
        />
        {error && (
          <p id={`${fieldId}-err`} className={ERR} role="alert">
            {error}
          </p>
        )}
        {!error && helperText && (
          <p id={`${fieldId}-help`} className={HELP}>
            {helperText}
          </p>
        )}
      </div>
    );
  }
);
Select.displayName = 'Select';

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, icon, trailing, hint, className, id, ...props }, ref) => {
    const autoId = React.useId();
    const fieldId = id || `f${autoId}`;
    const describedBy = error ? `${fieldId}-err` : helperText ? `${fieldId}-help` : undefined;

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <div className="flex items-baseline justify-between gap-3">
            <label htmlFor={fieldId} className={LABEL}>
              {label}
            </label>
            {hint && <span className={cn(HELP, 'text-ink-4')}>{hint}</span>}
          </div>
        )}
        <div className="relative flex items-center">
          {icon && (
            <span className="pointer-events-none absolute left-3 flex text-ink-3 [&_svg]:size-4">{icon}</span>
          )}
          <input
            ref={ref}
            id={fieldId}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
            className={cn(
              FIELD_BASE,
              'h-10 px-3',
              icon && 'pl-9',
              trailing && 'pr-10',
              className
            )}
            {...props}
          />
          {trailing && <span className="absolute right-2.5 flex items-center">{trailing}</span>}
        </div>
        {error && (
          <p id={`${fieldId}-err`} className={ERR} role="alert">
            {error}
          </p>
        )}
        {!error && helperText && (
          <p id={`${fieldId}-help`} className={HELP}>
            {helperText}
          </p>
        )}
      </div>
    );
  }
);
Input.displayName = 'Input';

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
    label?: string;
    error?: string;
    helperText?: string;
    hint?: string;
  }
>(({ label, error, helperText, hint, className, id, rows = 4, ...props }, ref) => {
  const autoId = React.useId();
  const fieldId = id || `t${autoId}`;
  const describedBy = error ? `${fieldId}-err` : helperText ? `${fieldId}-help` : undefined;

  return (
    <div className="w-full space-y-1.5">
      {label && (
        <div className="flex items-baseline justify-between gap-3">
          <label htmlFor={fieldId} className={LABEL}>
            {label}
          </label>
          {hint && <span className={cn(HELP, 'text-ink-4')}>{hint}</span>}
        </div>
      )}
      <textarea
        ref={ref}
        id={fieldId}
        rows={rows}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cn(FIELD_BASE, 'resize-y px-3 py-2.5', className)}
        {...props}
      />
      {error && (
        <p id={`${fieldId}-err`} className={ERR} role="alert">
          {error}
        </p>
      )}
      {!error && helperText && (
        <p id={`${fieldId}-help`} className={HELP}>
          {helperText}
        </p>
      )}
    </div>
  );
});
Textarea.displayName = 'Textarea';