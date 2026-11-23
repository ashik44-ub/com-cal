"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { UserPublic } from "@/lib/types";
import { AREA_OPTIONS, currentMonth, fmt, formatDate, monthLabel } from "@/components/format";

const inputCls =
  "w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm focus:border-[#0e2a47] focus:outline-none";
// Compact controls for the desktop table (the table must fit the page
// width with no horizontal scrollbar).
const compactSelectCls =
  "rounded-lg border border-slate-300 bg-white px-1.5 py-1 text-xs focus:border-[#0e2a47] focus:outline-none";
const compactBtnCls =
  "rounded-lg bg-[#0e2a47] px-2 py-1 text-xs font-semibold text-white hover:bg-[#143a5e] disabled:opacity-60";
const compactGhostCls =
  "rounded-lg border border-slate-300 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-60";

type AdminUserCardProps = {
  u: UserPublic;
  busy: boolean;
  targetValue: string;
  onTargetChange: (value: string) => void;
  onSaveTarget: () => void;
  onPatch: (patch: Record<string, unknown>) => void;
  resetOpen: boolean;
  onToggleReset: () => void;
  resetPassword: string;
  onResetPasswordChange: (value: string) => void;
  onResetPassword: () => void;
  deleteOpen: boolean;
  onToggleDelete: () => void;
  onDelete: () => void;
};

/** One user as a stacked card (narrow screens). Same controls as the
 *  desktop table row, so nothing is lost when the table cannot fit. */
