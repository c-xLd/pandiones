'use client';

import { useCallback, useEffect, useState } from 'react';

export type Address = {
  id: string;
  title: string;
  recipient: string;
  phone: string;
  address: string;
  district: string;
  city: string;
  postalCode?: string | null;
  isDefault: boolean;
};

export type AddressInput = Omit<Address, 'id'> & { id?: string };

type ListState = { status: 'loading' | 'ready' | 'error'; addresses: Address[] };
type Result = { ok: true } | { ok: false; error: string };

const NETWORK_ERROR = 'Bağlantı kurulamadı. İnternet bağlantınızı kontrol edip tekrar deneyin.';

async function send(url: string, init: RequestInit, fallback: string): Promise<Result> {
  try {
    const res = await fetch(url, init);
    if (res.ok) return { ok: true };
    const data = await res.json().catch(() => ({}));
    return { ok: false, error: data.error || fallback };
  } catch {
    return { ok: false, error: NETWORK_ERROR };
  }
}

/** Saved addresses from /api/auth/addresses with explicit load, error and mutation results. */
export function useAddresses(enabled: boolean) {
  const [state, setState] = useState<ListState>({ status: 'loading', addresses: [] });

  const load = useCallback(async () => {
    setState((prev) => ({ ...prev, status: 'loading' }));
    try {
      const res = await fetch('/api/auth/addresses');
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      setState({ status: 'ready', addresses: data.addresses ?? [] });
    } catch {
      setState((prev) => ({ ...prev, status: 'error' }));
    }
  }, []);

  useEffect(() => {
    if (enabled) load();
  }, [enabled, load]);

  const save = useCallback(
    async (input: AddressInput) => {
      const result = await send(
        '/api/auth/addresses',
        { method: input.id ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) },
        'Adres kaydedilemedi.',
      );
      if (result.ok) await load();
      return result;
    },
    [load],
  );

  const setDefault = useCallback(
    async (id: string) => {
      const result = await send(
        '/api/auth/addresses',
        { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, isDefault: true }) },
        'Varsayılan adres güncellenemedi.',
      );
      if (result.ok) await load();
      return result;
    },
    [load],
  );

  const remove = useCallback(
    async (id: string) => {
      const result = await send(`/api/auth/addresses?id=${encodeURIComponent(id)}`, { method: 'DELETE' }, 'Adres silinemedi.');
      if (result.ok) await load();
      return result;
    },
    [load],
  );

  return { ...state, reload: load, save, setDefault, remove };
}
