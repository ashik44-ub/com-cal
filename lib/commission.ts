import type { Bill, Category, Posting, Summary } from './types';

/** Raw bill fields (everything stored) — derived fields are computed. */
export interface BillRaw {
  id: string;
  customer: string;
  userId: string;
  category: Category;
  billAmount: number;
  invoiceDate: string; // yyyy-MM-dd
  invoiceNo: string; // optional invoice number (e.g. "INV-101")
  area: Bill['area'];
  contractType: Bill['contractType'];
  partialPayment: boolean;
  profitBelowBudget: boolean;
  achievementBelow50: boolean;
  monthly100: boolean;
  postings: Posting[];
  createdAt: string;
}

export function flatService(amount: number): number {
  if (amount > 15000) return 500;
  if (amount > 6000) return 400;
  if (amount > 3000) return 300;
  if (amount > 1000) return 150;
  return 0;
}

/**
 * Service-contract (CSA/SnM/OnM) commission — per the user's correction
 * (2026-11-23): a NEW contract earns ৳500 and a RENEWAL earns ৳1,000.
 * This is the opposite of the earlier ASE-policy reading (new 1,000 /
 * renewal 500); the user's word now governs, for contract bills and for
 * standalone CSA entries alike.
 */
export function contractCommission(contractType: Bill['contractType']): number {
  if (contractType === 'new') return 500;
  if (contractType === 'renewal') return 1000;
  return 0;
}

export interface PartsSlab {
  rate: number;
  bonus: number;
}

export function partsSlab(collected: number): PartsSlab | null {
  if (collected >= 700000) return { rate: 3.25, bonus: 2500 };
  if (collected >= 500000) return { rate: 3.0, bonus: 2000 };
  if (collected >= 400000) return { rate: 2.75, bonus: 1750 };
  if (collected >= 300000) return { rate: 2.5, bonus: 1500 };
  if (collected >= 200000) return { rate: 2.25, bonus: 1250 };
  if (collected >= 150000) return { rate: 2.0, bonus: 1000 };
  if (collected >= 115000) return { rate: 1.75, bonus: 750 };
  return null;
}

/** Whole days between invoiceDate and postingDate (posting minus invoice). */
export function daysLate(postingDate: string, invoiceDate: string): number {
  const posting = Date.parse(`${postingDate}T00:00:00Z`);
  const invoice = Date.parse(`${invoiceDate}T00:00:00Z`);
  if (Number.isNaN(posting) || Number.isNaN(invoice)) return 0;
  return Math.floor((posting - invoice) / 86400000);
}

function minimumCollection(area: Bill['area']): number {
  return area === 'industrial' ? 275000 : 115000;
}

function isDisqualified(bill: Pick<Bill, 'partialPayment' | 'profitBelowBudget' | 'achievementBelow50'>): boolean {
  return bill.partialPayment || bill.profitBelowBudget || bill.achievementBelow50;
}

/** A posting earns commission only if the bill is not disqualified and the
 *  posting is within 45 days of the invoice date. Late postings still count
 *  in the collected totals. */
function isPostingEligible(bill: Bill, posting: Posting): boolean {
  return !isDisqualified(bill) && daysLate(posting.date, bill.invoiceDate) <= 45;
}

