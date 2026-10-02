'use client';

import React, { useEffect, useRef } from 'react';

/** Full-width campaign video under the product stories, with a campaign caption over it
 *  (same scrim and type as the other campaigns). Muted and looping, no on-screen controls:
 *  it plays only while it is on screen, and never starts on its own under reduced motion
 *  (the first frame stays). The page renders this only when the file exists (src/app/page.tsx). */
export default function HomeVideo({ src, poster, label, children }: {
  src: string;
  poster?: string;
  label: string;
  /** The caption (eyebrow, heading, link) shown over the video. */
  children: React.ReactNode;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) video.play().catch(() => {});
        else video.pause();
      },
      { threshold: 0.35 },
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  return (
    <section className="campaign home-video" aria-label={label}>
      <video
        ref={videoRef}
        className="home-video__media"
        src={src}
        poster={poster}
        muted
        loop
        playsInline
        preload="metadata"
        aria-hidden="true"
      />
      <div className="campaign-caption">{children}</div>
    </section>
  );
}
