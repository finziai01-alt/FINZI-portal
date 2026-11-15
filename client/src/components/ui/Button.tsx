import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'bg-navy text-white shadow-sm hover:bg-navy/90',
        green: 'bg-green-600 text-white shadow-sm hover:bg-green-600/90',
        secondary: 'bg-surface border border-border text-primary-text hover:bg-gray-100',
        outline: 'border border-border text-primary-text hover:bg-gray-100',
        ghost: 'text-secondary-text hover:bg-gray-100 hover:text-primary-text',
        danger: 'bg-danger text-white hover:bg-danger/90',
        success: 'bg-green-600 text-white hover:bg-green-600/90',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'default',
    },
  }
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? React.Fragment : 'button';
  return (
    <Comp
      ref={ref as React.Ref<HTMLButtonElement>}
      className={buttonVariants({ variant, size, className })}
      {...props}
    />
  );
});
Button.displayName = 'Button';
