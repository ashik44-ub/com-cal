import { NextResponse, type NextRequest } from 'next/server';
import { dbErrorBody } from '@/lib/db';
import { createDbUser, isValidEmail } from '@/lib/users';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
  const data = body as Record<string, unknown>;
  const name = typeof data.name === 'string' ? data.name.trim() : '';
  const email = typeof data.email === 'string' ? data.email.trim() : '';
  const password = typeof data.password === 'string' ? data.password : '';
  const confirm = typeof data.confirmPassword === 'string' ? data.confirmPassword : '';
  const area = typeof data.area === 'string' ? data.area : '';

  if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: 'Enter a valid email address' }, { status: 400 });
  }
  if (area !== 'residential' && area !== 'industrial') {
    return NextResponse.json(
      { error: 'Please select your area (Residential or Outside Residential)' },
      { status: 400 },
    );
  }
  if (password.length < 6) {
    return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
  }
  if (password !== confirm) {
    return NextResponse.json({ error: 'Passwords do not match' }, { status: 400 });
  }

  try {
    const result = await createDbUser({ name, email, password, area });
    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    return NextResponse.json(dbErrorBody(err), { status: 503 });
  }
}
