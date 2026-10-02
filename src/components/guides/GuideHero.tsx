import React from 'react';

type GuideHeroProps = {
  eyebrow: string;
  title: React.ReactNode;
  lead: React.ReactNode;
  /** Jump links or a short fact list shown to the right of the title on wide screens. */
  aside?: React.ReactNode;
};

/** Shared header for the guide and service pages: serif title, lead, ink rule. */
export default function GuideHero({ eyebrow, title, lead, aside }: GuideHeroProps) {
  return (
    <header className="guide-hero">
      <div className="guide-hero__main">
        <p className="guide-eyebrow">{eyebrow}</p>
        <h1 className="guide-title">{title}</h1>
        <p className="guide-lead">{lead}</p>
      </div>
      {aside ? <div className="guide-hero__aside">{aside}</div> : null}
    </header>
  );
}

/** "Bu sayfada" jump links for long guides. */
export function GuideJumpLinks({ links }: { links: Array<{ href: string; label: string }> }) {
  return (
    <nav className="guide-jump" aria-label="Bu sayfada">
      <p className="guide-jump__title">Bu sayfada</p>
      <ol>
        {links.map((link, index) => (
          <li key={link.href}>
            <a href={link.href}>
              <span className="guide-jump__num" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
              {link.label}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
