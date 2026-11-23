import { NextResponse, type NextRequest } from 'next/server';
import { dbErrorBody } from '@/lib/db';
import { createEntry, listEntries } from '@/lib/collections';
import { isValidDateString, isValidMonth } from '@/lib/validate';
import { resolveBillScope } from '@/lib/scope';
import type { StandaloneKind } from '@/models/CollectionEntry';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const month = request.nextUrl.searchParams.get('month');
  if (month !== null && !isValidMonth(month)) {
    return NextResponse.json({ error: 'Invalid month (expected YYYY-MM)' }, { status: 400 });
  }
  try {
    const resolved = await resolveBillScope(request);
    if (!resolved) {
      return NextResponse.json({ error: 'Please log in first' }, { status: 401 });
    }
    const entries = await listEntries(resolved.scope, month ?? undefined);
    return NextResponse.json({ entries });
  } catch (err) {
    return NextResponse.json(dbErrorBody(err), { status: 503 });
  }
}

export async function POST(request: NextRequest) {
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

  if (data.kind !== 'service' && data.kind !== 'tds-vds' && data.kind !== 'csa') {
    return NextResponse.json({ error: "kind must be 'service', 'tds-vds' or 'csa'" }, { status: 400 });
  }
  const kind = data.kind as StandaloneKind;
  if (kind === 'csa') {
    if (data.contractType !== 'new' && data.contractType !== 'renewal') {
      return NextResponse.json(
        { error: "contractType must be 'new' or 'renewal' for CSA" },
        { status: 400 },
      );
    }
  } else if (
    typeof data.amount !== 'number' ||
    !Number.isFinite(data.amount) ||
    data.amount <= 0
  ) {
    return NextResponse.json({ error: 'amount must be greater than 0' }, { status: 400 });
  }
  if (!isValidDateString(data.date)) {
    return NextResponse.json({ error: 'date must be a valid date (yyyy-MM-dd)' }, { status: 400 });
  }
  if (data.note !== undefined && typeof data.note !== 'string') {
    return NextResponse.json({ error: 'note must be a string' }, { status: 400 });
  }
  if (data.customerName !== undefined && typeof data.customerName !== 'string') {
    return NextResponse.json({ error: 'customerName must be a string' }, { status: 400 });
  }
  if (data.invoiceNo !== undefined && typeof data.invoiceNo !== 'string') {
    return NextResponse.json({ error: 'invoiceNo must be a string' }, { status: 400 });
  }
  const note = typeof data.note === 'string' ? data.note.trim().slice(0, 200) : '';
  const customerName =
    typeof data.customerName === 'string' ? data.customerName.trim().slice(0, 200) : '';
  const invoiceNo =
    typeof data.invoiceNo === 'string' ? data.invoiceNo.trim().slice(0, 100) : '';

  try {
    const resolved = await resolveBillScope(request);
    if (!resolved) {
      return NextResponse.json({ error: 'Please log in first' }, { status: 401 });
    }
    const entry = await createEntry({
      userId: resolved.session.id,
      kind,
      amount: kind === 'csa' ? 0 : (data.amount as number),
      date: data.date as string,
      note,
      customerName,
      invoiceNo,
      contractType:
        kind === 'csa' ? (data.contractType as 'new' | 'renewal') : null,
    });
    return NextResponse.json({ entry }, { status: 201 });
  } catch (err) {
    return NextResponse.json(dbErrorBody(err), { status: 503 });
  }
}
