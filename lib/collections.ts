/**
 * Standalone Service / TDS & VDS collection entries (Node runtime only).
 * Entries belong to the logged-in user; an admin may list/delete any
 * user's entries through the same scoping as bills.
 */
import mongoose from 'mongoose';
import { connectDb, type BillScope } from '@/lib/db';
import { CollectionEntryModel, type StandaloneKind } from '@/models/CollectionEntry';
import { UserModel } from '@/models/User';
import { getCredentials } from '@/lib/auth';
import type { ContractType } from '@/lib/types';

export interface StandaloneEntry {
  id: string;
  userId: string;
  ownerName?: string;
  kind: StandaloneKind;
  amount: number;
  date: string;
  note: string;
  customerName: string;
  invoiceNo: string;
  contractType: ContractType | null;
  createdAt: string;
}

type EntryDoc = {
  _id: { toString(): string };
  userId: string;
  kind: StandaloneKind;
  amount: number;
  date: string;
  note: string;
  customerName: string;
  invoiceNo: string;
  contractType: ContractType | null;
  createdAt: string;
};

function docToEntry(doc: EntryDoc): StandaloneEntry {
  return {
    id: doc._id.toString(),
    userId: doc.userId,
    kind: doc.kind,
    amount: doc.amount ?? 0,
    date: doc.date,
    note: doc.note ?? '',
    customerName: doc.customerName ?? '',
    invoiceNo: doc.invoiceNo ?? '',
    contractType: doc.contractType ?? null,
    createdAt: doc.createdAt,
  };
}

async function ownerNames(userIds: string[]): Promise<Map<string, string>> {
  const names = new Map<string, string>();
  for (const id of Array.from(new Set(userIds))) {
    if (id === 'admin') {
      names.set(id, getCredentials().username);
      continue;
    }
    const doc = await UserModel.findById(id).lean();
    names.set(id, doc ? doc.name : 'Unknown user');
  }
  return names;
}

export async function listEntries(
  scope: BillScope,
  month?: string,
): Promise<StandaloneEntry[]> {
  await connectDb();
  const query: Record<string, unknown> = {};
  if (scope.userIds !== null) query.userId = { $in: scope.userIds };
  if (month) query.date = { $regex: `^${month}` };
  const docs = await CollectionEntryModel.find(query)
    .sort({ date: -1, createdAt: -1 })
    .lean();
  const entries = (docs as unknown as EntryDoc[]).map(docToEntry);
  const names = await ownerNames(entries.map((e) => e.userId));
  return entries.map((e) => ({ ...e, ownerName: names.get(e.userId) ?? 'Unknown user' }));
}

export async function createEntry(input: {
  userId: string;
  kind: StandaloneKind;
  amount: number;
  date: string;
  note?: string;
  customerName?: string;
  invoiceNo?: string;
  contractType?: ContractType | null;
}): Promise<StandaloneEntry> {
  await connectDb();
  const doc = await CollectionEntryModel.create({
    userId: input.userId,
    kind: input.kind,
    amount: input.kind === 'csa' ? 0 : input.amount,
    date: input.date,
    note: input.note ?? '',
    customerName: input.customerName ?? '',
    invoiceNo: input.invoiceNo ?? '',
    contractType: input.kind === 'csa' ? (input.contractType ?? null) : null,
    createdAt: new Date().toISOString(),
  });
  const entry = docToEntry(doc.toObject() as unknown as EntryDoc);
  const names = await ownerNames([entry.userId]);
  return { ...entry, ownerName: names.get(entry.userId) ?? 'Unknown user' };
}

export async function deleteEntry(id: string, scope: BillScope): Promise<boolean> {
  await connectDb();
  if (!mongoose.isValidObjectId(id)) return false;
  const doc = await CollectionEntryModel.findById(id).lean();
  if (!doc) return false;
  if (scope.userIds !== null && !scope.userIds.includes(doc.userId)) return false;
  const result = await CollectionEntryModel.deleteOne({ _id: id });
  return result.deletedCount > 0;
}
