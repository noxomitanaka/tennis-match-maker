import type { HTMLAttributes } from 'react';

type Variant = 'default' | 'secondary' | 'destructive' | 'outline';

const variantClasses: Record<Variant, string> = {
  default: 'bg-primary text-primary-foreground',
  secondary: 'bg-secondary text-secondary-foreground',
  destructive: 'bg-destructive text-destructive-foreground',
  outline: 'border border-border text-foreground',
};

interface BadgeProps extends HTMLAttributes<HTMLDivElement> {
  variant?: Variant;
}

export function Badge({ variant = 'default', className = '', ...props }: BadgeProps) {
  return (
    <div
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors ${variantClasses[variant]} ${className}`}
      {...props}
    />
  );
}