function AdminUserCard({
  u,
  busy,
  targetValue,
  onTargetChange,
  onSaveTarget,
  onPatch,
  resetOpen,
  onToggleReset,
  resetPassword,
  onResetPasswordChange,
  onResetPassword,
  deleteOpen,
  onToggleDelete,
  onDelete,
}: AdminUserCardProps) {
  return (
    <div className="rounded-xl bg-white p-4 shadow">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-semibold text-[#0e2a47]">{u.name}</p>
          <p className="truncate text-xs text-slate-500">{u.email || "Admin account"}</p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
            u.disabled ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
          }`}
        >
          {u.disabled ? "Disabled" : "Active"}
        </span>
      </div>

      <dl className="mt-3 space-y-2.5 text-sm">
        <div className="flex items-center justify-between gap-2">
          <dt className="text-slate-500">Role</dt>
          <dd>
            <select
              className={compactSelectCls}
              value={u.role}
              disabled={busy || u.id === "admin"}
              onChange={(e) => onPatch({ role: e.target.value })}
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </dd>
        </div>
        <div className="flex items-center justify-between gap-2">
          <dt className="text-slate-500">Area</dt>
          <dd>
            <select
              className={compactSelectCls}
              value={u.area ?? ""}
              disabled={busy}
              title="Bills inherit this area. Changing it updates the user's existing bills too."
              onChange={(e) =>
                onPatch({ area: e.target.value === "" ? null : e.target.value })
              }
            >
              <option value="">Not set</option>
              {AREA_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </dd>
        </div>
        <div className="flex items-center justify-between gap-2">
          <dt className="text-slate-500">Monthly Target (৳)</dt>
          <dd className="flex items-center gap-1">
            <input
              className="w-20 rounded-lg border border-slate-300 px-2 py-1 text-sm focus:border-[#0e2a47] focus:outline-none"
              type="number"
              min={1}
              value={targetValue}
              onChange={(e) => onTargetChange(e.target.value)}
            />
            <button type="button" className={compactBtnCls} disabled={busy} onClick={onSaveTarget}>
              Save
            </button>
          </dd>
        </div>
        <div className="flex items-center justify-between gap-2">
          <dt className="text-slate-500">Parts Collected</dt>
          <dd className="font-medium text-[#0e2a47]">{fmt(u.partsCollected ?? 0)}</dd>
        </div>
        <div className="flex items-center justify-between gap-2">
          <dt className="text-slate-500">Achievement</dt>
          <dd className="font-semibold text-amber-600">
            {(u.achievementPercent ?? 0).toFixed(1)}%
          </dd>
        </div>
        <div className="flex items-center justify-between gap-2">
          <dt className="text-slate-500">Commission</dt>
          <dd className="font-medium text-[#0e2a47]">{fmt(u.commission ?? 0)}</dd>
        </div>
        <div className="flex items-center justify-between gap-2">
          <dt className="text-slate-500">Created</dt>
          <dd className="text-slate-600">{u.createdAt ? formatDate(u.createdAt) : "—"}</dd>
        </div>
      </dl>

      <div className="mt-3 flex flex-wrap gap-1.5">
        <Link
          href={`/admin/users/${u.id}/bills`}
          className="rounded-lg border border-slate-300 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
        >
          View bills
        </Link>
        {u.id !== "admin" && (
          <button
            type="button"
            className={compactGhostCls}
            disabled={busy}
            onClick={() => onPatch({ disabled: !u.disabled })}
          >
            {u.disabled ? "Enable" : "Disable"}
          </button>
        )}
        {u.id !== "admin" && (
          <button
            type="button"
            className={compactGhostCls}
            disabled={busy}
            onClick={onToggleReset}
          >
            Reset password
          </button>
        )}
        {u.id !== "admin" &&
          (deleteOpen ? (
            <>
              <button
                type="button"
                className="rounded-lg bg-red-600 px-2 py-1 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                disabled={busy}
                onClick={onDelete}
              >
                Confirm delete
              </button>
              <button type="button" className={compactGhostCls} onClick={onToggleDelete}>
                Cancel
              </button>
            </>
          ) : (
            <button
              type="button"
              className="rounded-lg border border-red-200 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
              disabled={busy}
              onClick={onToggleDelete}
            >
              Delete
            </button>
          ))}
      </div>

      {resetOpen && (
        <div className="mt-2 space-y-1.5 rounded-lg bg-slate-50 p-2">
          <input
            className={inputCls}
            type="password"
            autoComplete="new-password"
            placeholder="New password (min 6)"
            value={resetPassword}
            onChange={(e) => onResetPasswordChange(e.target.value)}
          />
          <button
            type="button"
            className="w-full rounded-lg bg-[#0e2a47] px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-[#143a5e] disabled:opacity-60"
            disabled={busy}
            onClick={onResetPassword}
          >
            Save new password
          </button>
        </div>
      )}
    </div>
  );
}

export default function AdminPage() {
  const [month] = useState(currentMonth());
  const [users, setUsers] = useState<UserPublic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Per-user editing state
  const [targets, setTargets] = useState<Record<string, string>>({});
  const [resetFor, setResetFor] = useState<string | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [resetShown, setResetShown] = useState<{ email: string; password: string } | null>(null);
  const [deleteFor, setDeleteFor] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users?month=${month}`);
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? "Failed to load users");
      }
      const data = (await res.json()) as { users?: UserPublic[] };
      setUsers(data.users ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => {
    load();
  }, [load]);

  async function patchUser(id: string, patch: Record<string, unknown>) {
    setBusy(true);
    setNotice(null);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = (await res.json().catch(() => null)) as {
        error?: string;
        billsUpdated?: number;
      } | null;
      if (!res.ok) throw new Error(data?.error ?? "Failed to update user");
      setNotice(
        data?.billsUpdated
          ? `User updated. ${data.billsUpdated} bill(s) updated to the new area.`
          : "User updated.",
      );
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update user");
    } finally {
      setBusy(false);
    }
  }

  async function saveTarget(id: string) {
    const value = Number(targets[id]);
    if (!Number.isFinite(value) || value <= 0) {
      setError("Monthly target must be greater than 0.");
      return;
    }
    await patchUser(id, { monthlyTarget: value });
  }

  async function resetUserPassword(id: string) {
    if (resetPassword.length < 6) {
      setError("New password must be at least 6 characters.");
      return;
    }
    setBusy(true);
    setNotice(null);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${id}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword: resetPassword }),
      });
      const data = (await res.json().catch(() => null)) as {
        error?: string;
        password?: string;
      } | null;
      if (!res.ok) throw new Error(data?.error ?? "Failed to reset password");
      const user = users.find((u) => u.id === id);
      setResetShown({ email: user?.email ?? "", password: data?.password ?? resetPassword });
      setResetFor(null);
      setResetPassword("");
      setNotice("Password reset. Show it to the user once — it will not be shown again.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to reset password");
    } finally {
      setBusy(false);
    }
  }

  async function deleteUser(id: string) {
    setBusy(true);
    setNotice(null);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
      const data = (await res.json().catch(() => null)) as {
        error?: string;
        billsReassigned?: number;
      } | null;
      if (!res.ok) throw new Error(data?.error ?? "Failed to delete user");
      setNotice(
        `User deleted. ${data?.billsReassigned ?? 0} bill(s) reassigned to the admin.`,
      );
      setDeleteFor(null);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete user");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-xl bg-white p-8 text-center text-slate-500 shadow">
        Loading users…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0e2a47]">Admin</h1>
        <p className="text-sm text-slate-500">
          Manage all users — {monthLabel(month)}
        </p>
      </div>

      {notice && (
        <p className="rounded-xl border border-green-300 bg-green-50 px-4 py-3 text-sm font-medium text-green-800 shadow">
          {notice}
        </p>
      )}
      {error && (
        <p className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 shadow">
          {error}
        </p>
      )}

      {resetShown && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 shadow">
          <p className="text-sm font-semibold text-amber-800">
            New password for {resetShown.email} (shown once — copy it now):
          </p>
          <p className="mt-1 break-all font-mono text-sm font-bold text-[#0e2a47]">
            {resetShown.password}
          </p>
          <button
            type="button"
            className="mt-2 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100"
            onClick={() => setResetShown(null)}
          >
            Dismiss
          </button>
        </div>
      )}

      {users.length === 0 ? (
        <div className="rounded-xl bg-white p-8 text-center text-slate-500 shadow">
          No signed-up users yet. Users sign up from the login page.
        </div>
      ) : (
        <>
          {/* Desktop table — fixed layout with explicit column widths so
              the 10-column table fits the page width with no horizontal
              scrollbar, even when a classic vertical scrollbar takes 15px.
              The table only shows at wide viewports (xl and up); narrower
              screens get stacked cards. */}
          <div className="hidden overflow-hidden rounded-xl bg-white shadow xl:block">
            <table className="w-full table-fixed text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs text-slate-500">
                  <th className="w-[120px] px-1 py-2">User</th>
                  <th className="w-[78px] px-1 py-2">Role</th>
                  <th className="w-[160px] px-1 py-2">Area</th>
                  <th className="w-[88px] px-1 py-2">Target (৳)</th>
                  <th className="w-[92px] px-1 py-2">Parts</th>
                  <th className="w-[66px] px-1 py-2">Achievement</th>
                  <th className="w-[92px] px-1 py-2">Commission</th>
                  <th className="w-[78px] px-1 py-2">Status</th>
                  <th className="w-[66px] px-1 py-2">Created</th>
                  <th className="w-[84px] px-1 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-slate-100 align-top last:border-0">
                    <td className="max-w-[112px] px-1 py-2">
                      <p className="truncate font-semibold text-[#0e2a47]">{u.name}</p>
                      <p className="truncate text-xs text-slate-500">
                        {u.email || "Admin account"}
                      </p>
                    </td>
                    <td className="px-1 py-2">
                      <select
                        className={`${compactSelectCls} max-w-[92px]`}
                        value={u.role}
                        disabled={busy || u.id === "admin"}
                        onChange={(e) => patchUser(u.id, { role: e.target.value })}
                      >
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td className="px-1 py-2">
                      <select
                        className={`${compactSelectCls} max-w-[148px]`}
                        value={u.area ?? ""}
                        disabled={busy}
                        title="Bills inherit this area. Changing it updates the user's existing bills too."
                        onChange={(e) =>
                          patchUser(u.id, {
                            area: e.target.value === "" ? null : e.target.value,
                          })
                        }
                      >
                        <option value="">Not set</option>
                        {AREA_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-1 py-2">
                      <div className="flex flex-col items-start gap-1">
                        <input
                          className="w-[68px] rounded-lg border border-slate-300 px-2 py-1 text-sm focus:border-[#0e2a47] focus:outline-none"
                          type="number"
                          min={1}
                          value={targets[u.id] ?? String(u.monthlyTarget)}
                          onChange={(e) =>
                            setTargets((t) => ({ ...t, [u.id]: e.target.value }))
                          }
                        />
                        <button
                          type="button"
                          className={compactBtnCls}
                          disabled={busy}
                          onClick={() => saveTarget(u.id)}
                        >
                          Save
                        </button>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-1 py-2 font-medium text-[#0e2a47]">
                      {fmt(u.partsCollected ?? 0)}
                    </td>
                    <td className="whitespace-nowrap px-1 py-2 font-semibold text-amber-600">
                      {(u.achievementPercent ?? 0).toFixed(1)}%
                    </td>
                    <td className="whitespace-nowrap px-1 py-2 font-medium text-[#0e2a47]">
                      {fmt(u.commission ?? 0)}
                    </td>
                    <td className="px-1 py-2">
                      <span
                        className={`whitespace-nowrap rounded-full px-2 py-1 text-xs font-semibold ${
                          u.disabled
                            ? "bg-red-100 text-red-700"
                            : "bg-green-100 text-green-700"
                        }`}
                      >
                        {u.disabled ? "Disabled" : "Active"}
                      </span>
                    </td>
                    <td className="px-1 py-2 text-slate-600">
                      {u.createdAt ? formatDate(u.createdAt) : "—"}
                    </td>
                    <td className="px-1 py-2">
                      <div className="flex flex-col gap-1">
                        <Link
                          href={`/admin/users/${u.id}/bills`}
                          className="whitespace-nowrap rounded-lg border border-slate-300 px-2 py-1 text-center text-xs font-medium text-slate-600 hover:bg-slate-100"
                        >
                          View bills
                        </Link>
                        {u.id !== "admin" && (
                          <button
                            type="button"
                            className={compactGhostCls}
                            disabled={busy}
                            onClick={() => patchUser(u.id, { disabled: !u.disabled })}
                          >
                            {u.disabled ? "Enable" : "Disable"}
                          </button>
                        )}
                        {u.id !== "admin" && (
                          <button
                            type="button"
                            className={compactGhostCls}
                            disabled={busy}
                            onClick={() => {
                              setResetFor(resetFor === u.id ? null : u.id);
                              setResetShown(null);
                            }}
                          >
                            Reset password
                          </button>
                        )}
                        {u.id !== "admin" &&
                          (deleteFor === u.id ? (
                            <>
                              <button
                                type="button"
                                className="rounded-lg bg-red-600 px-2 py-1 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                                disabled={busy}
                                onClick={() => deleteUser(u.id)}
                              >
                                Confirm delete
                              </button>
                              <button
                                type="button"
                                className={compactGhostCls}
                                onClick={() => setDeleteFor(null)}
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              className="rounded-lg border border-red-200 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
                              disabled={busy}
                              onClick={() => setDeleteFor(u.id)}
                            >
                              Delete
                            </button>
                          ))}
                      </div>
                      {resetFor === u.id && (
                        <div className="mt-1.5 space-y-1.5 rounded-lg bg-slate-50 p-2">
                          <input
                            className={inputCls}
                            type="password"
                            autoComplete="new-password"
                            placeholder="New password (min 6)"
                            value={resetPassword}
                            onChange={(e) => setResetPassword(e.target.value)}
                          />
                          <button
                            type="button"
                            className="w-full rounded-lg bg-[#0e2a47] px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-[#143a5e] disabled:opacity-60"
                            disabled={busy}
                            onClick={() => resetUserPassword(u.id)}
                          >
                            Save new password
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Stacked cards below xl — the 10-column table cannot fit. */}
          <div className="space-y-4 xl:hidden">
            {users.map((u) => (
              <AdminUserCard
                key={u.id}
                u={u}
                busy={busy}
                targetValue={targets[u.id] ?? String(u.monthlyTarget)}
                onTargetChange={(value) =>
                  setTargets((t) => ({ ...t, [u.id]: value }))
                }
                onSaveTarget={() => saveTarget(u.id)}
                onPatch={(patch) => patchUser(u.id, patch)}
                resetOpen={resetFor === u.id}
                onToggleReset={() => {
                  setResetFor(resetFor === u.id ? null : u.id);
                  setResetShown(null);
                }}
                resetPassword={resetPassword}
                onResetPasswordChange={setResetPassword}
                onResetPassword={() => resetUserPassword(u.id)}
                deleteOpen={deleteFor === u.id}
                onToggleDelete={() =>
                  setDeleteFor(deleteFor === u.id ? null : u.id)
                }
                onDelete={() => deleteUser(u.id)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
