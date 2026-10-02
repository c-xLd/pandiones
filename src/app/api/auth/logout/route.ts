import { NextResponse } from 'next/server';
import { MFA_COOKIE, clearedCookie, getCurrentUser, revokeSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/** Ends the session on the server (a copied cookie stops working too) and clears the cookies. */
export async function POST(request: Request) {
  const session = await getCurrentUser(request);
  if (session) await revokeSession(session.sessionId);
  const response = NextResponse.json({ success: true });
  response.cookies.set(clearedCookie());
  response.cookies.set(clearedCookie(MFA_COOKIE));
  return response;
}
