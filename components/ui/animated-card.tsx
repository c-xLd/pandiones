import * as React from 'react';
import { cn } from '@/lib/utils';

export function AnimatedCard({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('relative h-full transition-transform duration-300 hover:-translate-y-1', className)} {...props}>
      {children}
    </div>
  );
}
