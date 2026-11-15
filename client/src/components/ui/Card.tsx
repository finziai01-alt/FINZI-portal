import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  header?: React.ReactNode;
  footer?: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({ children, header, footer, className, ...props }) => {
  return (
    <div className={`bg-surface border border-border rounded-lg shadow-sm overflow-hidden ${className}`} {...props}>
      {header && <div className="border-b border-border px-4 py-3 bg-surface-container-low">{header}</div>}
      <div className="px-4 py-4">{children}</div>
      {footer && <div className="border-t border-border px-4 py-3 bg-surface-container-low">{footer}</div>}
    </div>
  );
};

export const CardHeader: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <div className="px-4 py-3">{children}</div>
);

export const CardContent: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <div className="px-4 py-4">{children}</div>
);

