import mongoose from 'mongoose';
import { applyMonthlyCommissions, computeBill } from './commission';
import type { Area, Bill, Category, ContractType, Posting } from './types';
import { BillModel, type BillAttrs } from '@/models/Bill';
import { UserModel } from '@/models/User';
import { getCredentials } from './auth';

export interface BillInput {
  customer: string;
  category: Category;
  billAmount: number;
  invoiceDate: string; // yyyy-MM-dd
  invoiceNo?: string; // optional invoice number (e.g. "INV-101")
  area?: Area | null;
  contractType?: ContractType | null;
  partialPayment?: boolean;
  profitBelowBudget?: boolean;
  achievementBelow50?: boolean;
  monthly100?: boolean;
  /** Owner of the bill: DB user _id, or 'admin' for the env admin. */
  userId?: string;
}

/**
 * Which bills a caller may see. null = every bill (admin, "All users");
 * otherwise only the listed owners' bills (a regular user always gets
 * exactly their own id here).
 */
export interface BillScope {
  userIds: string[] | null;
}

export interface BillStore {
  listBills(scope: BillScope): Promise<Bill[]>;
  getBill(id: string, scope: BillScope): Promise<Bill | null>;
  createBill(input: BillInput): Promise<Bill>;
  updateBill(id: string, patch: Partial<BillInput>, scope: BillScope): Promise<Bill | null>;
  deleteBill(id: string, scope: BillScope): Promise<boolean>;
  addPosting(
    billId: string,
    posting: { date: string; amount: number; type?: 'collection' | 'tds-vds' },
    scope: BillScope,
  ): Promise<Bill | null>;
  deletePosting(billId: string, postingId: string, scope: BillScope): Promise<Bill | null>;
  /** Move every bill owned by userId to the env admin. Returns the count. */
  reassignBillsToAdmin(userId: string): Promise<number>;
  getStorage(): 'mongodb';
}

/** Stored bill fields (no derived fields — those come from computeBill). */
export interface StoredBill {
  id: string;
  customer: string;
  userId: string;
  category: Category;
  billAmount: number;
  invoiceDate: string;
  invoiceNo: string;
  area: Area | null;
  contractType: ContractType | null;
  partialPayment: boolean;
  profitBelowBudget: boolean;
  achievementBelow50: boolean;
  monthly100: boolean;
  postings: Posting[];
  createdAt: string;
}

function toBill(stored: StoredBill): Bill {
  return computeBill(stored);
}

function normalizeInput(input: BillInput): Omit<StoredBill, 'id' | 'postings' | 'createdAt'> {
  return {
    customer: input.customer,
    userId: input.userId ?? 'admin',
    category: input.category,
    billAmount: input.billAmount,
    invoiceDate: input.invoiceDate,
    invoiceNo: input.invoiceNo ?? '',
    area: input.area ?? null,
    contractType: input.contractType ?? null,
    partialPayment: input.partialPayment ?? false,
    profitBelowBudget: input.profitBelowBudget ?? false,
    achievementBelow50: input.achievementBelow50 ?? false,
    monthly100: input.monthly100 ?? false,
  };
}

/** Apply only the patch keys that are actually present (not undefined).
 *  v10: area is never applied here — a bill's area comes from its owner's
 *  account and only the admin changes it (see the admin users route). */
function applyPatch(
  target: Omit<StoredBill, 'id' | 'postings' | 'createdAt'>,
  patch: Partial<BillInput>,
): void {
  if (patch.customer !== undefined) target.customer = patch.customer;
  if (patch.category !== undefined) target.category = patch.category;
  if (patch.billAmount !== undefined) target.billAmount = patch.billAmount;
  if (patch.invoiceDate !== undefined) target.invoiceDate = patch.invoiceDate;
  if (patch.invoiceNo !== undefined) target.invoiceNo = patch.invoiceNo;
  if (patch.contractType !== undefined) target.contractType = patch.contractType;
  if (patch.partialPayment !== undefined) target.partialPayment = patch.partialPayment;
  if (patch.profitBelowBudget !== undefined) target.profitBelowBudget = patch.profitBelowBudget;
  if (patch.achievementBelow50 !== undefined) target.achievementBelow50 = patch.achievementBelow50;
  if (patch.monthly100 !== undefined) target.monthly100 = patch.monthly100;
}

