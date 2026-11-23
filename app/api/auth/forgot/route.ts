import { NextResponse, type NextRequest } from 'next/server';
import { dbErrorBody } from '@/lib/db';
import { isValidEmail, requestPasswordReset } from '@/lib/users';

export const dynamic = 'force-dynamic';

/**
 * Forgot password (no mail server): when the email belongs to a database
 * user, the reset link is returned in the response and shown on the page.
 * For an unknown email the same generic reply is returned with no link.
 */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
  const data = body as Record<string, unknown>;
  const email = typeof data.email === 'string' ? data.email.trim() : '';
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: 'Enter a valid email address' }, { status: 400 });
  }
  try {
    const resetUrl = await requestPasswordReset(email);
    if (!resetUrl) return NextResponse.json({ ok: true });
    return NextResponse.json({ ok: true, resetUrl });
  } catch (err) {
    return NextResponse.json(dbErrorBody(err), { status: 503 });
  }
}
