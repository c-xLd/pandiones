import type { ShipmentStatus } from './statuses';
import type { Sender } from './sender';
import { pttConfig } from './ptt/config';
import { createPttApiAdapter } from './ptt/adapter';

/** What the carrier needs to know about a parcel. The barcode is the sender's (from the PTT range). */
export type ShipmentRequest = {
  barcode: string;
  reference: string;
  orderNumber: string;
  sender: Sender;
  recipient: { name: string; phone: string; email: string; address: string; district: string; city: string };
  desi: number;
  weightKg: number | null;
  pieces: number;
  /** Goods value in TL (declared value). */
  value: number;
};

/** One movement read from the carrier. `status` is null for an unknown code: it is kept as an event only. */
export type CarrierEvent = { at: Date; code: string | null; description: string; location: string | null; status: ShipmentStatus | null };

export type CarrierAdapter = {
  name: 'PTT';
  /** MANUAL: no web service; movements are typed in the panel. */
  mode: 'MANUAL' | 'API';
  /** Uploads the parcel data for its barcode. No-op by hand. */
  registerShipment(request: ShipmentRequest): Promise<void>;
  /** Removes uploaded data of a parcel that was not handed over. No-op by hand. */
  cancelShipment(shipment: { barcode: string; reference: string }): Promise<void>;
  /** null when there is nothing to ask (by hand, or tracking address not configured). */
  track(shipment: { barcode: string }): Promise<CarrierEvent[] | null>;
};

export const manualAdapter: CarrierAdapter = {
  name: 'PTT',
  mode: 'MANUAL',
  async registerShipment() {},
  async cancelShipment() {},
  async track() {
    return null;
  },
};

/** PTT through its web service when credentials are set, otherwise by hand. */
export function getCarrier(env: NodeJS.ProcessEnv = process.env): CarrierAdapter {
  const config = pttConfig(env);
  return config ? createPttApiAdapter(config) : manualAdapter;
}
