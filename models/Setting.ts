import mongoose, { Schema, type Model } from 'mongoose';

/**
 * Tiny key/value settings collection. Used for values that belong to no
 * user document — currently only the env admin's area (v10): the env admin
 * has no User row, so their area lives here under the key 'envAdminArea'
 * ('residential' | 'industrial' | null).
 */
export interface SettingAttrs {
  key: string; // unique
  value: string | null;
}

const settingSchema = new Schema<SettingAttrs>(
  {
    key: { type: String, required: true, unique: true },
    value: { type: String, default: null },
  },
  { versionKey: false },
);

export const SettingModel: Model<SettingAttrs> =
  (mongoose.models.Setting as Model<SettingAttrs> | undefined) ??
  mongoose.model<SettingAttrs>('Setting', settingSchema);
