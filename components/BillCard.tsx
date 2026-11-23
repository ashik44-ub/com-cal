"use client";

import { useState } from "react";
import type { Bill, Category, ContractType } from "@/lib/types";
import {
  AREA_LABELS,
  CATEGORY_LABELS,
  CATEGORY_OPTIONS,
  daysBetween,
  daysSince,
  fmt,
  formatDate,
} from "@/components/format";

type BillCardProps = {
  bill: Bill;
  onChanged: () => void;
  /** Show the bill owner's name (admin view). */
  showOwner?: boolean;
};

const STATUS_STYLES: Record<Bill["status"], { label: string; cls: string }> = {
  pending: { label: "Pending", cls: "bg-red-100 text-red-700" },
  partial: { label: "Partially Collected", cls: "bg-amber-100 text-amber-800" },
  collected: { label: "Collected", cls: "bg-green-100 text-green-700" },
};

const inputCls =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#0e2a47] focus:outline-none";
const btnPrimary =
  "rounded-lg bg-[#0e2a47] px-4 py-2 text-sm font-semibold text-white hover:bg-[#143a61]";
const btnAmber =
  "rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600";
const btnGhost =
  "rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100";

export default function BillCard({ bill, onChanged, showOwner = false }: BillCardProps) {
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Edit form state
  const [customer, setCustomer] = useState(bill.customer);
  const [category, setCategory] = useState<Category>(bill.category);
  const [billAmount, setBillAmount] = useState(String(bill.billAmount));
  const [invoiceDate, setInvoiceDate] = useState(bill.invoiceDate.slice(0, 10));
  const [invoiceNo, setInvoiceNo] = useState(bill.invoiceNo ?? "");
  const [contractType, setContractType] = useState<ContractType | "">(bill.contractType ?? "");
  const [partialPayment, setPartialPayment] = useState(bill.partialPayment);
  const [profitBelowBudget, setProfitBelowBudget] = useState(bill.profitBelowBudget);
  const [achievementBelow50, setAchievementBelow50] = useState(bill.achievementBelow50);
  const [monthly100, setMonthly100] = useState(bill.monthly100);

  // Add posting state (bill postings are always a Collection — there is
  // no Type choice on the bill card; TDS & VDS is entered from the
  // dashboard standalone card instead).
  const [postingDate, setPostingDate] = useState(new Date().toISOString().slice(0, 10));
  const [postingAmount, setPostingAmount] = useState("");

  // Collection breakdown (cash vs TDS & VDS challan) for the summary line.
  const cashCollected = bill.postings
    .filter((p) => p.type !== "tds-vds")
    .reduce((sum, p) => sum + p.amount, 0);
  const tdsVdsCollected = bill.postings
    .filter((p) => p.type === "tds-vds")
    .reduce((sum, p) => sum + p.amount, 0);

  const status = STATUS_STYLES[bill.status];

  async function saveEdit() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/bills/${bill.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer,
          category,
          billAmount: Number(billAmount),
          invoiceDate,
          invoiceNo: invoiceNo.trim(),
          contractType: category === "contract" ? contractType || null : null,
          partialPayment,
          profitBelowBudget,
          achievementBelow50,
          monthly100,
        }),
      });
      if (!res.ok) throw new Error("Failed to update bill");
      setEditing(false);
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update bill");
    } finally {
      setSaving(false);
    }
  }

  async function deleteBill() {
    setSaving(true);
    try {
      const res = await fetch(`/api/bills/${bill.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete bill");
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete bill");
    } finally {
      setSaving(false);
      setConfirmDelete(false);
    }
  }

  async function addPosting() {
    if (!postingDate || !postingAmount) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/bills/${bill.id}/postings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: postingDate, amount: Number(postingAmount), type: "collection" }),
      });
      if (!res.ok) throw new Error("Failed to add posting");
      setPostingAmount("");
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add posting");
    } finally {
      setSaving(false);
    }
  }

  async function deletePosting(postingId: string) {
    setSaving(true);
    try {
      const res = await fetch(`/api/bills/${bill.id}/postings/${postingId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete posting");
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete posting");
    } finally {
      setSaving(false);
    }
  }

  return (
    <article className="rounded-xl bg-white p-5 shadow">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-lg font-bold text-[#0e2a47]">{bill.customer}</h3>
          <p className="text-xs text-slate-400">
            Invoice {formatDate(bill.invoiceDate)}
            {bill.invoiceNo ? ` · #${bill.invoiceNo}` : ""} · {daysSince(bill.invoiceDate)} days ago
            {showOwner && bill.ownerName ? ` · Owner: ${bill.ownerName}` : ""}
            {bill.category === "parts-sale" && bill.area
              ? ` · Area: ${AREA_LABELS[bill.area]}`
              : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-[#0e2a47]/10 px-3 py-1 text-xs font-semibold text-[#0e2a47]">
            {CATEGORY_LABELS[bill.category]}
          </span>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${status.cls}`}>
            {status.label}
          </span>
        </div>
      </div>

      {editing ? (
        <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="text-sm font-medium text-slate-600">
              Customer
              <input className={inputCls} value={customer} onChange={(e) => setCustomer(e.target.value)} />
            </label>
            <label className="text-sm font-medium text-slate-600">
              Category
              <select
                className={inputCls}
                value={category}
                onChange={(e) => setCategory(e.target.value as Category)}
              >
                {CATEGORY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-medium text-slate-600">
              Bill Amount (৳)
              <input
                className={inputCls}
                type="number"
                min={0}
                value={billAmount}
                onChange={(e) => setBillAmount(e.target.value)}
              />
            </label>
            <label className="text-sm font-medium text-slate-600">
              Invoice Date
              <input
                className={inputCls}
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
              />
            </label>
            <label className="text-sm font-medium text-slate-600">
              Invoice Number
              <input
                className={inputCls}
                type="text"
                placeholder="Invoice number"
                value={invoiceNo}
                onChange={(e) => setInvoiceNo(e.target.value)}
              />
            </label>
            {category === "contract" && (
              <label className="text-sm font-medium text-slate-600">
                Contract Type
                <select
                  className={inputCls}
                  value={contractType}
                  onChange={(e) => setContractType(e.target.value as ContractType)}
                >
                  <option value="">Select type</option>
                  <option value="new">New Contract</option>
                  <option value="renewal">Renewal</option>
                </select>
              </label>
            )}
          </div>
          <div className="grid grid-cols-1 gap-2 text-sm text-slate-700 sm:grid-cols-2">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={partialPayment} onChange={(e) => setPartialPayment(e.target.checked)} />
              Partial payment
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={profitBelowBudget} onChange={(e) => setProfitBelowBudget(e.target.checked)} />
              Profit below SnS budget
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={achievementBelow50} onChange={(e) => setAchievementBelow50(e.target.checked)} />
              Monthly achievement below 50%
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={monthly100} onChange={(e) => setMonthly100(e.target.checked)} />
              Monthly target 100% achieved
            </label>
          </div>
          <div className="flex gap-2">
            <button className={btnPrimary} onClick={saveEdit} disabled={saving}>
              {saving ? "Saving…" : "Save Changes"}
            </button>
            <button className={btnGhost} onClick={() => setEditing(false)}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-3 gap-3 text-center">
            <div className="rounded-lg bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Bill Amount</p>
              <p className="mt-1 font-bold text-[#0e2a47]">{fmt(bill.billAmount)}</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Collected</p>
              <p className="mt-1 font-bold text-green-700">{fmt(bill.collectedTotal)}</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Remaining</p>
              <p className="mt-1 font-bold text-red-600">{fmt(bill.remaining)}</p>
            </div>
          </div>

          <div className="mt-4">
            <div className="flex justify-between text-xs font-medium text-slate-500">
              <span>Collected {bill.collectedPercent}%</span>
              <span>{fmt(bill.collectedTotal)} / {fmt(bill.billAmount)}</span>
            </div>
            <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-amber-500"
                style={{ width: `${Math.min(100, Math.max(0, bill.collectedPercent))}%` }}
              />
            </div>
          </div>

          <div className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-sm">
            {bill.status === "collected" ? (
              <span className="font-semibold text-green-700">
                Commission earned {fmt(bill.commission)}
              </span>
            ) : (
              <span className="text-slate-600">
                Potential commission{" "}
                <span className="font-semibold text-[#0e2a47]">{fmt(bill.projectedCommission)}</span>
              </span>
            )}
            {bill.commissionReason && (
              <p
                className={`mt-1 text-xs ${
                  bill.commission === 0 && bill.status === "collected"
                    ? "font-medium text-red-600"
                    : "text-slate-500"
                }`}
              >
                {bill.commissionReason}
              </p>
            )}
            {bill.commissionWarning && (
              <p className="mt-1 text-xs font-medium text-amber-700">{bill.commissionWarning}</p>
            )}
          </div>

          {bill.postings.length > 0 && (
            <>
              <ul className="mt-4 space-y-2">
                {bill.postings.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 px-3 py-2 text-sm"
                  >
                  <span className="flex items-center gap-2 text-slate-600">
                    {formatDate(p.date)} · {daysBetween(bill.invoiceDate, p.date)} days since invoice
                    {p.type === "tds-vds" ? (
                      <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-semibold text-violet-700">
                        TDS &amp; VDS
                      </span>
                    ) : (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                        Collection
                      </span>
                    )}
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="font-semibold text-[#0e2a47]">{fmt(p.amount)}</span>
                    <button
                      className="rounded px-2 py-0.5 text-xs font-medium text-red-600 hover:bg-red-50"
                      onClick={() => deletePosting(p.id)}
                      disabled={saving}
                    >
                      Delete
                    </button>
                  </span>
                </li>
              ))}
            </ul>
              <p className="mt-2 text-sm text-slate-600">
                {[
                  cashCollected > 0 ? `Cash collected ${fmt(cashCollected)}` : null,
                  tdsVdsCollected > 0 ? `TDS & VDS ${fmt(tdsVdsCollected)}` : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </>
          )}

          <div className="mt-4 flex flex-wrap items-end gap-2 border-t border-slate-100 pt-4">
            <label className="text-sm font-medium text-slate-600">
              Posting Date
              <input
                className={inputCls}
                type="date"
                value={postingDate}
                onChange={(e) => setPostingDate(e.target.value)}
              />
            </label>
            <label className="text-sm font-medium text-slate-600">
              Amount (৳)
              <input
                className={inputCls}
                type="number"
                min={0}
                placeholder="0"
                value={postingAmount}
                onChange={(e) => setPostingAmount(e.target.value)}
              />
            </label>
            <button className={btnAmber} onClick={addPosting} disabled={saving || !postingAmount}>
              Add Posting
            </button>
          </div>

          <div className="mt-4 flex gap-2">
            <button className={btnGhost} onClick={() => setEditing(true)}>
              Edit Bill
            </button>
            {confirmDelete ? (
              <>
                <button
                  className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-700"
                  onClick={deleteBill}
                  disabled={saving}
                >
                  Confirm Delete
                </button>
                <button className={btnGhost} onClick={() => setConfirmDelete(false)}>
                  Cancel
                </button>
              </>
            ) : (
              <button
                className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
                onClick={() => setConfirmDelete(true)}
              >
                Delete Bill
              </button>
            )}
          </div>
        </>
      )}

      {error && <p className="mt-3 text-sm font-medium text-red-600">{error}</p>}
    </article>
  );
}
