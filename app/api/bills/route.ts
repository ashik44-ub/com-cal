import { NextResponse, type NextRequest } from 'next/server';
import { dbErrorBody, getStore, type BillInput } from '@/lib/db';
import { isValidDateString, isValidMonth } from '@/lib/validate';
import { resolveBillScope } from '@/lib/scope';
import { getAccountArea } from '@/lib/users';
import type { Area, Category } from '@/lib/types';

export const dynamic = 'force-dynamic';

const CATEGORIES: Category[] = ['parts-sale', 'service', 'tds-vds', 'contract'];

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
    const store = await getStore();
    let bills = await store.listBills(resolved.scope);
    if (month) {
      bills = bills.filter(
        (b) =>
          b.invoiceDate.startsWith(month) || b.postings.some((p) => p.date.startsWith(month)),
      );
    }
    return NextResponse.json({ bills });
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

  if (typeof data.customer !== 'string' || data.customer.trim() === '') {
    return NextResponse.json({ error: 'customer is required' }, { status: 400 });
  }
  if (typeof data.billAmount !== 'number' || !Number.isFinite(data.billAmount) || data.billAmount <= 0) {
    return NextResponse.json({ error: 'billAmount must be greater than 0' }, { status: 400 });
  }
  if (!isValidDateString(data.invoiceDate)) {
    return NextResponse.json({ error: 'invoiceDate must be a valid date (yyyy-MM-dd)' }, { status: 400 });
  }
  if (data.invoiceNo !== undefined && typeof data.invoiceNo !== 'string') {
    return NextResponse.json({ error: 'invoiceNo must be a string' }, { status: 400 });
  }
  if (data.category !== undefined && (typeof data.category !== 'string' || !CATEGORIES.includes(data.category as Category))) {
    return NextResponse.json({ error: 'category is invalid' }, { status: 400 });
  }
  if (
    data.area !== undefined &&
    data.area !== null &&
    data.area !== 'residential' &&
    data.area !== 'industrial'
  ) {
    return NextResponse.json({ error: 'area is invalid' }, { status: 400 });
  }
  if (
    data.contractType !== undefined &&
    data.contractType !== null &&
    data.contractType !== 'new' &&
    data.contractType !== 'renewal'
  ) {
    return NextResponse.json({ error: 'contractType is invalid' }, { status: 400 });
  }
  for (const key of ['partialPayment', 'profitBelowBudget', 'achievementBelow50', 'monthly100']) {
    if (data[key] !== undefined && typeof data[key] !== 'boolean') {
      return NextResponse.json({ error: `${key} must be a boolean` }, { status: 400 });
    }
  }

  const input: BillInput = {
    customer: (data.customer as string).trim(),
    category: (data.category as Category | undefined) ?? 'parts-sale',
    billAmount: data.billAmount as number,
    invoiceDate: data.invoiceDate as string,
    invoiceNo:
      typeof data.invoiceNo === 'string' ? data.invoiceNo.trim().slice(0, 100) : '',
    area: (data.area as BillInput['area'] | undefined) ?? null,
    contractType: (data.contractType as BillInput['contractType'] | undefined) ?? null,
    partialPayment: (data.partialPayment as boolean | undefined) ?? false,
    profitBelowBudget: (data.profitBelowBudget as boolean | undefined) ?? false,
    achievementBelow50: (data.achievementBelow50 as boolean | undefined) ?? false,
    monthly100: (data.monthly100 as boolean | undefined) ?? false,
  };

  try {
    const resolved = await resolveBillScope(request);
    if (!resolved) {
      return NextResponse.json({ error: 'Please log in first' }, { status: 401 });
    }
    const store = await getStore();
    // A bill always belongs to the user creating it (an admin creating a
    // bill while viewing another user still creates it as their own).
    // v10: a bill inherits the area from the creator's account — any area
    // sent by the client is ignored. If the account has no area set (legacy
    // user, or the env admin before one is set), fall back to the area the
    // client sent, if any; otherwise the bill keeps area null (treated as
    // residential by the commission logic, exactly as before).
    const accountArea = await getAccountArea(resolved.session.id);
    const fallbackArea =
      data.area === 'residential' || data.area === 'industrial'
        ? (data.area as Area)
        : null;
    const bill = await store.createBill({
      ...input,
      area: accountArea ?? fallbackArea,
      userId: resolved.session.id,
    });
    return NextResponse.json({ bill }, { status: 201 });
  } catch (err) {
    return NextResponse.json(dbErrorBody(err), { status: 503 });
  }
}
