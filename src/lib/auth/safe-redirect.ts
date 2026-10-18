/** Only same-site absolute paths; anything that a browser could read as another origin is refused. */
export function safeRedirectPath(raw: string | null | undefined): string | null {
  if (!raw) return null;
  if (!raw.startsWith('/')) return null;
  if (raw.startsWith('//') || raw.startsWith('/\\')) return null;
  // Browsers drop tabs/newlines and treat backslashes like slashes; refuse them anywhere.
  if (/[\s\\]/.test(raw) || /[\u0000-\u001f\u007f]/.test(raw)) return null;

  try {
    let decoded = raw;
    try {
      decoded = decodeURI(raw);
    } catch {
      return null;
    }
    if (decoded.includes('\\') || /[\u0000-\u001f\u007f]/.test(decoded)) return null;

    const parsed = new URL(decoded, 'http://localhost');
    if (parsed.hostname !== 'localhost') return null;
    if (parsed.pathname.startsWith('//')) return null;

    const resolved = parsed.pathname + parsed.search + parsed.hash;
    if (!resolved.startsWith('/') || resolved.startsWith('//')) return null;
    return resolved;
  } catch {
    return null;
  }
}

export function defaultPathForRole(role: string | undefined): '/yonetim' | '/hesabim' {
  return role === 'ADMIN' || role === 'STAFF' ? '/yonetim' : '/hesabim';
}