export function computeBill(raw: BillRaw): Bill {
  const collectedTotal = raw.postings.reduce((sum, p) => sum + p.amount, 0);
  const remaining = Math.max(0, raw.billAmount - collectedTotal);
  const collectedPercent =
    raw.billAmount > 0
      ? Math.min(100, Math.round((collectedTotal / raw.billAmount) * 100))
      : 0;
  const status: Bill['status'] =
    collectedTotal <= 0
      ? 'pending'
      : collectedTotal < raw.billAmount
        ? 'partial'
        : 'collected';

  const commissionWarning = raw.postings.some((p) => {
    const d = daysLate(p.date, raw.invoiceDate);
    return d >= 31 && d <= 45;
  })
    ? 'HoD approval needed — collection after 30 days'
    : null;

  // Commission depends on the whole month's collection across ALL bills, so
  // it cannot be computed from this bill alone. computeBill leaves it at 0
  // and applyMonthlyCommissions() (below) fills it in from the full set.
  // Contract commission is per-bill and ungated, so it is set here.
  let commission = 0;
  const commissionReason: string | null = null;
  if (raw.category === 'contract') {
    commission = contractCommission(raw.contractType);
  }

  // Projected commission (ignores deadline and disqualifiers).
  let projectedCommission = 0;
  if (raw.category === 'contract') {
    projectedCommission = contractCommission(raw.contractType);
  } else if (raw.category === 'service' || raw.category === 'tds-vds') {
    projectedCommission = flatService(raw.billAmount);
  } else {
    const min = minimumCollection(raw.area);
    if (raw.billAmount >= min) {
      const slab = partsSlab(raw.billAmount);
      if (slab) {
        projectedCommission = (raw.billAmount * slab.rate) / 100 + slab.bonus;
        if (raw.monthly100) {
          projectedCommission += (raw.billAmount * 1.75) / 100;
        }
      }
    }
  }

  return {
    id: raw.id,
    customer: raw.customer,
    userId: raw.userId,
    category: raw.category,
    billAmount: raw.billAmount,
    invoiceDate: raw.invoiceDate,
    invoiceNo: raw.invoiceNo ?? '',
    area: raw.area,
    contractType: raw.contractType,
    partialPayment: raw.partialPayment,
    profitBelowBudget: raw.profitBelowBudget,
    achievementBelow50: raw.achievementBelow50,
    monthly100: raw.monthly100,
    postings: raw.postings,
    collectedTotal,
    remaining,
    collectedPercent,
    status,
    commission,
    commissionReason,
    commissionWarning,
    projectedCommission,
    createdAt: raw.createdAt,
  };
}

export function billCollectedInMonth(bill: Bill, month: string): number {
  return bill.postings
    .filter((p) => p.date.startsWith(month))
    .reduce((sum, p) => sum + p.amount, 0);
}

/**
 * Commission for ONE month, computed from every bill (ASE policy, monthly
 * basis — not per bill):
 * - The base is the month's total collection (all categories, all postings).
 * - Monthly gate: if the month's total collection is below the area minimum
 *   (275,000 when any bill with postings that month is industrial /
 *   outside-metro, otherwise 115,000), NO commission at all is earned that
 *   month — parts slab 0 and service/TDS-VDS flat 0. Contract is ungated.
 * - Above the gate, parts-sale commission = the parts slab applied to the
 *   month's eligible parts-sale collection, plus +1.75% of it when any
 *   contributing parts-sale bill has monthly100 ticked.
 * - Only eligible postings count towards commission: within 45 days of the
 *   bill's invoice date and the bill not disqualified (partial payment /
 *   profit below budget / achievement below 50%). Late postings still count
 *   in the collected totals.
 */
export interface MonthCommission {
  month: string;
  collected: number;
  gate: number;
  gatePassed: boolean;
  partsCollected: number;
  partsBase: number;
  partsCommission: number;
  serviceCollected: number;
  serviceEarned: number;
  tdsVdsCollected: number;
  tdsVdsEarned: number;
  contractCollected: number;
  contractEarned: number;
  earned: number;
  /**
   * Why a category earned 0, for the dashboard reason lines (v8 — the
   * numbers took a long time to appear and sometimes never did, and a 0
   * looked like a failed load). Amounts of in-month postings that earned
   * nothing because they were past the 45-day deadline (late) or on a
   * disqualified bill. serviceTdsSmallEligible counts eligible
   * Service/TDS & VDS postings (bills + standalone entries) of ৳1,000 or
   * less, which earn a flat ৳0.
   */
  partsIneligibleLate: number;
  partsIneligibleDisqualified: number;
  serviceTdsIneligibleLate: number;
  serviceTdsIneligibleDisqualified: number;
  serviceTdsSmallEligible: number;
}

/** A standalone dashboard entry (not tied to any bill). */
export interface MonthEntry {
  kind: 'service' | 'tds-vds' | 'csa';
  amount: number;
  date: string;
  contractType?: Bill['contractType'];
}

