import mongoose, { Schema, type Model, type Types } from 'mongoose';
import type { Area, Category, ContractType } from '@/lib/types';

export interface BillPostingSubdoc {
  _id: Types.ObjectId;
  date: string;
  amount: number;
  type: 'collection' | 'tds-vds';
}

export interface BillAttrs {
  customer: string;
  userId: string; // owner: DB user _id, or 'admin' for the env admin / legacy bills
  category: Category;
  billAmount: number;
  invoiceDate: string; // yyyy-MM-dd
  invoiceNo: string; // optional invoice number (e.g. "INV-101")
  area: Area | null;
  contractType: ContractType | null;
  partialPayment: boolean;
  profitBelowBudget: boolean;
  achievementBelow50: boolean;
  monthly100: boolean;
  postings: BillPostingSubdoc[];
  createdAt: string;
}

const postingSchema = new Schema<BillPostingSubdoc>(
  {
    date: { type: String, required: true },
    amount: { type: Number, required: true },
    type: { type: String, enum: ['collection', 'tds-vds'], default: 'collection' },
  },
  { _id: true },
);

const billSchema = new Schema<BillAttrs>(
  {
    customer: { type: String, required: true },
    userId: { type: String, default: 'admin' },
    category: {
      type: String,
      enum: ['parts-sale', 'service', 'tds-vds', 'contract'],
      required: true,
    },
    billAmount: { type: Number, required: true },
    invoiceDate: { type: String, required: true },
    invoiceNo: { type: String, default: '' },
    area: { type: String, enum: ['residential', 'industrial'], default: null },
    contractType: { type: String, enum: ['new', 'renewal'], default: null },
    partialPayment: { type: Boolean, default: false },
    profitBelowBudget: { type: Boolean, default: false },
    achievementBelow50: { type: Boolean, default: false },
    monthly100: { type: Boolean, default: false },
    postings: { type: [postingSchema], default: [] },
    createdAt: { type: String, required: true },
  },
  { versionKey: false },
);

export const BillModel: Model<BillAttrs> =
  (mongoose.models.Bill as Model<BillAttrs> | undefined) ??
  mongoose.model<BillAttrs>('Bill', billSchema);
