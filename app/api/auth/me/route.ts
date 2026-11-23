import { NextResponse, type NextRequest } from 'next/server';
import { dbErrorBody } from '@/lib/db';
import { getRequestSession } from '@/lib/users';

export const dynamic = 'force-dynamic';

/** The logged-in user (fresh role and target from the database). */
export async function GET(request: NextRequest) {
  try {
    const session = await getRequestSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Please log in first' }, { status: 401 });
    }
    return NextResponse.json({
      id: session.id,
      name: session.name,
      email: session.email,
      role: session.role,
      monthlyTarget: session.monthlyTarget,
      isEnvAdmin: session.isEnvAdmin,
    });
  } catch (err) {
    return NextResponse.json(dbErrorBody(err), { status: 503 });
  }
}
