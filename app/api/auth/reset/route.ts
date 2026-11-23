import { NextResponse, type NextRequest } from 'next/server';
import { dbErrorBody } from '@/lib/db';
import { resetPasswordWithToken } from '@/lib/users';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
  const data = body as Record<string, unknown>;
  const token = typeof data.token === 'string' ? data.token.trim() : '';
  const newPassword = typeof data.newPassword === 'string' ? data.newPassword : '';
  const confirm = typeof data.confirmPassword === 'string' ? data.confirmPassword : '';

  if (!token) return NextResponse.json({ error: 'Missing reset token' }, { status: 400 });
  if (newPassword.length < 6) {
    return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
  }
  if (newPassword !== confirm) {
    return NextResponse.json({ error: 'Passwords do not match' }, { status: 400 });
  }

  try {
    const result = await resetPasswordWithToken(token, newPassword);
    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(dbErrorBody(err), { status: 503 });
  }
}
