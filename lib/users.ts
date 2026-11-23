/**
 * Database users (Node runtime only — imports node:crypto and mongoose,
 * so it must NOT be imported from middleware; use lib/auth.ts there).
 *
 * Passwords are hashed with scrypt (random 16-byte salt, 64-byte key).
 * Reset tokens are single-use: the raw token is shown to the requester once
 * (there is no mail server), only its SHA-256 hash is stored, and it
 * expires after 1 hour.
 */
import { randomBytes, scrypt, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';
import type { NextRequest } from 'next/server';
import {
  SESSION_COOKIE_NAME,
  getCredentials,
  parseSessionCookie,
  type SessionRole,
} from '@/lib/auth';
import { connectDb } from '@/lib/db';
import { UserModel, type UserAttrs } from '@/models/User';
import { getEnvAdminArea } from '@/lib/settings';
import type { Area } from '@/lib/types';

const scryptAsync = promisify(scrypt);

export const DEFAULT_MONTHLY_TARGET = 550000;
export const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: SessionRole;
  monthlyTarget: number;
  disabled: boolean;
  /** True for the env admin (APP_USERNAME / APP_PASSWORD), not a DB user. */
  isEnvAdmin: boolean;
}

export async function hashPassword(password: string): Promise<{ salt: string; hash: string }> {
  const salt = randomBytes(16);
  const derived = (await scryptAsync(password, salt, 64)) as Buffer;
  return { salt: salt.toString('hex'), hash: derived.toString('hex') };
}

export async function verifyPassword(
  password: string,
  saltHex: string,
  hashHex: string,
): Promise<boolean> {
  try {
    const derived = (await scryptAsync(password, Buffer.from(saltHex, 'hex'), 64)) as Buffer;
    const expected = Buffer.from(hashHex, 'hex');
    return derived.length === expected.length && timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}

/** The env admin as a SessionUser (no DB row). Target is the default. */
export function envAdminUser(): SessionUser {
  return {
    id: 'admin',
    name: getCredentials().username,
    email: '',
    role: 'admin',
    monthlyTarget: DEFAULT_MONTHLY_TARGET,
    disabled: false,
    isEnvAdmin: true,
  };
}

function docToSessionUser(doc: UserAttrs & { _id: { toString(): string } }): SessionUser {
  return {
    id: doc._id.toString(),
    name: doc.name,
    email: doc.email,
    role: doc.role,
    monthlyTarget: doc.monthlyTarget,
    disabled: doc.disabled,
    isEnvAdmin: false,
  };
}

export async function getUserById(id: string): Promise<SessionUser | null> {
  if (id === 'admin') return envAdminUser();
  await connectDb();
  const doc = await UserModel.findById(id).lean();
  if (!doc) return null;
  return docToSessionUser(doc as UserAttrs & { _id: { toString(): string } });
}

/**
 * Resolve the logged-in user from the session cookie: verify the HMAC
 * signature, then load the fresh account (role and disabled flag are
 * always read from the database, never trusted from the token). Returns
 * null when there is no valid session, the account no longer exists, or
 * it is disabled.
 */
export async function getSessionUser(
  cookieValue: string | undefined,
): Promise<SessionUser | null> {
  const payload = await parseSessionCookie(cookieValue);
  if (!payload) return null;
  if (payload.userId === 'admin') {
    return payload.role === 'admin' ? envAdminUser() : null;
  }
  const user = await getUserById(payload.userId);
  if (!user || user.disabled) return null;
  // The token role is only a hint; the database role is authoritative.
  return user;
}

export async function getRequestSession(request: NextRequest): Promise<SessionUser | null> {
  return getSessionUser(request.cookies.get(SESSION_COOKIE_NAME)?.value);
}

/** Display name for a bill owner id ('admin' → the env admin username). */
export async function ownerNameFor(userId: string): Promise<string> {
  if (userId === 'admin') return getCredentials().username;
  const user = await getUserById(userId);
  return user ? user.name : 'Unknown user';
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function createDbUser(input: {
  name: string;
  email: string;
  password: string;
  area: Area;
}): Promise<{ user: SessionUser } | { error: string }> {
  const email = input.email.trim().toLowerCase();
  await connectDb();
  const existing = await UserModel.findOne({ email }).lean();
  if (existing) return { error: 'An account with this email already exists.' };
  const { salt, hash } = await hashPassword(input.password);
  const doc = await UserModel.create({
    name: input.name.trim(),
    email,
    passwordHash: hash,
    passwordSalt: salt,
    role: 'user',
    monthlyTarget: DEFAULT_MONTHLY_TARGET,
    disabled: false,
    area: input.area,
    resetTokenHash: null,
    resetTokenExpiresAt: null,
    createdAt: new Date().toISOString(),
  });
  return { user: docToSessionUser(doc.toObject() as UserAttrs & { _id: { toString(): string } }) };
}

/**
 * The area stored on an account (v10). For the env admin ('admin') it is
 * the setting, not a user row; for a DB user it is their User.area.
 * null = no area set (legacy account, or env admin before one is set).
 */
export async function getAccountArea(userId: string): Promise<Area | null> {
  if (userId === 'admin') return getEnvAdminArea();
  await connectDb();
  const doc = await UserModel.findById(userId).lean();
  if (!doc) return null;
  return (doc.area ?? null) as Area | null;
}

/** Check a DB user's password by email. Returns the user, or null. */
export async function verifyDbUserPassword(
  email: string,
  password: string,
): Promise<SessionUser | null> {
  await connectDb();
  const doc = await UserModel.findOne({ email: email.trim().toLowerCase() }).lean();
  if (!doc) return null;
  const ok = await verifyPassword(password, doc.passwordSalt, doc.passwordHash);
  if (!ok) return null;
  return docToSessionUser(doc as UserAttrs & { _id: { toString(): string } });
}

function hashToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

/**
 * Create a single-use password-reset token for the user with this email.
 * Returns the reset URL (relative) when the account exists, null otherwise.
 * The raw token is returned only here — the database stores only its hash.
 */
export async function requestPasswordReset(email: string): Promise<string | null> {
  await connectDb();
  const doc = await UserModel.findOne({ email: email.trim().toLowerCase() });
  if (!doc) return null;
  const raw = randomBytes(32).toString('hex');
  doc.resetTokenHash = hashToken(raw);
  doc.resetTokenExpiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);
  await doc.save();
  return `/reset?token=${raw}`;
}

/** Use a reset token to set a new password. Single-use: the token is
 *  cleared on success, and an expired or already-used token is rejected. */
export async function resetPasswordWithToken(
  token: string,
  newPassword: string,
): Promise<{ ok: true } | { error: string }> {
  await connectDb();
  const doc = await UserModel.findOne({
    resetTokenHash: hashToken(token),
    resetTokenExpiresAt: { $gt: new Date() },
  });
  if (!doc) return { error: 'This reset link is invalid or has expired. Please request a new one.' };
  const { salt, hash } = await hashPassword(newPassword);
  doc.passwordHash = hash;
  doc.passwordSalt = salt;
  doc.resetTokenHash = null;
  doc.resetTokenExpiresAt = null;
  await doc.save();
  return { ok: true };
}
