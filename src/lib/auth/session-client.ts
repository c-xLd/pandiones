export type SubmitResult =
  | { success: true; user: any }
  | { success: false; error: string };

export async function submitCredentials(
  fetchImpl: typeof fetch,
  url: string,
  body: Record<string, any>,
  fallbackErrorMessage: string,
): Promise<SubmitResult> {
  let res: Response;
  try {
    res = await fetchImpl(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    return { success: false, error: 'Bağlantı hatası oluştu.' };
  }

  const data = (await res.json().catch(() => ({}))) as any;

  if (!res.ok) {
    return {
      success: false,
      error: data?.error || fallbackErrorMessage,
    };
  }

  try {
    const meRes = await fetchImpl('/api/auth/me');
    if (!meRes.ok) {
      return { success: false, error: 'Oturum başlatılamadı.' };
    }
    const meData = (await meRes.json().catch(() => ({}))) as any;
    if (!meData?.user) {
      return { success: false, error: 'Oturum başlatılamadı.' };
    }
    return { success: true, user: meData.user };
  } catch {
    return { success: false, error: 'Bağlantı hatası oluştu.' };
  }
}
