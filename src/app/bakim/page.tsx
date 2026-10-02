import type { Metadata } from 'next';
import { readStoreSettings } from '@/lib/settings/server';
import '@/styles/pages/maintenance.css';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Bakımdayız',
  robots: { index: false, follow: false },
};

const DEFAULT_MESSAGE = 'Mağazamızı kısa bir süreliğine düzenliyoruz. Çok yakında yeniden buradayız.';

/** Shown by src/middleware.ts (HTTP 503) while maintenance mode is on; redirects home otherwise.
 *  Read straight from the database so turning the switch off takes effect immediately. */
export default async function MaintenancePage() {
  const settings = await readStoreSettings().catch(() => null);
  const message = settings?.maintenanceMessage || DEFAULT_MESSAGE;
  const email = settings?.contactEmail;

  return (
    <main id="main" className="maintenance-page">
      <div className="maintenance-page__inner">
        <p className="maintenance-page__brand" aria-hidden="true">PANDIONES</p>
        <h1>Bakımdayız.</h1>
        <p className="maintenance-page__message">{message}</p>
        {email ? (
          <p className="maintenance-page__contact">
            Siparişinizle ilgili bir sorunuz varsa: <a href={`mailto:${email}`}>{email}</a>
          </p>
        ) : null}
      </div>
    </main>
  );
}
