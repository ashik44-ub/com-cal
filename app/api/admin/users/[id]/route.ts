import { NextResponse, type NextRequest } from 'next/server';
import mongoose from 'mongoose';
import { dbErrorBody, getStore } from '@/lib/db';
import { UserModel } from '@/models/User';
import { BillModel } from '@/models/Bill';
import { requireAdmin } from '@/lib/admin';
import { getEnvAdminArea, setEnvAdminArea } from '@/lib/settings';
import { getCredentials } from '@/lib/auth';
import { DEFAULT_MONTHLY_TARGET } from '@/lib/users';
import type { Area } from '@/lib/types';

export const dynamic = 'force-dynamic';

function publicUser(doc: {
  _id: { toString(): string };
  name: string;
  email: string;
  role: 'admin' | 'user';
  monthlyTarget: number;
  disabled: boolean;
  area?: Area | null;
  createdAt: string;
}) {
  return {
    id: doc._id.toString(),
    name: doc.name,
    email: doc.email,
    role: doc.role,
    monthlyTarget: doc.monthlyTarget,
    disabled: doc.disabled,
    area: (doc.area ?? null) as Area | null,
    createdAt: doc.createdAt,
  };
}

/**
 * Change a user's area (v10): update the account AND all of that user's
 * existing bills, so the dashboard recomputes under the new area. Setting
 * area to null clears the account area only — the bills keep their stored
 * area (the legacy fallback).
 */
async function applyAreaChange(userId: string, area: Area | null): Promise<number> {
  if (area === null) return 0;
  const result = await BillModel.updateMany({ userId }, { $set: { area } });
  return result.modifiedCount ?? 0;
}

export async function PATCH(
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
  const patch: {
    monthlyTarget?: number;
    role?: 'admin' | 'user';
    disabled?: boolean;
    area?: Area | null;
  } = {};
  if (data.monthlyTarget !== undefined) {
    if (typeof data.monthlyTarget !== 'number' || !Number.isFinite(data.monthlyTarget) || data.monthlyTarget <= 0) {
      return NextResponse.json({ error: 'monthlyTarget must be greater than 0' }, { status: 400 });
    }
    patch.monthlyTarget = data.monthlyTarget;
  }
  if (data.role !== undefined) {
    if (data.role !== 'admin' && data.role !== 'user') {
      return NextResponse.json({ error: 'role must be admin or user' }, { status: 400 });
    }
    patch.role = data.role;
  }
  if (data.disabled !== undefined) {
    if (typeof data.disabled !== 'boolean') {
      return NextResponse.json({ error: 'disabled must be a boolean' }, { status: 400 });
    }
    patch.disabled = data.disabled;
  }
  if (data.area !== undefined) {
    if (data.area !== null && data.area !== 'residential' && data.area !== 'industrial') {
      return NextResponse.json({ error: 'area must be residential, industrial or null' }, { status: 400 });
    }
    patch.area = data.area as Area | null;
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
  }

  try {
    const auth = await requireAdmin(request);
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    // The env admin has no User row: only their area can be changed here
    // (stored as a setting), and it applies to their bills the same way.
    if (id === 'admin') {
      const keys = Object.keys(patch);
      if (keys.length !== 1 || patch.area === undefined) {
        return NextResponse.json(
          { error: 'Only the admin account area can be changed here' },
          { status: 400 },
        );
      }
      await setEnvAdminArea(patch.area ?? null);
      const billsUpdated = await applyAreaChange('admin', patch.area ?? null);
      return NextResponse.json({
        user: {
          id: 'admin',
          name: getCredentials().username,
          email: '',
          role: 'admin' as const,
          monthlyTarget: DEFAULT_MONTHLY_TARGET,
          disabled: false,
          area: await getEnvAdminArea(),
          createdAt: '',
        },
        billsUpdated,
      });
    }

    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    // An admin cannot change their own role or disable themselves.
    if (id === auth.session.id && (patch.role !== undefined || patch.disabled !== undefined)) {
      return NextResponse.json(
        { error: 'You cannot change your own role or disable your own account' },
        { status: 400 },
      );
    }
    const doc = await UserModel.findByIdAndUpdate(id, { $set: patch }, { new: true }).lean();
    if (!doc) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    let billsUpdated = 0;
    if (patch.area !== undefined) {
      billsUpdated = await applyAreaChange(id, patch.area);
    }
    return NextResponse.json({ user: publicUser(doc), billsUpdated });
  } catch (err) {
    return NextResponse.json(dbErrorBody(err), { status: 503 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (id === 'admin') {
    return NextResponse.json({ error: 'The admin account cannot be deleted' }, { status: 400 });
  }
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }
  try {
    const auth = await requireAdmin(request);
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    if (id === auth.session.id) {
      return NextResponse.json({ error: 'You cannot delete your own account' }, { status: 400 });
    }
    const doc = await UserModel.findById(id).lean();
    if (!doc) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    // Reassign the user's bills to the env admin so none are orphaned.
    const store = await getStore();
    const reassigned = await store.reassignBillsToAdmin(id);
    await UserModel.deleteOne({ _id: id });
    return NextResponse.json({ ok: true, billsReassigned: reassigned });
  } catch (err) {
    return NextResponse.json(dbErrorBody(err), { status: 503 });
  }
}
