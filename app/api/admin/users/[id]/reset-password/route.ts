import { NextResponse, type NextRequest } from 'next/server';
import mongoose from 'mongoose';
import { dbErrorBody } from '@/lib/db';
import { UserModel } from '@/models/User';
import { hashPassword } from '@/lib/users';
import { requireAdmin } from '@/lib/admin';

export const dynamic = 'force-dynamic';

/**
 * Admin password reset: the admin types a new password for the user. It is
 * saved hashed; the new password is returned so the admin can show it to
 * the user once (it is not stored anywhere in plain text).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const data = body as Record<string, unknown>;
  const newPassword = typeof data.newPassword === 'string' ? data.newPassword : '';
  if (newPassword.length < 6) {
    return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
  }
  try {
    const auth = await requireAdmin(request);
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    const { salt, hash } = await hashPassword(newPassword);
    const doc = await UserModel.findByIdAndUpdate(
      id,
      { $set: { passwordHash: hash, passwordSalt: salt } },
      { new: true },
    ).lean();
    if (!doc) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    return NextResponse.json({ ok: true, password: newPassword });
  } catch (err) {
    return NextResponse.json(dbErrorBody(err), { status: 503 });
  }
}
