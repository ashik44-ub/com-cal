import { NextResponse, type NextRequest } from 'next/server';
import { connectDb, dbErrorBody, getStore } from '@/lib/db';
import { achievementPercent, computeMonthCommission } from '@/lib/commission';
import { listEntries } from '@/lib/collections';
import { isValidMonth } from '@/lib/validate';
import { UserModel } from '@/models/User';
import { requireAdmin } from '@/lib/admin';
import { getEnvAdminArea } from '@/lib/settings';
import { getCredentials } from '@/lib/auth';
import { DEFAULT_MONTHLY_TARGET } from '@/lib/users';
import type { Area, UserPublic } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const month = request.nextUrl.searchParams.get('month') ?? new Date().toISOString().slice(0, 7);
  if (!isValidMonth(month)) {
    return NextResponse.json({ error: 'Invalid month (expected YYYY-MM)' }, { status: 400 });
  }
  try {
    const auth = await requireAdmin(request);
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    await connectDb();
    const users = await UserModel.find({}).sort({ createdAt: 1 }).lean();
    const store = await getStore();
    const bills = await store.listBills({ userIds: null });
    const allEntries = await listEntries({ userIds: null });
    const statsFor = (
      userId: string,
      monthlyTarget: number,
    ): Pick<UserPublic, 'partsCollected' | 'achievementPercent' | 'commission'> => {
      const own = bills.filter((b) => b.userId === userId);
      const ownEntries = allEntries.filter((e) => e.userId === userId);
      const mc = computeMonthCommission(own, month, ownEntries);
      return {
        partsCollected: mc.partsCollected,
        achievementPercent: achievementPercent(mc.partsCollected, monthlyTarget),
        commission: mc.earned,
      };
    };
    const result: UserPublic[] = users.map((u) => ({
      id: u._id.toString(),
      name: u.name,
      email: u.email,
      role: u.role,
      monthlyTarget: u.monthlyTarget,
      disabled: u.disabled,
      area: (u.area ?? null) as Area | null,
      createdAt: u.createdAt,
      ...statsFor(u._id.toString(), u.monthlyTarget),
    }));
    // The env admin has no User row, but they are listed first so the admin
    // can manage their own area too (v10) — their bills inherit it.
    result.unshift({
      id: 'admin',
      name: getCredentials().username,
      email: '',
      role: 'admin',
      monthlyTarget: DEFAULT_MONTHLY_TARGET,
      disabled: false,
      area: await getEnvAdminArea(),
      createdAt: '',
      ...statsFor('admin', DEFAULT_MONTHLY_TARGET),
    });
    return NextResponse.json({ users: result });
  } catch (err) {
    return NextResponse.json(dbErrorBody(err), { status: 503 });
  }
}
