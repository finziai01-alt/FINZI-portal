import React from 'react';
import { Loader2 } from 'lucide-react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../utils/cn';

/**
 * Button — the one control language for the whole workspace.
 *
 * Black carries authority (primary), emerald carries action (green), and every
 * other variant is a quiet support. Sizes are dense by default because this is
 * a screen people work in for hours, not a landing page.
 */
const buttonVariants = cva(
  cn(
    'relative inline-flex items-center justify-center gap-2 whitespace-nowrap select-none cursor-pointer',
    'font-medium tracking-[-0.005em] antialiased',
    'rounded-lg border',
    // Motion: background and transform only; press reads as a 2% settle, not a bounce.
    'transition-[background-color,border-color,color,box-shadow,transform] duration-micro ease-swift',
    'active:scale-[0.98]',
    // Focus is always visible on the keyboard, never a coloured halo on the mouse.
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/30 focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
    'disabled:pointer-events-none disabled:opacity-45 disabled:shadow-none disabled:active:scale-100',
    '[&_svg]:shrink-0 [&_svg]:pointer-events-none'
  ),
  {
    variants: {
      variant: {
        // Authority: near-black, white text, a single soft shadow for lift.
        primary: 'bg-primary text-on-primary border-primary shadow-xs hover:bg-primary-container active:bg-primary-container',
        // Action: the one accent, emerald from the Stitch secondary token.
        green: 'bg-brand text-on-secondary border-brand shadow-xs hover:bg-brand-hover hover:border-brand-hover active:bg-brand-press',
        // Support: a raised surface that recedes under the primary.
        secondary:
          'bg-surface text-primary-text border-line shadow-xs hover:bg-surface-container-low hover:border-line-strong active:bg-surface-container',
        // Outline: same weight as secondary, no fill until hovered.
        outline: 'bg-transparent text-primary-text border-line hover:bg-surface-container-low hover:border-line-strong active:bg-surface-container',
        // Ghost: no chrome at all until the pointer arrives.
        ghost: 'bg-transparent text-secondary-text border-transparent hover:bg-surface-container-low hover:text-primary-text active:bg-surface-container',
        danger: 'bg-error text-on-error border-error shadow-xs hover:bg-error/90 hover:border-error/90 active:bg-error/95',
        success: 'bg-brand text-on-secondary border-brand shadow-xs hover:bg-brand-hover hover:border-brand-hover active:bg-brand-press',
      },
      size: {
        default: 'h-9 px-3.5 text-[13px] [&_svg]:size-4',
        sm: 'h-8 px-3 text-[12.5px] gap-1.5 [&_svg]:size-3.5',
        lg: 'h-11 px-5 text-[14px] [&_svg]:size-[18px]',
        icon: 'h-9 w-9 p-0 text-[13px]',
        'icon-sm': 'h-8 w-8 p-0 text-[12.5px]',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  /** Shows a spinner and blocks interaction while the action is in flight. */
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading = false, children, disabled, ...props }, ref) => {
    const classes = cn(buttonVariants({ variant, size, className }));

    if (asChild && React.isValidElement(children)) {
      const child = children as React.ReactElement<{ className?: string }>;
      return React.cloneElement(child, {
        className: cn(classes, child.props.className),
      });
    }

    return (
      <button
        ref={ref}
        className={classes}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        {loading && <Loader2 aria-hidden="true" className="animate-spin-slow opacity-80" />}
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';

export { buttonVariants };