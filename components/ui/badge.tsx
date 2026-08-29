import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

export const badgeVariants = cva(
  'inline-flex items-center border px-2.5 py-0.5 text-[9px] font-semibold uppercase tracking-widest transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--ring)]',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-[var(--primary)] text-[var(--primary-foreground)]',
        secondary: 'border-transparent bg-[var(--secondary)] text-[var(--secondary-foreground)]',
        wine: 'border-transparent bg-[var(--accent)] text-[var(--accent-foreground)]',
        outline: 'border-[var(--border)] bg-transparent text-inherit',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <div
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}
