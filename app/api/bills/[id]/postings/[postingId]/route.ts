import { NextResponse, type NextRequest } from 'next/server';
import { dbErrorBody, getStore } from '@/lib/db';
import { resolveMutationScope } from '@/lib/scope';

export const dynamic = 'force-dynamic';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; postingId: string }> },
) {
  const { id, postingId } = await params;
  try {
    const resolved = await resolveMutationScope(request);
    if (!resolved) {
      return NextResponse.json({ error: 'Please log in first' }, { status: 401 });
    }
    const store = await getStore();
    const bill = await store.deletePosting(id, postingId, resolved.scope);
    if (!bill) return NextResponse.json({ error: 'Bill not found' }, { status: 404 });
    return NextResponse.json({ bill });
  } catch (err) {
    return NextResponse.json(dbErrorBody(err), { status: 503 });
  }
}
