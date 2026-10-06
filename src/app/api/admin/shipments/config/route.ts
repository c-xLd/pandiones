import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { readStoreSettings } from '@/lib/settings/server';
import { senderFromSettings } from '@/lib/shipping/sender';
import { pttStatus } from '@/lib/shipping/ptt/config';
import { forbidden } from '@/lib/shipping/http';

export const dynamic = 'force-dynamic';

/** What the order screens need to offer shipments: PTT mode, the sender for labels, the default desi. */
export async function GET(request: Request) {
  const session = await getCurrentUser(request);
  if (!session || session.role !== 'ADMIN') return forbidden();
  try {
    const settings = await readStoreSettings();
    const sender = senderFromSettings(settings);
    return NextResponse.json({
      ptt: pttStatus(),
      sender: sender.complete ? { complete: true, ...sender.sender } : { complete: false, missing: sender.missing },
      defaultDesi: settings.defaultDesi,
      storeName: settings.storeName,
    });
  } catch (error) {
    console.error('Shipping config error:', error);
    return NextResponse.json({ error: 'Kargo ayarları okunamadı.' }, { status: 500 });
  }
}
