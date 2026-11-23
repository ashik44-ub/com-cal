/**
 * Per-user scoping for the data APIs (Node runtime only).
 *
 * A regular user sees only their own bills. An admin sees their own bills
 * by default and can ask for one user (?userId=<id>) or every user
 * (?userId=all) on the dashboard and bills pages.
 */
import type { NextRequest } from 'next/server';
import { connectDb, type BillScope } from '@/lib/db';
import { UserModel } from '@/models/User';
import {
  DEFAULT_MONTHLY_TARGET,
  getRequestSession,
  getUserById,
  type SessionUser,
} from '@/lib/users';

/** Resolve the session + bill scope from the request. Null = no usable
 *  session (caller answers 401). */
export async function resolveBillScope(
  request: NextRequest,
): Promise<{ session: SessionUser; scope: BillScope } | null> {
  const session = await getRequestSession(request);
  if (!session) return null;
  if (session.role !== 'admin') {
    return { session, scope: { userIds: [session.id] } };
  }
  const requested = request.nextUrl.searchParams.get('userId');
  if (requested === 'all') return { session, scope: { userIds: null } };
  if (requested && requested !== 'me' && requested !== session.id) {
    return { session, scope: { userIds: [requested] } };
  }
  return { session, scope: { userIds: [session.id] } };
}

/** Scope for mutations (edit/delete/postings): an admin may act on any
 *  bill, a regular user only on their own. */
export async function resolveMutationScope(
  request: NextRequest,
): Promise<{ session: SessionUser; scope: BillScope } | null> {
  const session = await getRequestSession(request);
  if (!session) return null;
  if (session.role === 'admin') {
    return { session, scope: { userIds: null } };
  }
  return { session, scope: { userIds: [session.id] } };
}

/** Monthly sales target for a scope: one user's target, or the sum of
 *  every user's target (DB users + the env admin) for "All users". */
export async function targetForScope(scope: BillScope): Promise<number> {
  if (scope.userIds === null) {
    await connectDb();
    const users = await UserModel.find({}).lean();
    const sum = users.reduce((total, u) => total + (u.monthlyTarget || 0), 0);
    return sum + DEFAULT_MONTHLY_TARGET; // the env admin
  }
  if (scope.userIds.length === 1) {
    const id = scope.userIds[0];
    if (id === 'admin') return DEFAULT_MONTHLY_TARGET;
    const user = await getUserById(id);
    return user ? user.monthlyTarget : DEFAULT_MONTHLY_TARGET;
  }
  return DEFAULT_MONTHLY_TARGET;
}
