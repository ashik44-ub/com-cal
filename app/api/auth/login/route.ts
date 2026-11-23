import { NextResponse, type NextRequest } from 'next/server';
import {
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
  createSessionTokenFor,
  verifyCredentials,
} from '@/lib/auth';
import { dbErrorBody } from '@/lib/db';
import { verifyDbUserPassword } from '@/lib/users';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
  const data = body as Record<string, unknown>;
  const login =
    typeof data.username === 'string' && data.username.trim()
      ? data.username.trim()
      : typeof data.email === 'string'
        ? data.email.trim()
        : '';
  const password = typeof data.password === 'string' ? data.password : '';

  // Env admin first (no database needed).
  if (login && verifyCredentials(login, password)) {
    const response = NextResponse.json({ ok: true, role: 'admin', name: login });
    response.cookies.set(
      SESSION_COOKIE_NAME,
      await createSessionTokenFor({ userId: 'admin', role: 'admin' }),
      { httpOnly: true, sameSite: 'lax', path: '/', maxAge: SESSION_MAX_AGE_SECONDS },
    );
    return response;
  }

  // Then database users (email + password).
  try {
    const user = await verifyDbUserPassword(login, password);
    if (!user) {
      return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
    }
    if (user.disabled) {
      return NextResponse.json(
        { error: 'Your account is disabled. Please contact the admin.' },
        { status: 403 },
      );
    }
    const response = NextResponse.json({ ok: true, role: user.role, name: user.name });
    response.cookies.set(
      SESSION_COOKIE_NAME,
      await createSessionTokenFor({ userId: user.id, role: user.role }),
      { httpOnly: true, sameSite: 'lax', path: '/', maxAge: SESSION_MAX_AGE_SECONDS },
    );
    return response;
  } catch (err) {
    return NextResponse.json(dbErrorBody(err), { status: 503 });
  }
}
