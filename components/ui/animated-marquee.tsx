'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface AnimatedMarqueeProps {
  children: React.ReactNode;
  speed?: number;
  direction?: 'left' | 'right';
  pauseOnHover?: boolean;
  className?: string;
}

export function AnimatedMarquee({
  children,
  speed = 30,
  direction = 'left',
  pauseOnHover = true,
  className,
}: AnimatedMarqueeProps) {
  return (
    <div
      className={cn(
        'group flex overflow-hidden p-2 select-none gap-6',
        pauseOnHover && 'hover:[&_*]:[animation-play-state:paused]',
        className
      )}
    >
      <div
        className={cn(
          'flex min-w-full shrink-0 items-center justify-around gap-6',
          direction === 'left' ? 'animate-marquee-left' : 'animate-marquee-right'
        )}
        style={{ animationDuration: `${speed}s` }}
      >
        {children}
      </div>
      <div
        aria-hidden="true"
        className={cn(
          'flex min-w-full shrink-0 items-center justify-around gap-6',
          direction === 'left' ? 'animate-marquee-left' : 'animate-marquee-right'
        )}
        style={{ animationDuration: `${speed}s` }}
      >
        {children}
      </div>
    </div>
  );
}
