import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

export const buttonVariants = cva(
  'inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap text-xs font-medium uppercase tracking-widest transition-all outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4',
  {
    variants: {
      variant: {
        default: 'bg-[var(--primary)] text-[var(--primary-foreground)] hover:bg-[var(--accent)]',
        outline: 'border border-[var(--border)] bg-transparent hover:bg-[var(--primary)] hover:text-[var(--primary-foreground)]',
        wine: 'bg-[var(--accent)] text-[var(--accent-foreground)] hover:brightness-110',
        secondary: 'bg-[var(--secondary)] text-[var(--secondary-foreground)] hover:bg-[var(--primary)] hover:text-[var(--primary-foreground)]',
        ghost: 'text-inherit hover:bg-black/5',
        link: 'h-auto p-0 font-normal text-inherit underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-11 px-6 py-2.5',
        sm: 'h-9 px-4 text-[10px]',
        lg: 'h-14 px-8 text-sm tracking-[0.16em]',
        icon: 'size-10 p-0',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return <Comp className={cn(buttonVariants({ variant, size }), className)} ref={ref} {...props} />;
  },
);
Button.displayName = 'Button';
