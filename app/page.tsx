'use client';

import { useState } from 'react';
import SiteHeader from '@/components/site-header';
import SiteFooter from '@/components/site-footer';
import EditorialDropReel from '@/components/editorial-drop-reel';

import HeroSection from '@/components/home/hero-section';
import ComfortSwitchSection from '@/components/home/comfort-switch-section';
import MoodSection from '@/components/home/mood-section';
import PortalSection from '@/components/home/portal-section';
import WorldsSection from '@/components/home/worlds-section';
import ManifestoSection from '@/components/home/manifesto-section';

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
      <HeroSection />
      <ComfortSwitchSection />
      <MoodSection mood={mood} chooseMood={chooseMood} />
      <EditorialDropReel />
      <PortalSection />
      <WorldsSection />
      <ManifestoSection />
      <SiteFooter />
    </main>
  );
}