export function computeMonthCommission(
  bills: Bill[],
  month: string,
  entries: MonthEntry[] = [],
): MonthCommission {
  const inMonth = (d: string) => d.startsWith(month);
  let collected = 0;
  let anyIndustrial = false;
  let partsCollected = 0;
  let partsBase = 0;
  let serviceCollected = 0;
  let serviceFlat = 0;
  let tdsVdsCollected = 0;
  let tdsVdsFlat = 0;
  let contractCollected = 0;
  let monthly100Parts = false;
  let partsIneligibleLate = 0;
  let partsIneligibleDisqualified = 0;
  let serviceTdsIneligibleLate = 0;
  let serviceTdsIneligibleDisqualified = 0;
  let serviceTdsSmallEligible = 0;

  for (const bill of bills) {
    for (const posting of bill.postings) {
      if (!inMonth(posting.date)) continue;
      collected += posting.amount;
      if (bill.area === 'industrial') anyIndustrial = true;
      // A posting's category is 'tds-vds' when its type is 'tds-vds'
      // (e.g. a TDS/VDS challan posted against a parts-sale bill);
      // otherwise it is the bill's category. A challan counts toward the
      // bill total and the month's total collection / gate, but NOT toward
      // the parts-sale slab base or the target % base.
      const effectiveCategory: Category =
        posting.type === 'tds-vds' ? 'tds-vds' : bill.category;
      const eligible = isPostingEligible(bill, posting);
      if (effectiveCategory === 'parts-sale') {
        partsCollected += posting.amount;
        if (eligible) {
          partsBase += posting.amount;
          if (bill.monthly100) monthly100Parts = true;
        } else if (isDisqualified(bill)) {
          partsIneligibleDisqualified += posting.amount;
        } else {
          partsIneligibleLate += posting.amount;
        }
      } else if (effectiveCategory === 'service') {
        serviceCollected += posting.amount;
        if (eligible) {
          serviceFlat += flatService(posting.amount);
          if (flatService(posting.amount) === 0) serviceTdsSmallEligible += 1;
        } else if (isDisqualified(bill)) {
          serviceTdsIneligibleDisqualified += posting.amount;
        } else {
          serviceTdsIneligibleLate += posting.amount;
        }
      } else if (effectiveCategory === 'tds-vds') {
        tdsVdsCollected += posting.amount;
        if (eligible) {
          tdsVdsFlat += flatService(posting.amount);
          if (flatService(posting.amount) === 0) serviceTdsSmallEligible += 1;
        } else if (isDisqualified(bill)) {
          serviceTdsIneligibleDisqualified += posting.amount;
        } else {
          serviceTdsIneligibleLate += posting.amount;
        }
      } else if (effectiveCategory === 'contract') {
        contractCollected += posting.amount;
      }
    }
  }

  let contractEarned = 0;
  for (const bill of bills) {
    if (bill.category === 'contract' && inMonth(bill.invoiceDate)) {
      contractEarned += contractCommission(bill.contractType);
    }
  }

  // Standalone Service / TDS & VDS entries (not tied to any bill): they
  // count in the month's total collection and in their kind's collected,
  // and earn the flat commission when the gate passes. There is no invoice
  // date, so they are never late (no 45-day deadline). They never affect
  // the parts-sale slab base or the sales target.
  // Standalone CSA entries: they earn the contract commission (new 500 /
  // renewal 1000) like a contract bill, and count in contract earned and
  // in Earning — but they have no collection amount, so they do NOT add
  // to Collection — This Month, the monthly gate total, the parts-sale
  // slab base, or the sales target.
  for (const entry of entries) {
    if (!inMonth(entry.date)) continue;
    if (entry.kind === 'csa') {
      contractEarned += contractCommission(entry.contractType ?? null);
      continue;
    }
    collected += entry.amount;
    if (entry.kind === 'service') {
      serviceCollected += entry.amount;
      serviceFlat += flatService(entry.amount);
      if (flatService(entry.amount) === 0) serviceTdsSmallEligible += 1;
    } else {
      tdsVdsCollected += entry.amount;
      tdsVdsFlat += flatService(entry.amount);
      if (flatService(entry.amount) === 0) serviceTdsSmallEligible += 1;
    }
  }

  const gate = anyIndustrial ? 275000 : 115000;
  const gatePassed = collected >= gate;

  // Residential cap: when the month has NO industrial postings, the parts
  // commission base is capped at 250,000 (the 115,000 gate is unchanged).
  // The monthly100 bonus applies to the capped base. Industrial months
  // are unchanged.
  if (!anyIndustrial) partsBase = Math.min(partsBase, 250000);

  let partsCommission = 0;
  if (gatePassed) {
    const slab = partsSlab(partsBase);
    if (slab) {
      partsCommission = (partsBase * slab.rate) / 100 + slab.bonus;
      if (monthly100Parts) partsCommission += (partsBase * 1.75) / 100;
    }
  }
  const serviceEarned = gatePassed ? serviceFlat : 0;
  const tdsVdsEarned = gatePassed ? tdsVdsFlat : 0;
  const earned = partsCommission + serviceEarned + tdsVdsEarned + contractEarned;

  return {
    month,
    collected,
    gate,
    gatePassed,
    partsCollected,
    partsBase,
    partsCommission,
    serviceCollected,
    serviceEarned,
    tdsVdsCollected,
    tdsVdsEarned,
    contractCollected,
    contractEarned,
    earned,
    partsIneligibleLate,
    partsIneligibleDisqualified,
    serviceTdsIneligibleLate,
    serviceTdsIneligibleDisqualified,
    serviceTdsSmallEligible,
  };
}

