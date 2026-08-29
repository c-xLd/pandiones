'use client';

import { useState } from 'react';
import SiteHeader from '@/components/site-header';
import SiteFooter from '@/components/site-footer';
import EditorialDropReel from '@/components/editorial-drop-reel';

import Hero from '@/components/home/hero';
import ComfortSwitch from '@/components/home/comfort-switch';
import Mood from '@/components/home/mood';
import Portal from '@/components/home/portal';
import Worlds from '@/components/home/worlds';
import Manifesto from '@/components/home/manifesto';

export default function Home() {
  const [mood, setMood] = useState<'soft' | 'bold'>('soft');

  const chooseMood = (next: 'soft' | 'bold') => {
    setMood(next);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('pandiones-mood', next);
    }
  };

  return (
    <main className={`site-shell mood-${mood}`}>
      <SiteHeader />
      <Hero />
      <ComfortSwitch />
      <Mood mood={mood} chooseMood={chooseMood} />
      <EditorialDropReel />
      <Portal />
      <Worlds />
      <Manifesto />
      <SiteFooter />
    </main>
  );
}
