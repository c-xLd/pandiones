import type { CarrierAdapter, CarrierEvent, ShipmentRequest } from '../carrier';
import type { PttConfig } from './config';
import { allBlocks, callSoap, childFields, firstText, PttError } from './soap';
import { mapPttStatus } from './status-map';

/**
 * PTT web service adapter: kabulEkle2 (upload parcel data for our barcode), barkodVeriSil (remove data of a
 * parcel not yet handed over), gonderiSorgu2 (movements). Field names follow public PTT integrations.
 * Not yet verified against PTT (no contract): the success code of kabulEkle2 (PTT_BASARI_KODU, default "1")
 * and the movement field names, which is why movements are read by several candidate names.
 */

const DATE_FIELDS = ['ITARIH', 'islemTarihi', 'ISLEM_TARIHI', 'tarih', 'TARIH'];
const TIME_FIELDS = ['ISAAT', 'islemSaati', 'SAAT', 'saat'];
const TEXT_FIELDS = ['IEVENT', 'ISLEM', 'islem', 'islemAdi', 'gonderi_durum_aciklama', 'durum', 'aciklama'];
const PLACE_FIELDS = ['IMERK', 'IMERKEZ', 'islemYeri', 'merkez', 'yer'];
const CODE_FIELDS = ['gonderi_durum_id', 'durumKodu', 'ISLEM_KODU', 'kod'];

const pick = (fields: Record<string, string>, names: string[]) => names.map((name) => fields[name]).find((value) => value && value.trim()) ?? null;

/** "12.10.2026" / "2026-10-12" + optional "14:05" → Date (Türkiye time), or null. */
export function parsePttDate(date: string | null, time: string | null): Date | null {
  if (!date) return null;
  const clock = (time ?? '').match(/(\d{1,2})[:.](\d{2})/);
  const hh = clock ? clock[1].padStart(2, '0') : '00';
  const mm = clock ? clock[2] : '00';
  const tr = date.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})(?:\s+(\d{1,2})[:.](\d{2}))?/);
  if (tr) {
    const value = new Date(`${tr[3]}-${tr[2].padStart(2, '0')}-${tr[1].padStart(2, '0')}T${tr[4] ? tr[4].padStart(2, '0') : hh}:${tr[5] ?? mm}:00+03:00`);
    return Number.isNaN(value.getTime()) ? null : value;
  }
  const iso = new Date(/[zZ]|[+-]\d{2}:?\d{2}$/.test(date) ? date : `${date.slice(0, 10)}T${hh}:${mm}:00+03:00`);
  return Number.isNaN(iso.getTime()) ? null : iso;
}

/** Movements in a gonderiSorgu2 answer, oldest first. Blocks without a date and a text are skipped. */
export function parseMovements(xml: string): CarrierEvent[] {
  const blocks = ['dongu', 'hareket', 'HAREKET', 'gonderiHareket'].flatMap((name) => allBlocks(xml, name));
  const events: CarrierEvent[] = [];
  for (const block of blocks) {
    const fields = childFields(block);
    const description = pick(fields, TEXT_FIELDS);
    const at = parsePttDate(pick(fields, DATE_FIELDS), pick(fields, TIME_FIELDS));
    if (!description || !at) continue;
    events.push({ at, code: pick(fields, CODE_FIELDS), description, location: pick(fields, PLACE_FIELDS), status: mapPttStatus(description) });
  }
  return events.sort((a, b) => a.at.getTime() - b.at.getTime());
}

const digits = (value: string) => value.replace(/\D/g, '');

export function createPttApiAdapter(config: PttConfig, successCode = process.env.PTT_BASARI_KODU?.trim() || '1'): CarrierAdapter {
  return {
    name: 'PTT',
    mode: 'API',

    async registerShipment(request: ShipmentRequest) {
      const xml = await callSoap(config.acceptUrl, 'kabulEkle2', {
        input: {
          dongu: [
            {
              aAdres: `${request.recipient.address} ${request.recipient.district}/${request.recipient.city}`,
              agirlik: request.weightKg ? Math.max(1, Math.round(request.weightKg * 1000)) : null,
              aliciAdi: request.recipient.name,
              aliciIlAdi: request.recipient.city,
              aliciIlceAdi: request.recipient.district,
              aliciSms: digits(request.recipient.phone),
              aliciEmail: request.recipient.email,
              barkodNo: request.barcode,
              desi: request.desi,
              musteriReferansNo: request.reference,
            },
          ],
          dosyaAdi: request.reference,
          gonderiTip: 'NORMAL',
          gonderiTur: 'KARGO',
          kullanici: config.user,
          musteriId: config.customerId,
          sifre: config.password,
        },
      });
      const code = firstText(xml, 'hataKodu');
      if (code !== successCode) {
        throw new PttError(`PTT gönderi kaydını kabul etmedi: ${firstText(xml, 'aciklama') || `kod ${code ?? 'yok'}`}`, 'REJECTED');
      }
    },

    async cancelShipment(shipment) {
      const xml = await callSoap(config.acceptUrl, 'barkodVeriSil', {
        inpDelete: { barcode: shipment.barcode, dosyaAdi: shipment.reference, musteriId: config.customerId, sifre: config.password },
      });
      const code = firstText(xml, 'hataKodu');
      if (code !== null && code !== successCode) {
        throw new PttError(`PTT kaydı silinemedi: ${firstText(xml, 'aciklama') || `kod ${code}`}`, 'REJECTED');
      }
    },

    async track(shipment) {
      const xml = await callSoap(config.trackUrl, 'gonderiSorgu2', {
        input: { barkod: shipment.barcode, kullanici: config.customerId, sifre: config.password },
      });
      return parseMovements(xml);
    },
  };
}