// ---------------------------------------------------------------------------
// MongoDB (Mongoose) store
// ---------------------------------------------------------------------------

declare global {
  // eslint-disable-next-line no-var
  var __mongooseCache:
    | { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null }
    | undefined;
}

export async function connectDb(): Promise<typeof mongoose> {
  if (!isMongoConfigured()) {
    // No local-memory fallback: without a database the app cannot serve data.
    throw new Error(
      'MONGODB_URI is not set. Create .env.local in the project root from .env.local.example, paste your Atlas connection string, then restart the server.',
    );
  }
  const cached = (globalThis.__mongooseCache ??= { conn: null, promise: null });
  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    const uri = process.env.MONGODB_URI as string;
    // The Atlas URI may have no database name in its path, so always
    // select the database explicitly here.
    cached.promise = mongoose
      .connect(uri, { dbName: 'commission-calculator' })
      .catch((err: unknown) => {
        // Clear the failed promise so a later retry can try again.
        cached.promise = null;
        throw err;
      });
  }
  cached.conn = await cached.promise;
  return cached.conn;
}

/** True when a non-empty MONGODB_URI is set. */
export function isMongoConfigured(): boolean {
  return Boolean(process.env.MONGODB_URI && process.env.MONGODB_URI.trim());
}

/**
 * Strip any credentials / connection string from an error message before it
 * reaches the browser, logs or files. Never returns the URI, username or
 * password — only a safe, human-readable reason.
 */
