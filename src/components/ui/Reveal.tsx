'use client';

import React, { useEffect, useRef, useState } from 'react';

type RevealProps = {
  as?: 'div' | 'section' | 'li' | 'ol' | 'ul';
  className?: string;
  children: React.ReactNode;
} & Omit<React.HTMLAttributes<HTMLElement>, 'className' | 'children'>;

/** Fades content up once it enters the viewport (IntersectionObserver, no scroll listener).
 *  Content is visible without JS and under reduced motion; see `.reveal` in components/reveal.css. */
export default function Reveal({ as: Tag = 'div', className, children, ...rest }: RevealProps) {
  const ref = useRef<HTMLElement>(null);
  const [state, setState] = useState<'idle' | 'waiting' | 'visible'>('idle');

  useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const rect = node.getBoundingClientRect();
    if (rect.top < window.innerHeight * 0.9) return; // already on screen: no hide-then-show flash
    setState('waiting');
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setState('visible');
          observer.disconnect();
        }
      },
      { rootMargin: '0px 0px -12% 0px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return React.createElement(
    Tag,
    {
      ...rest,
      ref,
      className: ['reveal', state === 'waiting' ? 'is-waiting' : '', state === 'visible' ? 'is-visible' : '', className].filter(Boolean).join(' '),
    },
    children,
  );
}
