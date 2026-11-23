import type { Area, Category } from "@/lib/types";

export function fmt(n: number): string {
  return "৳" + Math.round(n).toLocaleString("en-US");
}

export function fmtNum(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

export const CATEGORY_LABELS: Record<Category, string> = {
  "parts-sale": "Parts Sale",
  service: "Service",
  "tds-vds": "TDS / VDS",
  contract: "Service Contract",
};

export const CATEGORY_OPTIONS: { value: Category; label: string }[] = [
  { value: "parts-sale", label: "Parts Sale" },
  { value: "service", label: "Service" },
  { value: "tds-vds", label: "TDS / VDS" },
  { value: "contract", label: "Service Contract" },
];

/** Area labels. "Outside Residential" is the stored value 'industrial'. */
export const AREA_LABELS: Record<Area, string> = {
  residential: "Residential",
  industrial: "Outside Residential",
};

export const AREA_OPTIONS: { value: Area; label: string }[] = [
  { value: "residential", label: "Residential" },
  { value: "industrial", label: "Outside Residential" },
];

export function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function daysSince(iso: string): number {
  const d = new Date(iso).getTime();
  if (Number.isNaN(d)) return 0;
  return Math.max(0, Math.floor((Date.now() - d) / (1000 * 60 * 60 * 24)));
}

/** Whole days from one date to another (to minus from), clamped at 0. */
export function daysBetween(fromIso: string, toIso: string): number {
  const from = new Date(fromIso).getTime();
  const to = new Date(toIso).getTime();
  if (Number.isNaN(from) || Number.isNaN(to)) return 0;
  return Math.max(0, Math.floor((to - from) / (1000 * 60 * 60 * 24)));
}

export function currentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

export function monthLabel(yyyyMm: string): string {
  const [y, m] = yyyyMm.split("-").map(Number);
  const d = new Date(y, (m || 1) - 1, 1);
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}