/**
 * Sales-target achievement % for parts sale: parts-sale collection this
 * month / monthly target × 100, shown with 1 decimal. 0 collection → 0.0%;
 * any positive collection shows at least 1.0% (floor); no cap above 100%.
 */
export function achievementPercent(partsCollected: number, target: number): number {
  if (partsCollected <= 0) return 0;
  if (target <= 0) return 100;
  const raw = (partsCollected / target) * 100;
  return Math.max(1, Math.round(raw * 10) / 10);
}

function monthsInvolved(bills: Bill[]): string[] {
  const months = new Set<string>();
  for (const bill of bills) {
    for (const posting of bill.postings) months.add(posting.date.slice(0, 7));
    if (bill.category === 'contract') months.add(bill.invoiceDate.slice(0, 7));
  }
  return Array.from(months).sort();
}

/**
 * Fill in each bill's `commission` and `commissionReason` from the monthly
 * computation (the month's parts commission is shared across the bills with
 * eligible postings that month, pro-rata by each bill's eligible postings
 * that month; a bill with postings in several months sums its shares).
 * Contract bills keep the per-bill rate set by computeBill.
 */
export function applyMonthlyCommissions(bills: Bill[]): Bill[] {
  const months = monthsInvolved(bills);
  const byMonth = new Map<string, MonthCommission>();
  for (const month of months) byMonth.set(month, computeMonthCommission(bills, month));

  return bills.map((bill) => {
    if (bill.category === 'contract') return bill;

    let commission = 0;
    let hadGateFailure = false;
    let hadEligiblePosting = false;
    let allPostingsLate = bill.postings.length > 0;

    for (const month of months) {
      const mc = byMonth.get(month);
      if (!mc) continue;
      if (bill.category === 'parts-sale') {
        // Only 'collection'-type postings share the month's parts
        // commission; a 'tds-vds' (challan) posting on this bill earns the
        // flat TDS/VDS commission instead.
        const eligible = bill.postings
          .filter(
            (p) =>
              p.date.startsWith(month) &&
              p.type !== 'tds-vds' &&
              isPostingEligible(bill, p),
          )
          .reduce((sum, p) => sum + p.amount, 0);
        if (eligible > 0) {
          hadEligiblePosting = true;
          if (!mc.gatePassed) {
            hadGateFailure = true;
          } else if (mc.partsBase > 0) {
            commission += (mc.partsCommission * eligible) / mc.partsBase;
          }
        }
        for (const posting of bill.postings) {
          if (!posting.date.startsWith(month)) continue;
          if (posting.type !== 'tds-vds') continue;
          if (isPostingEligible(bill, posting)) {
            hadEligiblePosting = true;
            if (!mc.gatePassed) {
              hadGateFailure = true;
            } else {
              commission += flatService(posting.amount);
            }
          }
        }
      } else {
        // service / tds-vds: flat per eligible posting, gated per month.
        for (const posting of bill.postings) {
          if (!posting.date.startsWith(month)) continue;
          if (isPostingEligible(bill, posting)) {
            hadEligiblePosting = true;
            if (!mc.gatePassed) {
              hadGateFailure = true;
            } else {
              commission += flatService(posting.amount);
            }
          }
        }
      }
    }

    for (const posting of bill.postings) {
      if (daysLate(posting.date, bill.invoiceDate) <= 45) allPostingsLate = false;
    }

    let commissionReason: string | null = null;
    if (isDisqualified(bill)) {
      commission = 0;
      if (bill.partialPayment) commissionReason = 'Partial payment — no commission';
      else if (bill.profitBelowBudget) commissionReason = 'Profit below SnS budget — no commission';
      else commissionReason = 'Monthly achievement below 50% — no commission';
    } else if (commission === 0 && bill.postings.length > 0) {
      if (hadGateFailure) {
        commissionReason = 'Monthly collection below minimum — no commission';
      } else if (allPostingsLate) {
        commissionReason = 'Deadline passed — no commission';
      } else if (bill.category === 'parts-sale' && hadEligiblePosting) {
        commissionReason = 'Below minimum collection';
      }
    }

    return { ...bill, commission, commissionReason };
  });
}

