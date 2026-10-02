import Link from 'next/link';
import type { StoreSettings } from '@/lib/settings/shared';

/** One-line announcement above the header, set in Yönetim → Ayarlar. Not rendered when off or empty. */
export default function AnnouncementBar({ settings }: { settings: StoreSettings }) {
  if (!settings.announcementEnabled || !settings.announcementText) return null;
  const text = settings.announcementText;
  const href = settings.announcementHref;
  const external = href ? /^https:\/\//.test(href) : false;

  return (
    <div className="announcement-bar" role="region" aria-label="Duyuru">
      {href ? (
        external ? (
          <a href={href} target="_blank" rel="noopener noreferrer">
            {text} <span aria-hidden="true">↗</span>
            <span className="visually-hidden"> (yeni sekmede açılır)</span>
          </a>
        ) : (
          <Link href={href}>
            {text} <span aria-hidden="true">↗</span>
          </Link>
        )
      ) : (
        <p>{text}</p>
      )}
    </div>
  );
}
