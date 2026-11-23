"use client";

import { useCallback, useEffect, useState } from "react";
import { fmt, formatDate } from "@/components/format";
import { contractCommission } from "@/lib/commission";
import type { ContractType } from "@/lib/types";
import type { StandaloneKind } from "@/models/CollectionEntry";

interface Entry {
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
}

const inputCls =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#0e2a47] focus:outline-none";

/**
 * Quick entry for Service / TDS & VDS collections and CSA contracts that
 * are NOT tied to a bill. Service / TDS & VDS count in the dashboard
 * totals together with bill postings; a CSA earns the contract commission
 * (new ৳500 / renewal ৳1,000) and counts in contract earned and Earning,
 * but never in Collection totals, the gate, the parts base or the target %.
 */
export default function StandaloneCollectionCard({
  month,
  userFilter,
  isAdmin,
  onChanged,
}: {
  month: string;
  userFilter: string;
  isAdmin: boolean;
  onChanged: () => void;
}) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [kind, setKind] = useState<StandaloneKind>("service");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [invoiceNo, setInvoiceNo] = useState("");
  const [contractType, setContractType] = useState<ContractType>("new");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const query = userFilter !== "me" ? `&userId=${userFilter}` : "";
      const res = await fetch(`/api/collections?month=${month}${query}`);
      if (!res.ok) return;
      const data = (await res.json()) as { entries?: Entry[] };
      setEntries(data.entries ?? []);
    } catch {
      // The dashboard itself shows any load error; keep this card quiet.
    }
  }, [month, userFilter]);

  useEffect(() => {
    load();
  }, [load]);

  async function addEntry(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          kind === "csa"
            ? {
                kind,
                date,
                note: note.trim(),
                customerName: customerName.trim(),
                invoiceNo: invoiceNo.trim(),
                contractType,
              }
            : {
                kind,
                amount: Number(amount),
                date,
                note: note.trim(),
                customerName: customerName.trim(),
                invoiceNo: invoiceNo.trim(),
              },
        ),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? "Failed to add collection");
      }
      setAmount("");
      setNote("");
      setCustomerName("");
      setInvoiceNo("");
      load();
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add collection");
    } finally {
      setSaving(false);
    }
  }

  async function deleteEntry(id: string) {
    setError(null);
    try {
      const res = await fetch(`/api/collections/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete entry");
      load();
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete entry");
    }
  }

  return (
    <div className="rounded-xl bg-white p-5 shadow">
      <h2 className="text-base font-bold text-[#0e2a47]">
        Add Service / TDS &amp; VDS Collection
      </h2>
      <p className="mt-1 text-sm text-slate-500">
        Quick entry not tied to a bill — Service / TDS &amp; VDS counts in
        this month&apos;s collection and commission totals. A CSA earns the
        contract commission (New ৳500 / Renewal ৳1,000) and counts in Earning,
        but not in Collection totals.
      </p>

      <form onSubmit={addEntry} className="mt-4 flex flex-wrap items-end gap-2">
        <label className="text-sm font-medium text-slate-600">
          Type
          <select
            className={inputCls}
            value={kind}
            onChange={(e) => setKind(e.target.value as StandaloneKind)}
          >
            <option value="service">Service</option>
            <option value="tds-vds">TDS &amp; VDS</option>
            <option value="csa">CSA</option>
          </select>
        </label>
        {kind === "csa" ? (
          <label className="text-sm font-medium text-slate-600">
            Contract Type
            <select
              className={inputCls}
              value={contractType}
              onChange={(e) => setContractType(e.target.value as ContractType)}
            >
              <option value="new">New (৳500)</option>
              <option value="renewal">Renewal (৳1,000)</option>
            </select>
          </label>
        ) : (
          <label className="text-sm font-medium text-slate-600">
            Amount (৳)
            <input
              className={inputCls}
              type="number"
              min={0}
              required
              placeholder="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </label>
        )}
        <label className="text-sm font-medium text-slate-600">
          Customer Name
          <input
            className={inputCls}
            type="text"
            placeholder="Customer name"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
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
        <label className="text-sm font-medium text-slate-600">
          Date
          <input
            className={inputCls}
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
        <label className="text-sm font-medium text-slate-600">
          Note (optional)
          <input
            className={inputCls}
            type="text"
            placeholder="Note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </label>
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-[#0e2a47] px-5 py-2 text-sm font-semibold text-white hover:bg-[#143a61] disabled:opacity-60"
        >
          {saving ? "Adding…" : "Add"}
        </button>
      </form>

      {error && <p className="mt-3 text-sm font-medium text-red-600">{error}</p>}

      {entries.length > 0 && (
        <ul className="mt-4 space-y-2">
          {entries.map((entry) => (
            <li
              key={entry.id}
              className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 px-3 py-2 text-sm"
            >
              <span className="flex flex-wrap items-center gap-2 text-slate-600">
                {formatDate(entry.date)}
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                    entry.kind === "tds-vds"
                      ? "bg-violet-100 text-violet-700"
                      : entry.kind === "csa"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-sky-100 text-sky-700"
                  }`}
                >
                  {entry.kind === "tds-vds"
                    ? "TDS & VDS"
                    : entry.kind === "csa"
                      ? `CSA · ${entry.contractType === "renewal" ? "Renewal" : "New"}`
                      : "Service"}
                </span>
                {entry.customerName ? (
                  <span className="font-medium text-slate-700">{entry.customerName}</span>
                ) : null}
                {entry.invoiceNo ? (
                  <span className="text-slate-500">Inv #{entry.invoiceNo}</span>
                ) : null}
                {entry.note ? <span className="text-slate-500">{entry.note}</span> : null}
                {isAdmin && entry.ownerName ? (
                  <span className="text-xs text-slate-400">· {entry.ownerName}</span>
                ) : null}
              </span>
              <span className="flex items-center gap-2">
                {entry.kind === "csa" ? (
                  <span className="text-right">
                    <span className="font-semibold text-[#0e2a47]">
                      {fmt(contractCommission(entry.contractType))}
                    </span>
                    <span className="block text-[11px] font-normal text-slate-400">
                      commission
                    </span>
                  </span>
                ) : (
                  <span className="font-semibold text-[#0e2a47]">{fmt(entry.amount)}</span>
                )}
                <button
                  className="rounded px-2 py-0.5 text-xs font-medium text-red-600 hover:bg-red-50"
                  onClick={() => deleteEntry(entry.id)}
                >
                  Delete
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
