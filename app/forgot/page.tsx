"use client";

import { useState } from "react";

const inputCls =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#0e2a47] focus:ring-2 focus:ring-[#0e2a47]/20";

export default function ForgotPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [resetUrl, setResetUrl] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/auth/forgot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = (await res.json().catch(() => null)) as {
        error?: string;
        resetUrl?: string;
      } | null;
      if (!res.ok) {
        setError(data?.error ?? "Could not request a reset link");
        return;
      }
      setSent(true);
      setResetUrl(data?.resetUrl ?? null);
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center">
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow sm:p-8">
        <h1 className="text-xl font-bold text-[#0e2a47]">Forgot password</h1>
        <p className="text-sm text-slate-500">
          Enter your email and we will create a reset link for you.
        </p>

        {sent ? (
          <div className="mt-6 space-y-3">
            {resetUrl ? (
              <>
                <p className="rounded-lg bg-green-50 px-3 py-2 text-sm font-medium text-green-700">
                  Your reset link is ready (valid for 1 hour, single use):
                </p>
                <a
                  href={resetUrl}
                  className="block break-all rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-[#0e2a47] hover:underline"
                >
                  {resetUrl}
                </a>
                <p className="text-xs text-slate-400">
                  There is no email server, so the link is shown here instead
                  of being emailed. Keep it private — anyone with it can reset
                  your password until it expires or is used.
                </p>
              </>
            ) : (
              <p className="rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-600">
                If an account exists for that email, a reset link has been
                created. Ask the admin to reset your password if you did not
                get a link.
              </p>
            )}
            <a
              href="/login"
              className="block w-full rounded-lg bg-[#0e2a47] px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-[#143a5e]"
            >
              Back to log in
            </a>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-6 space-y-4">
            <div>
              <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-700">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputCls}
                placeholder="you@example.com"
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
              {busy ? "Please wait…" : "Get reset link"}
            </button>
          </form>
        )}

        <p className="mt-4 text-center text-sm text-slate-500">
          <a href="/login" className="font-medium text-[#0e2a47] hover:underline">
            Back to log in
          </a>
        </p>
      </div>
    </div>
  );
}