export function sanitizeDbError(err: unknown): string {
  let msg = err instanceof Error ? err.message : String(err ?? 'Unknown error');
  // Remove any mongodb:// or mongodb+srv:// URI (credentials included).
  msg = msg.replace(/mongodb(\+srv)?:\/\/[^\s'"<>]*/gi, 'mongodb://<redacted>');
  msg = msg.replace(/\/\/[^/\s]*:[^/\s]*@[^/\s]*/g, '//<redacted>');
  // Belt and braces: if the raw URI somehow appears verbatim, blank it.
  const uri = process.env.MONGODB_URI;
  if (uri && msg.includes(uri)) msg = msg.split(uri).join('mongodb://<redacted>');
  const code = (err as { code?: unknown })?.code;
  if (typeof code === 'string' && /EREFUSED|ENOTFOUND|ETIMEDOUT|ECONNREFUSED/i.test(code)) {
    return `Could not reach MongoDB Atlas (${code}). Check your internet connection and that the cluster name in MONGODB_URI is correct.`;
  }
  if (/querySrv/i.test(msg)) {
    return 'Could not reach MongoDB Atlas (DNS lookup failed). Check your internet connection and that the cluster name in MONGODB_URI is correct.';
  }
  if (/authentication failed|bad auth/i.test(msg)) {
    return 'MongoDB authentication failed. Check the username and password in MONGODB_URI.';
  }
  if (/server selection timed out|timed out/i.test(msg)) {
    return 'Could not connect to MongoDB Atlas (connection timed out). Check Atlas Network Access allows your IP and the cluster is not paused.';
  }
  return msg.slice(0, 300);
}

export interface DbStatus {
  configured: boolean;
  error: string | null;
}

/**
 * Distinguish the two failure modes: (i) MONGODB_URI not set/empty,
 * (ii) MONGODB_URI is set but the connection fails. Never exposes credentials.
 */
export async function checkDbConnection(): Promise<DbStatus> {
  if (!isMongoConfigured()) return { configured: false, error: null };
  try {
    await connectDb();
    return { configured: true, error: null };
  } catch (err) {
    return { configured: true, error: sanitizeDbError(err) };
  }
}

/** JSON body for a 503 when the database is unavailable (missing URI or a
 *  failed connection). Sanitised — never contains credentials. */
export function dbErrorBody(err: unknown): {
  error: string;
  dbStatus: { configured: boolean; error: string };
} {
  const error = sanitizeDbError(err);
  return { error, dbStatus: { configured: isMongoConfigured(), error } };
}

function docToStored(doc: BillAttrs & { _id: { toString(): string } }): StoredBill {
  return {
    id: doc._id.toString(),
    customer: doc.customer,
    userId: doc.userId ?? 'admin',
    category: doc.category,
    billAmount: doc.billAmount,
    invoiceDate: doc.invoiceDate,
    invoiceNo: doc.invoiceNo ?? '',
    area: doc.area ?? null,
    contractType: doc.contractType ?? null,
    partialPayment: doc.partialPayment ?? false,
    profitBelowBudget: doc.profitBelowBudget ?? false,
    achievementBelow50: doc.achievementBelow50 ?? false,
    monthly100: doc.monthly100 ?? false,
    postings: (doc.postings ?? []).map((p) => ({
      id: p._id.toString(),
      date: p.date,
      amount: p.amount,
      type: p.type ?? 'collection',
    })),
    createdAt: doc.createdAt,
  };
}

type BillDoc = BillAttrs & { _id: { toString(): string } };

class MongoBillStore implements BillStore {
  getStorage(): 'mongodb' {
    return 'mongodb';
  }

  /** Display names for owner ids ('admin' → the env admin username). */
  private async loadOwnerNames(userIds: string[]): Promise<Map<string, string>> {
    const names = new Map<string, string>();
    const unique = Array.from(new Set(userIds));
    for (const id of unique) {
      if (id === 'admin') {
        names.set(id, getCredentials().username);
        continue;
      }
      const doc = await UserModel.findById(id).lean();
      names.set(id, doc ? doc.name : 'Unknown user');
    }
    return names;
  }

  private async withOwnerNames(bills: Bill[]): Promise<Bill[]> {
    const names = await this.loadOwnerNames(bills.map((b) => b.userId));
    return bills.map((b) => ({ ...b, ownerName: names.get(b.userId) ?? 'Unknown user' }));
  }

  /** True when this bill is inside the caller's scope. */
  private inScope(ownerId: string, scope: BillScope): boolean {
    return scope.userIds === null || scope.userIds.includes(ownerId);
  }

  async listBills(scope: BillScope): Promise<Bill[]> {
    await connectDb();
    const query = scope.userIds === null ? {} : { userId: { $in: scope.userIds } };
    const docs = await BillModel.find(query).sort({ createdAt: -1 }).lean();
    const bills = docs.map((d) => toBill(docToStored(d as BillDoc)));
    // Commission is monthly across ALL bills in scope, so it is applied
    // here from the scoped set — every Bill returned carries it.
    const withCommissions = applyMonthlyCommissions(bills);
    return this.withOwnerNames(withCommissions);
  }

  async getBill(id: string, scope: BillScope): Promise<Bill | null> {
    if (!mongoose.isValidObjectId(id)) return null;
    const bills = await this.listBills(scope);
    return bills.find((b) => b.id === id) ?? null;
  }

  async createBill(input: BillInput): Promise<Bill> {
    await connectDb();
    const doc = await BillModel.create({
      ...normalizeInput(input),
      postings: [],
      createdAt: new Date().toISOString(),
    });
    const ownerId = doc.userId ?? 'admin';
    const bills = await this.listBills({ userIds: [ownerId] });
    return (
      bills.find((b) => b.id === doc._id.toString()) ??
      toBill(docToStored(doc.toObject() as BillDoc))
    );
  }

  async updateBill(
    id: string,
    patch: Partial<BillInput>,
    scope: BillScope,
  ): Promise<Bill | null> {
    await connectDb();
    if (!mongoose.isValidObjectId(id)) return null;
    const doc = await BillModel.findById(id);
    if (!doc) return null;
    if (!this.inScope(doc.userId ?? 'admin', scope)) return null;
    const current: Omit<StoredBill, 'id' | 'postings' | 'createdAt'> = {
      customer: doc.customer,
      userId: doc.userId ?? 'admin',
      category: doc.category,
      billAmount: doc.billAmount,
      invoiceDate: doc.invoiceDate,
      invoiceNo: doc.invoiceNo ?? '',
      area: doc.area ?? null,
      contractType: doc.contractType ?? null,
      partialPayment: doc.partialPayment ?? false,
      profitBelowBudget: doc.profitBelowBudget ?? false,
      achievementBelow50: doc.achievementBelow50 ?? false,
      monthly100: doc.monthly100 ?? false,
    };
    applyPatch(current, patch);
    doc.set(current);
    await doc.save();
    const bills = await this.listBills({ userIds: [current.userId] });
    return (
      bills.find((b) => b.id === id) ?? toBill(docToStored(doc.toObject() as BillDoc))
    );
  }

  async deleteBill(id: string, scope: BillScope): Promise<boolean> {
    await connectDb();
    if (!mongoose.isValidObjectId(id)) return false;
    const doc = await BillModel.findById(id).lean();
    if (!doc) return false;
    if (!this.inScope(doc.userId ?? 'admin', scope)) return false;
    const result = await BillModel.deleteOne({ _id: id });
    return result.deletedCount > 0;
  }

  async addPosting(
    billId: string,
    posting: { date: string; amount: number; type?: 'collection' | 'tds-vds' },
    scope: BillScope,
  ): Promise<Bill | null> {
    await connectDb();
    if (!mongoose.isValidObjectId(billId)) return null;
    const doc = await BillModel.findById(billId);
    if (!doc) return null;
    if (!this.inScope(doc.userId ?? 'admin', scope)) return null;
    doc.postings.push({
      _id: new mongoose.Types.ObjectId(),
      date: posting.date,
      amount: posting.amount,
      type: posting.type ?? 'collection',
    });
    await doc.save();
    const bills = await this.listBills({ userIds: [doc.userId ?? 'admin'] });
    return (
      bills.find((b) => b.id === billId) ?? toBill(docToStored(doc.toObject() as BillDoc))
    );
  }

  async deletePosting(
    billId: string,
    postingId: string,
    scope: BillScope,
  ): Promise<Bill | null> {
    await connectDb();
    if (!mongoose.isValidObjectId(billId)) return null;
    const doc = await BillModel.findById(billId);
    if (!doc) return null;
    if (!this.inScope(doc.userId ?? 'admin', scope)) return null;
    const index = doc.postings.findIndex((p) => p._id.toString() === postingId);
    if (index === -1) return null;
    doc.postings.splice(index, 1);
    await doc.save();
    const bills = await this.listBills({ userIds: [doc.userId ?? 'admin'] });
    return (
      bills.find((b) => b.id === billId) ?? toBill(docToStored(doc.toObject() as BillDoc))
    );
  }

  async reassignBillsToAdmin(userId: string): Promise<number> {
    await connectDb();
    const result = await BillModel.updateMany({ userId }, { $set: { userId: 'admin' } });
    return result.modifiedCount ?? 0;
  }
}

const mongoStore = new MongoBillStore();

/**
 * The store is always MongoDB — there is no local-memory fallback. Throws a
 * sanitised error when MONGODB_URI is missing or the connection fails; API
 * routes turn that into a 503 with dbErrorBody().
 */
export async function getStore(): Promise<BillStore> {
  await connectDb();
  return mongoStore;
}
