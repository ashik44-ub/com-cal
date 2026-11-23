import mongoose, { Schema, type Model } from 'mongoose';
import type { ContractType } from '@/lib/types';

export type StandaloneKind = 'service' | 'tds-vds' | 'csa';

/**
 * A standalone Service / TDS & VDS collection entry — NOT tied to any
 * bill. It counts in the dashboard totals together with bill postings
 * (Collection — This Month, the monthly gate total, and its kind's
 * collected/earned), but never in the parts-sale slab base or target %.
 *
 * A standalone CSA entry is different: it has no collection amount — it
 * earns the contract commission (new 500 / renewal 1000) and counts in
 * contract earned and Earning, but never in Collection totals, the gate,
 * the parts-sale slab base or the target %.
 */
export interface CollectionEntryAttrs {
  userId: string; // owner: DB user _id, or 'admin' for the env admin
  kind: StandaloneKind;
  /** Collection amount (service / tds-vds). 0 for CSA entries. */
  amount: number;
  date: string; // yyyy-MM-dd
  note: string;
  customerName: string;
  invoiceNo: string;
  /** Contract type for CSA entries ('new' / 'renewal'); null otherwise. */
  contractType: ContractType | null;
  createdAt: string;
}

const collectionEntrySchema = new Schema<CollectionEntryAttrs>(
  {
    userId: { type: String, required: true },
    kind: { type: String, enum: ['service', 'tds-vds', 'csa'], required: true },
    amount: { type: Number, default: 0 },
    date: { type: String, required: true },
    note: { type: String, default: '' },
    customerName: { type: String, default: '' },
    invoiceNo: { type: String, default: '' },
    contractType: { type: String, enum: ['new', 'renewal'], default: null },
    createdAt: { type: String, required: true },
  },
  { versionKey: false },
);

export const CollectionEntryModel: Model<CollectionEntryAttrs> =
  (mongoose.models.CollectionEntry as Model<CollectionEntryAttrs> | undefined) ??
  mongoose.model<CollectionEntryAttrs>('CollectionEntry', collectionEntrySchema);
