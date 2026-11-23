import { NextResponse, type NextRequest } from 'next/server';
import { dbErrorBody } from '@/lib/db';
import { deleteEntry } from '@/lib/collections';
import { resolveMutationScope } from '@/lib/scope';

export const dynamic = 'force-dynamic';

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
    const deleted = await deleteEntry(id, resolved.scope);
    if (!deleted) return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(dbErrorBody(err), { status: 503 });
  }
}
