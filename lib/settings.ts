/**
 * App settings (Node runtime only). The env admin has no User document, so
 * the area the admin picks for their own account (v10) is stored as a
 * setting instead of on a user row.
 */
import type { Area } from '@/lib/types';
import { connectDb } from '@/lib/db';
import { SettingModel } from '@/models/Setting';

export const ENV_ADMIN_AREA_KEY = 'envAdminArea';

/** The env admin's area, or null when it was never set. */
export async function getEnvAdminArea(): Promise<Area | null> {
  await connectDb();
  const doc = await SettingModel.findOne({ key: ENV_ADMIN_AREA_KEY }).lean();
  if (!doc || doc.value === null) return null;
  return doc.value === 'industrial' ? 'industrial' : 'residential';
}

/** Store the env admin's area (null clears it). */
export async function setEnvAdminArea(area: Area | null): Promise<void> {
  await connectDb();
  await SettingModel.updateOne(
    { key: ENV_ADMIN_AREA_KEY },
    { $set: { value: area } },
    { upsert: true },
  );
}
