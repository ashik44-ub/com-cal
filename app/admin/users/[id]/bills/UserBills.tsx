"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { Bill } from "@/lib/types";
import BillCard from "@/components/BillCard";
import { currentMonth, monthLabel } from "@/components/format";

export default function UserBills({ userId }: { userId: string }) {
  const [month, setMonth] = useState(currentMonth());
  const [showAll, setShowAll] = useState(false);
  const [bills, setBills] = useState<Bill[]>([]);
  const [ownerName, setOwnerName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ userId });
      if (!showAll) params.set("month", month);
      const res = await fetch(`/api/bills?${params.toString()}`);
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? "Failed to load bills");
      }
      const data = (await res.json()) as { bills?: Bill[] };
      const list = data.bills ?? [];
      setBills(list);
      if (list.length > 0 && list[0].ownerName) setOwnerName(list[0].ownerName);
      else {
        // No bills: look the name up from the admin user list.
        const usersRes = await fetch(`/api/admin/users?month=${month}`);
        if (usersRes.ok) {
          const usersData = (await usersRes.json()) as {
            users?: { id: string; name: string }[];
          };
          const found = (usersData.users ?? []).find((u) => u.id === userId);
          if (found) setOwnerName(found.name);
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load bills");
    } finally {
      setLoading(false);
    }
  }, [month, showAll, userId]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#0e2a47]">
            Bills{ownerName ? ` — ${ownerName}` : ""}
          </h1>
          <p className="text-sm text-slate-500">
            {showAll ? "All bills" : monthLabel(month)} · admin view
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin"
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            Back to Admin
          </Link>
          <label className="text-sm font-medium text-slate-600">
            Month
            <input
              className="ml-2 w-auto rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-[#0e2a47] focus:outline-none"
              type="month"
              value={month}
              disabled={showAll}
              onChange={(e) => setMonth(e.target.value)}
            />
          </label>
          <button
            className={`rounded-lg px-4 py-2 text-sm font-semibold ${
              showAll
                ? "bg-amber-500 text-white"
                : "border border-slate-300 bg-white text-slate-600 hover:bg-slate-100"
            }`}
            onClick={() => setShowAll((v) => !v)}
          >
            {showAll ? "Showing All" : "All"}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="rounded-xl bg-white p-8 text-center text-slate-500 shadow">
          Loading bills…
        </div>
      ) : error ? (
        <div className="rounded-xl bg-white p-8 text-center shadow">
          <p className="font-semibold text-red-600">Could not load bills.</p>
          <p className="mt-1 text-sm text-slate-500">{error}</p>
        </div>
      ) : bills.length === 0 ? (
        <div className="rounded-xl bg-white p-8 text-center text-slate-500 shadow">
          No bills found for this user in this period.
        </div>
      ) : (
        <div className="space-y-4">
          {bills.map((bill) => (
            <BillCard key={bill.id} bill={bill} onChanged={load} showOwner />
          ))}
        </div>
      )}
    </div>
  );
}
