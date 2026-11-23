"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Summary, UserPublic } from "@/lib/types";
import StatCard from "@/components/StatCard";
import StandaloneCollectionCard from "@/components/StandaloneCollectionCard";
import { CATEGORY_LABELS, currentMonth, fmt, monthLabel } from "@/components/format";

const NAVY = "#0e2a47";
const AMBER = "#f59e0b";
const PIE_COLORS = ["#0e2a47", "#f59e0b", "#38bdf8", "#22c55e"];

/**
 * Why a commission card shows ৳0 (v8). A 0 used to look like the numbers
 * had not loaded — these lines say the true reason, computed from the
 * summary the API returns. Returns null when the card earned something
 * (nothing extra is shown then) or when there was nothing to earn from.
 */
function gateShortfall(summary: Summary): string | null {
  if (summary.gatePassed ?? true) return null;
  const gate = summary.gate ?? 0;
  const remaining = Math.max(0, gate - summary.monthCollected);
  return `Monthly minimum not reached — collected ${fmt(summary.monthCollected)} of ${fmt(gate)} (${fmt(remaining)} more to go)`;
}

function partsReason(summary: Summary): string | null {
  if (summary.byCategory["parts-sale"].earned > 0) return null;
  const gate = gateShortfall(summary);
  if (gate) return gate;
  if (summary.byCategory["parts-sale"].collected <= 0) return null;
  const base = summary.partsBase ?? 0;
  if (base > 0 && base < 115000) {
    return `Parts base ${fmt(base)} — first slab starts at ৳115,000`;
  }
  const late = summary.partsIneligibleLate ?? 0;
  const disqualified = summary.partsIneligibleDisqualified ?? 0;
  if (late > 0 && disqualified > 0) {
    return "Parts postings past the 45-day deadline or on disqualified bills — no commission";
  }
  if (late > 0) return "All parts postings past the 45-day deadline — no commission";
  if (disqualified > 0) return "Parts bills disqualified — no commission";
  return null;
}

function serviceTdsReason(summary: Summary): string | null {
  const earned = summary.byCategory.service.earned + summary.byCategory["tds-vds"].earned;
  if (earned > 0) return null;
  const gate = gateShortfall(summary);
  if (gate) return gate;
  const collected =
    summary.byCategory.service.collected + summary.byCategory["tds-vds"].collected;
  if (collected <= 0) return null;
  const late = summary.serviceTdsIneligibleLate ?? 0;
  const disqualified = summary.serviceTdsIneligibleDisqualified ?? 0;
  if (late > 0 && disqualified > 0) {
    return "Service / TDS & VDS postings past the 45-day deadline or on disqualified bills — no commission";
  }
  if (late > 0) {
    return "All Service / TDS & VDS postings past the 45-day deadline — no commission";
  }
  if (disqualified > 0) return "Service / TDS & VDS bills disqualified — no commission";
  if ((summary.serviceTdsSmallEligible ?? 0) > 0) {
    return "Postings of ৳1,000 or less earn no commission";
  }
  return null;
}

function earningReason(summary: Summary): string | null {
  if (summary.monthEarned > 0) return null;
  return gateShortfall(summary);
}

