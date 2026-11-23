import { NextResponse } from 'next/server';
import { checkDbConnection } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * MongoDB diagnostics (login-protected like every other /api/* route).
 * Distinguishes "MONGODB_URI is not set" from "MONGODB_URI is set but the
 * connection fails". The error is sanitised in lib/db.ts and never contains
 * the connection string, username or password.
 */
export async function GET() {
  const status = await checkDbConnection();
  return NextResponse.json({
    ...status,
    connected: status.configured && !status.error,
    message: !status.configured
      ? 'MONGODB_URI is not set. Create .env.local in the project root from .env.local.example, paste your Atlas connection string, then restart the server.'
      : status.error ?? 'Connected to MongoDB.',
  });
}