const MONTH_LABELS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

function shiftMonth(month: string, offset: number): string {
  const [y, m] = month.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1 + offset, 1));
  const year = date.getUTCFullYear();
  const mon = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${year}-${mon}`;
}

export function computeSummary(
  bills: Bill[],
  month: string,
  storage: Summary['storage'],
  monthlyTarget: number = 550000,
  entries: MonthEntry[] = [],
): Summary {
  const current = computeMonthCommission(bills, month, entries);
  const pending = bills.filter((b) => b.status === 'pending' || b.status === 'partial');
  const pendingCount = pending.length;
  const pendingAmount = pending.reduce((sum, b) => sum + b.remaining, 0);

  const byCategory: Summary['byCategory'] = {
    'parts-sale': { collected: current.partsCollected, earned: current.partsCommission },
    service: { collected: current.serviceCollected, earned: current.serviceEarned },
    'tds-vds': { collected: current.tdsVdsCollected, earned: current.tdsVdsEarned },
    contract: { collected: current.contractCollected, earned: current.contractEarned },
  };

  const series: Summary['series'] = [];
  for (let i = 5; i >= 0; i--) {
    const m = shiftMonth(month, -i);
    const monthIndex = Number(m.split('-')[1]) - 1;
    const mc = computeMonthCommission(bills, m, entries);
    series.push({
      month: m,
      label: MONTH_LABELS[monthIndex],
      collected: mc.collected,
      earned: mc.earned,
    });
  }

  return {
    month,
    monthCollected: current.collected,
    monthEarned: current.earned,
    pendingCount,
    pendingAmount,
    totalBills: bills.length,
    byCategory,
    series,
    storage,
    monthlyTarget,
    // Why a commission is 0 (v8): the monthly gate and the parts base,
    // plus how much of each category earned nothing because postings were
    // past the 45-day deadline or on a disqualified bill. The dashboard
    // turns these into a short reason line under each ৳0 card.
    gate: current.gate,
    gatePassed: current.gatePassed,
    partsBase: current.partsBase,
    partsIneligibleLate: current.partsIneligibleLate,
    partsIneligibleDisqualified: current.partsIneligibleDisqualified,
    serviceTdsIneligibleLate: current.serviceTdsIneligibleLate,
    serviceTdsIneligibleDisqualified: current.serviceTdsIneligibleDisqualified,
    serviceTdsSmallEligible: current.serviceTdsSmallEligible,
    // Target % base: the month's parts-sale collection (collection-type
    // postings only — TDS & VDS challan postings do not count here).
    targetPercent: achievementPercent(current.partsCollected, monthlyTarget),
  };
}