export default function Dashboard() {
  const router = useRouter();
  const [month] = useState(currentMonth());
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bannerError, setBannerError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userFilter, setUserFilter] = useState("me");
  const [users, setUsers] = useState<UserPublic[]>([]);
  // Mirrors of state the async load() needs without stale closures.
  const summaryRef = useRef<Summary | null>(null);
  const isAdminRef = useRef(false);
  // Last time a summary load started (v14) — throttles the
  // visibility/focus refetch below so alt-tabbing does not hammer the API.
  const lastLoadAtRef = useRef(0);

  // Fetch the summary with a fresh (never cached) response.
  const fetchSummary = useCallback(
    async (admin: boolean, filter: string): Promise<Summary> => {
      const query = admin && filter !== "me" ? `&userId=${filter}` : "";
      const res = await fetch(`/api/summary?month=${month}${query}`, { cache: "no-store" });
      if (res.status === 401 || res.status === 403) {
        throw new Error("__unauthorized__");
      }
      if (!res.ok) {
        // Surface the sanitised server reason (e.g. MongoDB unreachable)
        // instead of only "Failed to load summary".
        let message = "Failed to load summary";
        try {
          const body: unknown = await res.json();
          if (
            typeof body === "object" &&
            body !== null &&
            typeof (body as Record<string, unknown>).error === "string"
          ) {
            message = (body as Record<string, unknown>).error as string;
          }
        } catch {
          // Keep the generic message if the error body is not JSON.
        }
        throw new Error(message);
      }
      return (await res.json()) as Summary;
    },
    [month],
  );

  const load = useCallback(async () => {
    lastLoadAtRef.current = Date.now();
    // Only the very first load blanks the dashboard. A refetch (after
    // adding a posting/entry, or a manual Refresh) keeps the last numbers
    // visible and shows a small "Updating…" instead.
    const hadSummary = summaryRef.current !== null;
    if (hadSummary) setRefreshing(true);
    else setLoading(true);
    setBannerError(null);
    setError(null);
    // Start the summary fetch immediately, in parallel with auth — the
    // old code waited for /api/auth/me and /api/admin/users first, so a
    // slow round trip left the dashboard blank for seconds.
    const summaryPromise = fetchSummary(isAdminRef.current, userFilter);
    // Keep an unhandled rejection from escaping if auth fails first.
    summaryPromise.catch(() => {});
    try {
      const meRes = await fetch("/api/auth/me");
      if (meRes.status === 401 || meRes.status === 403) {
        router.push("/login");
        return;
      }
      const me = (await meRes.json()) as { role?: string };
      const admin = me.role === "admin";
      setIsAdmin(admin);
      isAdminRef.current = admin;
      let data: Summary;
      try {
        data = await summaryPromise;
      } catch (e) {
        if (e instanceof Error && e.message === "__unauthorized__") {
          router.push("/login");
          return;
        }
        throw e;
      }
      // The summary fetch above started before we knew the user is an
      // admin, so when a non-"me" filter is active it used the wrong scope
      // — refetch once with the right one.
      if (admin && userFilter !== "me") {
        data = await fetchSummary(admin, userFilter);
      }
      summaryRef.current = data;
      setSummary(data);
      if (admin) {
        // The users list only feeds the "Show data for" dropdown — load it
        // without blocking the dashboard numbers.
        fetch(`/api/admin/users?month=${month}`)
          .then((r) => (r.ok ? r.json() : null))
          .then((d) => {
            if (d && Array.isArray(d.users)) setUsers(d.users as UserPublic[]);
          })
          .catch(() => {});
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to load summary";
      if (summaryRef.current) {
        // Keep the old numbers visible; show the failure as a banner.
        setBannerError(message);
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [month, router, userFilter, fetchSummary]);

  useEffect(() => {
    load();
  }, [load]);

  // v14: refetch when the tab becomes visible again. A parts collection
  // added on the Bills page (or in another tab) must land in the
  // "Parts Sales Collection" card without a manual Refresh or reload.
  useEffect(() => {
    const refetchIfStale = () => {
      if (document.hidden) return;
      if (Date.now() - lastLoadAtRef.current < 5000) return;
      load();
    };
    document.addEventListener("visibilitychange", refetchIfStale);
    window.addEventListener("focus", refetchIfStale);
    return () => {
      document.removeEventListener("visibilitychange", refetchIfStale);
      window.removeEventListener("focus", refetchIfStale);
    };
  }, [load]);

  if (loading && !summary) {
    return (
      <div className="rounded-xl bg-white p-8 text-center text-slate-500 shadow">
        Loading dashboard…
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="rounded-xl bg-white p-8 text-center shadow">
        <p className="font-semibold text-red-600">Could not load the dashboard.</p>
        <p className="mt-1 text-sm text-slate-500">{error ?? "Unknown error"}</p>
        <button
          type="button"
          onClick={load}
          className="mt-4 rounded-lg bg-[#0e2a47] px-4 py-2 text-sm font-medium text-white"
        >
          Try again
        </button>
      </div>
    );
  }

  const donutData = (
    Object.keys(summary.byCategory) as (keyof typeof summary.byCategory)[]
  ).map((cat) => ({
    name: CATEGORY_LABELS[cat],
    collected: summary.byCategory[cat].collected,
    earned: summary.byCategory[cat].earned,
  }));

  const serviceTdsEarned =
    summary.byCategory.service.earned + summary.byCategory["tds-vds"].earned;
  const serviceTdsCollected =
    summary.byCategory.service.collected + summary.byCategory["tds-vds"].collected;
  const targetPercent = summary.targetPercent ?? 0;
  const targetBarWidth = Math.min(100, Math.max(0, targetPercent));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#0e2a47]">Dashboard</h1>
          <p className="text-sm text-slate-500">
            {monthLabel(summary.month)}
            {refreshing ? <span className="ml-2 text-amber-600">Updating…</span> : null}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={load}
            disabled={refreshing || loading}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm disabled:opacity-50"
          >
            {refreshing ? "Updating…" : "Refresh"}
          </button>
          {isAdmin && (
            <label className="text-sm font-medium text-slate-600">
              Show data for
              <select
                className="ml-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-[#0e2a47] focus:outline-none"
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
        </div>
      </div>

      {bannerError && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800 shadow">
          <span>Could not refresh the dashboard — showing the last loaded numbers. {bannerError}</span>
          <button
            type="button"
            onClick={load}
            className="rounded-lg bg-amber-600 px-3 py-1 text-sm font-medium text-white"
          >
            Retry
          </button>
        </div>
      )}

      {summary.storage === "mongodb" && (
        <div className="rounded-xl border border-green-300 bg-green-50 px-4 py-3 text-sm font-medium text-green-800 shadow">
          MongoDB connected — entries are saved to the database
        </div>
      )}

      {summary.dbStatus?.error && (
        <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm font-medium text-red-800 shadow">
          MongoDB connection failed — {summary.dbStatus.error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Total Earning — This Month"
          value={fmt(summary.monthEarned)}
          sub={monthLabel(summary.month)}
          note={earningReason(summary) ?? undefined}
          dark
        />
        <StatCard
          label="Parts Sales Collection — This Month"
          value={fmt(summary.byCategory["parts-sale"].collected)}
          sub={monthLabel(summary.month)}
        />
        <StatCard
          label="Parts Commission — This Month"
          value={fmt(summary.byCategory["parts-sale"].earned)}
          sub={`Parts Sale collected ${fmt(summary.byCategory["parts-sale"].collected)}`}
          note={partsReason(summary) ?? undefined}
        />
        <StatCard
          label="Service & TDS/VDS Commission — This Month"
          value={fmt(serviceTdsEarned)}
          sub={`Service + TDS/VDS collected ${fmt(serviceTdsCollected)}`}
          note={serviceTdsReason(summary) ?? undefined}
        />
        <StatCard
          label="Total TDS VDS Service Collection"
          value={fmt(serviceTdsCollected)}
          sub={monthLabel(summary.month)}
        />
        <StatCard
          label="Total Parts Sales Amount"
          value={fmt(summary.pendingAmount)}
          sub={`${summary.pendingCount} pending bill${summary.pendingCount === 1 ? "" : "s"}`}
        />
        <StatCard
          label="Total Bills"
          value={String(summary.totalBills)}
          sub="All bills on record"
        />
      </div>

      <div className="rounded-xl bg-white p-5 shadow">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-base font-bold text-[#0e2a47]">Sales Target — This Month</h2>
          <span className="text-2xl font-bold text-[#0e2a47]">
            {targetPercent.toFixed(1)}%
          </span>
        </div>
        <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-amber-500"
            style={{ width: `${targetBarWidth}%` }}
          />
        </div>
        <p className="mt-2 text-sm text-slate-600">
          Parts Sale collected {fmt(summary.byCategory["parts-sale"].collected)} of{" "}
          {fmt(summary.monthlyTarget ?? 0)} target
        </p>
      </div>

      <StandaloneCollectionCard
        month={month}
        userFilter={userFilter}
        isAdmin={isAdmin}
        onChanged={load}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl bg-white p-5 shadow">
          <h2 className="text-base font-bold text-[#0e2a47]">
            Collection vs Earning — Last 6 Months
          </h2>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={summary.series}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v: number) => fmt(v)} width={80} />
                <Tooltip formatter={(v) => fmt(Number(v ?? 0))} />
                <Legend />
                <Bar dataKey="collected" name="Collected" fill={NAVY} radius={[4, 4, 0, 0]} />
                <Bar dataKey="earned" name="Earned" fill={AMBER} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl bg-white p-5 shadow">
          <h2 className="text-base font-bold text-[#0e2a47]">
            Collection Trend — Last 6 Months
          </h2>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={summary.series}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v: number) => fmt(v)} width={80} />
                <Tooltip formatter={(v) => fmt(Number(v ?? 0))} />
                <Area
                  type="monotone"
                  dataKey="collected"
                  name="Collected"
                  stroke={NAVY}
                  fill={NAVY}
                  fillOpacity={0.15}
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="rounded-xl bg-white p-5 shadow">
        <h2 className="text-base font-bold text-[#0e2a47]">
          Collection by Category — {monthLabel(summary.month)}
        </h2>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={donutData}
                  dataKey="collected"
                  nameKey="name"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                >
                  {donutData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => fmt(Number(v ?? 0))} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="space-y-3 self-center">
            {donutData.map((row, i) => (
              <li key={row.name} className="flex items-center justify-between gap-3 text-sm">
                <span className="flex items-center gap-2 font-medium text-slate-700">
                  <span
                    className="inline-block h-3 w-3 rounded-full"
                    style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                  />
                  {row.name}
                </span>
                <span className="text-right text-slate-600">
                  Collected <span className="font-semibold text-[#0e2a47]">{fmt(row.collected)}</span>
                  {" · "}
                  Earned <span className="font-semibold text-amber-600">{fmt(row.earned)}</span>
                </span>
              </li>
            ))}
            {donutData.every((d) => d.collected === 0 && d.earned === 0) && (
              <li className="text-sm text-slate-400">No collections this month yet.</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
