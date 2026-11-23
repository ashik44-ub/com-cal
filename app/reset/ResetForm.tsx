"use client";

import { useState } from "react";

const inputCls =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#0e2a47] focus:ring-2 focus:ring-[#0e2a47]/20";

export default function ResetForm({ token }: { token: string }) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/auth/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword, confirmPassword }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        setError(data?.error ?? "Could not reset the password");
        return;
      }
      setDone(true);
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (!token) {
    return (
      <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
        This reset link is missing its token. Please request a new reset link.
      </p>
    );
  }

  if (done) {
    return (
      <div className="mt-6">
        <p className="rounded-lg bg-green-50 px-3 py-2 text-sm font-medium text-green-700">
          Your password has been changed. You can now log in with the new password.
        </p>
        <a
          href="/login"
          className="mt-4 block w-full rounded-lg bg-[#0e2a47] px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-[#143a5e]"
        >
          Go to log in
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mt-6 space-y-4">
      <div>
        <label htmlFor="newPassword" className="mb-1 block text-sm font-medium text-slate-700">
          New password
        </label>
        <input
          id="newPassword"
          type="password"
          autoComplete="new-password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className={inputCls}
          placeholder="At least 6 characters"
          required
        />
      </div>
      <div>
        <label
          htmlFor="confirmPassword"
          className="mb-1 block text-sm font-medium text-slate-700"
        >
          Confirm new password
        </label>
        <input
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className={inputCls}
          placeholder="Repeat your new password"
          required
        />
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-lg bg-[#0e2a47] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#143a5e] disabled:opacity-60"
      >
        {busy ? "Changing password…" : "Change password"}
      </button>
    </form>
  );
}
