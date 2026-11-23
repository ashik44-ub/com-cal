import { NextResponse, type NextRequest } from 'next/server';
import { dbErrorBody, getStore } from '@/lib/db';
import { isValidDateString } from '@/lib/validate';
import { resolveMutationScope } from '@/lib/scope';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  if (typeof body !== 'object' || body === null) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
  const data = body as Record<string, unknown>;
  if (!isValidDateString(data.date)) {
    return NextResponse.json({ error: 'date must be a valid date (yyyy-MM-dd)' }, { status: 400 });
  }
  if (typeof data.amount !== 'number' || !Number.isFinite(data.amount) || data.amount <= 0) {
    return NextResponse.json({ error: 'amount must be greater than 0' }, { status: 400 });
  }
  if (
    data.type !== undefined &&
    data.type !== 'collection' &&
    data.type !== 'tds-vds'
  ) {
    return NextResponse.json({ error: "type must be 'collection' or 'tds-vds'" }, { status: 400 });
  }

  try {
    const resolved = await resolveMutationScope(request);
    if (!resolved) {
      return NextResponse.json({ error: 'Please log in first' }, { status: 401 });
    }
    const store = await getStore();
    const existing = await store.getBill(id, resolved.scope);
    if (!existing) return NextResponse.json({ error: 'Bill not found' }, { status: 404 });
    const bill = await store.addPosting(
      id,
      {
        date: data.date as string,
        amount: data.amount as number,
        type: (data.type as 'collection' | 'tds-vds' | undefined) ?? 'collection',
      },
      resolved.scope,
    );
    if (!bill) return NextResponse.json({ error: 'Bill not found' }, { status: 404 });
    return NextResponse.json({ bill }, { status: 201 });
  } catch (err) {
    return NextResponse.json(dbErrorBody(err), { status: 503 });
  }
}
