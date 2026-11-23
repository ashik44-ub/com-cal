/**
 * Admin guard for the /api/admin/* routes (Node runtime only).
 * The role is read fresh from the database on every call, never from the
 * session token — so a role change or disable takes effect immediately.
 */
import type { NextRequest } from 'next/server';
import { getRequestSession, type SessionUser } from '@/lib/users';

export async function requireAdmin(
  request: NextRequest,
): Promise<{ session: SessionUser } | { error: string; status: number }> {
  const session = await getRequestSession(request);
  if (!session) return { error: 'Please log in first', status: 401 };
  if (session.role !== 'admin') return { error: 'Admin access required', status: 403 };
  return { session };
}
