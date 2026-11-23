export type Category = 'parts-sale' | 'service' | 'tds-vds' | 'contract';
export type Area = 'residential' | 'industrial';
export type ContractType = 'new' | 'renewal';
export type BillStatus = 'pending' | 'partial' | 'collected';

export interface Posting {
  id: string;
  date: string; // yyyy-MM-dd
  amount: number;
  /** 'collection' = cash collection; 'tds-vds' = a TDS/VDS (challan) posting
   *  — it counts as TDS & VDS on the dashboard, not as parts-sale collection. */
  type: 'collection' | 'tds-vds';
}

export interface Bill {
  id: string;
  customer: string;
  userId: string; // owner: DB user _id, or 'admin' for the env admin / legacy bills
  ownerName?: string; // display name of the owner (filled by the store)
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
  postings: Posting[];
  collectedTotal: number;
  remaining: number;
  collectedPercent: number; // 0-100
  status: BillStatus;
  commission: number;
  commissionReason: string | null;
  commissionWarning: string | null;
  projectedCommission: number;
  createdAt: string;
}

export interface Summary {
  month: string; // YYYY-MM
  monthCollected: number;
  monthEarned: number;
  pendingCount: number;
  pendingAmount: number;
  totalBills: number;
  byCategory: Record<Category, { collected: number; earned: number }>;
  series: { month: string; label: string; collected: number; earned: number }[]; // last 6 months, oldest first
  storage: 'mongodb';
  /** Monthly sales target (parts sale) for the scoped user(s). */
  monthlyTarget: number;
  /** Parts-sale achievement % vs monthlyTarget (1 decimal; 0.0% at 0,
   *  at least 1.0% for any positive collection; uncapped above 100%). */
  targetPercent: number;
  /** MongoDB diagnostics: configured = MONGODB_URI is set; error = sanitised connection error (never contains credentials). */
  dbStatus?: { configured: boolean; error: string | null };
  /**
   * Why a commission is 0 (v8). The monthly gate (275,000 when any bill
   * with a posting this month is industrial, otherwise 115,000) and
   * whether it passed; the parts-sale slab base; and how much of each
   * category earned nothing because postings were past the 45-day deadline
   * or on a disqualified bill. Optional so older cached responses still
   * type-check — the dashboard treats a missing value as "no reason".
   */
  gate?: number;
  gatePassed?: boolean;
  partsBase?: number;
  partsIneligibleLate?: number;
  partsIneligibleDisqualified?: number;
  serviceTdsIneligibleLate?: number;
  serviceTdsIneligibleDisqualified?: number;
  /** Eligible Service/TDS & VDS postings of ৳1,000 or less (flat ৳0). */
  serviceTdsSmallEligible?: number;
}

export type UserRole = 'admin' | 'user';

/** A database user as shown to the admin (never includes password data). */
export interface UserPublic {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  monthlyTarget: number;
  disabled: boolean;
  /** The user's area, chosen at sign-up (v10). null = not set (legacy account). */
  area: Area | null;
  createdAt: string;
  /** This month's stats (only present when a month was requested). */
  partsCollected?: number;
  achievementPercent?: number;
  commission?: number;
}
