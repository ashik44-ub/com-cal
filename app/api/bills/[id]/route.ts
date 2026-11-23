import { NextResponse, type NextRequest } from 'next/server';
import { dbErrorBody, getStore, type BillInput } from '@/lib/db';
import { isValidDateString } from '@/lib/validate';
import { resolveBillScope, resolveMutationScope } from '@/lib/scope';
import type { Category } from '@/lib/types';

export const dynamic = 'force-dynamic';

const CATEGORIES: Category[] = ['parts-sale', 'service', 'tds-vds', 'contract'];

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const resolved = await resolveBillScope(request);
    if (!resolved) {
      return NextResponse.json({ error: 'Please log in first' }, { status: 401 });
    }
    const store = await getStore();
    const bill = await store.getBill(id, resolved.scope);
    if (!bill) return NextResponse.json({ error: 'Bill not found' }, { status: 404 });
    return NextResponse.json({ bill });
  } catch (err) {
    return NextResponse.json(dbErrorBody(err), { status: 503 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
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
  const patch: Partial<BillInput> = {};

  if (data.customer !== undefined) {
    if (typeof data.customer !== 'string' || data.customer.trim() === '') {
      return NextResponse.json({ error: 'customer must be a non-empty string' }, { status: 400 });
    }
    patch.customer = data.customer.trim();
  }
  if (data.category !== undefined) {
    if (typeof data.category !== 'string' || !CATEGORIES.includes(data.category as Category)) {
      return NextResponse.json({ error: 'category is invalid' }, { status: 400 });
    }
    patch.category = data.category as Category;
  }
  if (data.billAmount !== undefined) {
    if (typeof data.billAmount !== 'number' || !Number.isFinite(data.billAmount) || data.billAmount <= 0) {
      return NextResponse.json({ error: 'billAmount must be greater than 0' }, { status: 400 });
    }
    patch.billAmount = data.billAmount as number;
  }
  if (data.invoiceDate !== undefined) {
    if (!isValidDateString(data.invoiceDate)) {
      return NextResponse.json({ error: 'invoiceDate must be a valid date (yyyy-MM-dd)' }, { status: 400 });
    }
    patch.invoiceDate = data.invoiceDate as string;
  }
  if (data.invoiceNo !== undefined) {
    if (typeof data.invoiceNo !== 'string') {
      return NextResponse.json({ error: 'invoiceNo must be a string' }, { status: 400 });
    }
    patch.invoiceNo = data.invoiceNo.trim().slice(0, 100);
  }
  // v10: a bill's area comes from its owner's account (changed only by the
  // admin from the Admin page), never from the bill form — a client-sent
  // area is ignored here.
  if (data.contractType !== undefined) {
    if (data.contractType !== null && data.contractType !== 'new' && data.contractType !== 'renewal') {
      return NextResponse.json({ error: 'contractType is invalid' }, { status: 400 });
    }
    patch.contractType = data.contractType as BillInput['contractType'];
  }
  for (const key of ['partialPayment', 'profitBelowBudget', 'achievementBelow50', 'monthly100'] as const) {
    if (data[key] !== undefined) {
      if (typeof data[key] !== 'boolean') {
        return NextResponse.json({ error: `${key} must be a boolean` }, { status: 400 });
      }
      patch[key] = data[key] as boolean;
    }
  }

  try {
    const resolved = await resolveMutationScope(request);
    if (!resolved) {
      return NextResponse.json({ error: 'Please log in first' }, { status: 401 });
    }
    const store = await getStore();
    const { id } = await params;
    const bill = await store.updateBill(id, patch, resolved.scope);
    if (!bill) return NextResponse.json({ error: 'Bill not found' }, { status: 404 });
    return NextResponse.json({ bill });
  } catch (err) {
    return NextResponse.json(dbErrorBody(err), { status: 503 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const resolved = await resolveMutationScope(request);
    if (!resolved) {
      return NextResponse.json({ error: 'Please log in first' }, { status: 401 });
    }
    const store = await getStore();
    const deleted = await store.deleteBill(id, resolved.scope);
    if (!deleted) return NextResponse.json({ error: 'Bill not found' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(dbErrorBody(err), { status: 503 });
  }
}
