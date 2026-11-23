"use client";

import { useState } from "react";

const inputCls =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#0e2a47] focus:ring-2 focus:ring-[#0e2a47]/20";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [area, setArea] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, area, password, confirmPassword }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        setError(data?.error ?? "Could not sign up");
        return;
      }
      setDone(true);
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center">
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow sm:p-8">
        <h1 className="text-xl font-bold text-[#0e2a47]">Sign up</h1>
        <p className="text-sm text-slate-500">Create your account to track commissions</p>

        {done ? (
          <div className="mt-6">
            <p className="rounded-lg bg-green-50 px-3 py-2 text-sm font-medium text-green-700">
              Account created. You can now log in with your email and password.
            </p>
            <a
              href="/login"
              className="mt-4 block w-full rounded-lg bg-[#0e2a47] px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-[#143a5e]"
            >
              Go to log in
            </a>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-6 space-y-4">
            <div>
              <label htmlFor="name" className="mb-1 block text-sm font-medium text-slate-700">
                Name
              </label>
              <input
                id="name"
                type="text"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputCls}
                placeholder="Your name"
                required
              />
            </div>
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
            <div>
              <label htmlFor="area" className="mb-1 block text-sm font-medium text-slate-700">
                Area
              </label>
              <select
                id="area"
                value={area}
                onChange={(e) => setArea(e.target.value)}
                className={inputCls}
                required
              >
                <option value="">Select your area</option>
                <option value="residential">Residential</option>
                <option value="industrial">Outside Residential</option>
              </select>
              <p className="mt-1 text-xs text-slate-500">
                Your bills use this area — the monthly minimum is ৳115,000
                for Residential and ৳275,000 for Outside Residential.
              </p>
            </div>
            <div>
              <label htmlFor="password" className="mb-1 block text-sm font-medium text-slate-700">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
                Confirm password
              </label>
              <input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={inputCls}
                placeholder="Repeat your password"
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
              {busy ? "Creating account…" : "Sign up"}
            </button>
          </form>
        )}

        <p className="mt-4 text-center text-sm text-slate-500">
          Already have an account?{" "}
          <a href="/login" className="font-medium text-[#0e2a47] hover:underline">
            Log in
          </a>
        </p>
      </div>
    </div>
  );
}
