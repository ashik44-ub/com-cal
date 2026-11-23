import { NextResponse, type NextRequest } from 'next/server';
import { dbErrorBody, getStore } from '@/lib/db';
import { computeSummary } from '@/lib/commission';
import { listEntries } from '@/lib/collections';
import { isValidMonth } from '@/lib/validate';
import { resolveBillScope, targetForScope } from '@/lib/scope';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const param = request.nextUrl.searchParams.get('month');
  const month = param ?? new Date().toISOString().slice(0, 7);
  if (!isValidMonth(month)) {
    return NextResponse.json({ error: 'Invalid month (expected YYYY-MM)' }, { status: 400 });
  }
  try {
    const resolved = await resolveBillScope(request);
    if (!resolved) {
      return NextResponse.json({ error: 'Please log in first' }, { status: 401 });
    }
    const store = await getStore();
    // Independent reads — run them in parallel (v8: the sequential
    // awaits made /api/summary wait for each query in turn).
    const [bills, entries, monthlyTarget] = await Promise.all([
      store.listBills(resolved.scope),
      listEntries(resolved.scope),
      targetForScope(resolved.scope),
    ]);
    const summary = computeSummary(bills, month, store.getStorage(), monthlyTarget, entries);
    // The store is always MongoDB (no local-memory fallback); a failed
    // connection throws above and is reported with a sanitised reason.
    const dbStatus = { configured: true, error: null as string | null };
    return NextResponse.json({ ...summary, dbStatus });
  } catch (err) {
    return NextResponse.json(dbErrorBody(err), { status: 503 });
  }
}
