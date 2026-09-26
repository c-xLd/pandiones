import React, { useId } from 'react';

type Tone = 'neutral' | 'success' | 'warning' | 'danger';

type StatusPanelProps = {
  tone?: Tone;
  icon?: React.ReactNode;
  eyebrow?: string;
  title: string;
  headingLevel?: 1 | 2;
  children?: React.ReactNode;
  actions?: React.ReactNode;
};

/** Centred full-page state: unauthorized, pending, failed, empty. */
export default function StatusPanel({ tone = 'neutral', icon, eyebrow, title, headingLevel = 1, children, actions }: StatusPanelProps) {
  const titleId = useId();
  const Heading = headingLevel === 1 ? 'h1' : 'h2';
  const className = tone === 'neutral' ? 'status-panel' : `status-panel status-panel--${tone}`;
  return (
    <section className={className} aria-labelledby={titleId}>
      {icon ? <span className="status-panel__icon" aria-hidden="true">{icon}</span> : null}
      {eyebrow ? <p className="status-panel__eyebrow">{eyebrow}</p> : null}
      <Heading id={titleId} className="status-panel__title">{title}</Heading>
      {children ? <div className="status-panel__body">{children}</div> : null}
      {actions ? <div className="status-panel__actions">{actions}</div> : null}
    </section>
  );
}
