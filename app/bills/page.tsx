"use client";

import { useCallback, useEffect, useState } from "react";
import type { Bill, Category, ContractType, UserPublic } from "@/lib/types";
import BillCard from "@/components/BillCard";
import { currentMonth, monthLabel } from "@/components/format";

const inputCls =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#0e2a47] focus:outline-none";

export default function BillsPage() {
  const [month, setMonth] = useState(currentMonth());
  const [showAll, setShowAll] = useState(false);
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userFilter, setUserFilter] = useState("me");
  const [users, setUsers] = useState<UserPublic[]>([]);
  const [search, setSearch] = useState("");

  // Add-bill form state
  const [customer, setCustomer] = useState("");
  // Add New Bill only creates parts-sale bills. Service / TDS & VDS /
  // Service Contract are entered via the dashboard standalone entries,
  // not as bills — so there is no Category dropdown here. The category
  // stays a state value (never changed) so the contract-type branch
  // below keeps compiling as-is.
  const [category] = useState<Category>("parts-sale");
  const [billAmount, setBillAmount] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().slice(0, 10));
  const [invoiceNo, setInvoiceNo] = useState("");
  const [contractType, setContractType] = useState<ContractType | "">("new");
  const [partialPayment, setPartialPayment] = useState(false);
  const [profitBelowBudget, setProfitBelowBudget] = useState(false);
  const [achievementBelow50, setAchievementBelow50] = useState(false);
  const [monthly100, setMonthly100] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState(false);

  const loadBills = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const meRes = await fetch("/api/auth/me");
      const me = (await meRes.json().catch(() => null)) as { role?: string } | null;
      const admin = me?.role === "admin";
      setIsAdmin(admin);
      if (admin) {
        const usersRes = await fetch(`/api/admin/users?month=${month}`);
        if (usersRes.ok) {
          const usersData = (await usersRes.json()) as { users?: UserPublic[] };
          setUsers(usersData.users ?? []);
        }
      }
      const params = new URLSearchParams();
      if (admin && userFilter !== "me") params.set("userId", userFilter);
      if (!showAll) params.set("month", month);
      const qs = params.toString();
      const url = qs ? `/api/bills?${qs}` : "/api/bills";
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to load bills");
      const data = await res.json();
      setBills(data.bills ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load bills");
    } finally {
      setLoading(false);
    }
  }, [month, showAll, userFilter]);

  useEffect(() => {
    loadBills();
  }, [loadBills]);

  // Search filters the bills already loaded for the current month/user
  // filter, by customer name or invoice number (partial, case-insensitive).
  const searchQuery = search.trim().toLowerCase();
  const visibleBills =
    searchQuery === ""
      ? bills
      : bills.filter(
          (bill) =>
            bill.customer.toLowerCase().includes(searchQuery) ||
            (bill.invoiceNo ?? "").toLowerCase().includes(searchQuery),
        );

  async function addBill(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    setFormSuccess(false);
    try {
      const res = await fetch("/api/bills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer: customer.trim(),
          category,
          billAmount: Number(billAmount),
          invoiceDate,
          invoiceNo: invoiceNo.trim(),
          contractType: category === "contract" ? contractType || undefined : undefined,
          partialPayment,
          profitBelowBudget,
          achievementBelow50,
          monthly100,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Failed to add bill");
      }
      setCustomer("");
      setBillAmount("");
      setInvoiceNo("");
      setPartialPayment(false);
      setProfitBelowBudget(false);
      setAchievementBelow50(false);
      setMonthly100(false);
      setFormSuccess(true);
      loadBills();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to add bill");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#0e2a47]">Bills</h1>
          <p className="text-sm text-slate-500">
            {showAll ? "All bills" : monthLabel(month)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <label className="text-sm font-medium text-slate-600">
              User
              <select
                className={`${inputCls} w-auto`}
                value={userFilter}
                onChange={(e) => setUserFilter(e.target.value)}
              >
                <option value="me">Me</option>
                <option value="all">All users</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.email})
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="text-sm font-medium text-slate-600">
            Month
            <input
              className={`${inputCls} w-auto`}
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

      <form
        onSubmit={addBill}
        className="rounded-xl bg-white p-5 shadow"
      >
        <h2 className="text-base font-bold text-[#0e2a47]">Add New Bill</h2>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-sm font-medium text-slate-600">
            Customer
            <input
              className={inputCls}
              type="text"
              required
              placeholder="Customer name"
              value={customer}
              onChange={(e) => setCustomer(e.target.value)}
            />
          </label>
          <label className="text-sm font-medium text-slate-600">
            Bill Amount (৳)
            <input
              className={inputCls}
              type="number"
              min={0}
              required
              placeholder="0"
              value={billAmount}
              onChange={(e) => setBillAmount(e.target.value)}
            />
          </label>
          <label className="text-sm font-medium text-slate-600">
            Invoice Date
            <input
              className={inputCls}
              type="date"
              required
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
                <option value="new">New Contract</option>
                <option value="renewal">Renewal</option>
              </select>
            </label>
          )}
        </div>
        <div className="mt-3 grid grid-cols-1 gap-2 text-sm text-slate-700 sm:grid-cols-2 lg:grid-cols-4">
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
        {formError && <p className="mt-3 text-sm font-medium text-red-600">{formError}</p>}
        {formSuccess && (
          <p className="mt-3 text-sm font-medium text-green-700">Bill added successfully.</p>
        )}
        <button
          type="submit"
          disabled={saving}
          className="mt-4 rounded-lg bg-[#0e2a47] px-5 py-2 text-sm font-semibold text-white hover:bg-[#143a61] disabled:opacity-60"
        >
          {saving ? "Adding…" : "Add Bill"}
        </button>
      </form>

      {/* Search — filters the loaded bills by customer name or invoice number. */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          className={`${inputCls} max-w-sm`}
          type="search"
          placeholder="Search by customer name or invoice number"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search bills"
        />
        {searchQuery !== "" && (
          <button
            type="button"
            onClick={() => setSearch("")}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            Clear
          </button>
        )}
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
          No bills found for this period.
        </div>
      ) : visibleBills.length === 0 ? (
        <div className="rounded-xl bg-white p-8 text-center text-slate-500 shadow">
          No bills match your search.
        </div>
      ) : (
        <div className="space-y-4">
          {visibleBills.map((bill) => (
            <BillCard key={bill.id} bill={bill} onChanged={loadBills} showOwner={isAdmin} />
          ))}
        </div>
      )}
    </div>
  );
}
