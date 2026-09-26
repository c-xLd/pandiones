/** Only same-site absolute paths; anything that a browser could read as another origin is refused. */
export function safeRedirectPath(raw: string | null | undefined): string | null {
  if (!raw) return null;
  if (!raw.startsWith('/')) return null;
  if (raw.startsWith('//') || raw.startsWith('/\\')) return null;
  // Browsers drop tabs/newlines and treat backslashes like slashes; refuse them anywhere.
  if (/[\s\\]/.test(raw) || /[\u0000-\u001f\u007f]/.test(raw)) return null;
  return raw;
}

export function defaultPathForRole(role: string | undefined): '/yonetim' | '/hesabim' {
  return role === 'ADMIN' ? '/yonetim' : '/hesabim';
}
