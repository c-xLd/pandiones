import React from 'react';

type NoticeProps = {
  tone?: 'info' | 'success' | 'warning' | 'danger';
  title?: string;
  role?: 'status' | 'alert';
  className?: string;
  children: React.ReactNode;
};

/** Inline information box. Use role="alert" only for errors the user must act on. */
export default function Notice({ tone = 'info', title, role, className, children }: NoticeProps) {
  return (
    <div className={['notice', `notice--${tone}`, className].filter(Boolean).join(' ')} role={role}>
      {title ? <p className="notice__title">{title}</p> : null}
      {children}
    </div>
  );
}
