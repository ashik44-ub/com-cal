import mongoose, { Schema, type Model } from 'mongoose';
import type { Area } from '@/lib/types';

export type UserRole = 'admin' | 'user';

export interface UserAttrs {
  name: string;
  email: string; // unique, lowercase
  passwordHash: string; // scrypt hex
  passwordSalt: string; // hex
  role: UserRole;
  monthlyTarget: number; // default 550000
  disabled: boolean;
  /**
   * The user's area, chosen at sign-up (v10). Bills inherit this area —
   * there is no per-bill area selection anymore. null = chosen before v10
   * (legacy account); those users' bills keep their own stored area until
   * an admin sets the account area.
   */
  area: Area | null;
  resetTokenHash: string | null; // SHA-256 hex of the single-use reset token
  resetTokenExpiresAt: Date | null;
  createdAt: string;
}

const userSchema = new Schema<UserAttrs>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    passwordHash: { type: String, required: true },
    passwordSalt: { type: String, required: true },
    role: { type: String, enum: ['admin', 'user'], default: 'user' },
    monthlyTarget: { type: Number, default: 550000 },
    disabled: { type: Boolean, default: false },
    area: { type: String, enum: ['residential', 'industrial'], default: null },
    resetTokenHash: { type: String, default: null },
    resetTokenExpiresAt: { type: Date, default: null },
    createdAt: { type: String, required: true },
  },
  { versionKey: false },
);

export const UserModel: Model<UserAttrs> =
  (mongoose.models.User as Model<UserAttrs> | undefined) ??
  mongoose.model<UserAttrs>('User', userSchema);
