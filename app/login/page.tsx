"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(data?.error ?? "Invalid username or password");
        return;
      }
      router.push("/");
      router.refresh();
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center">
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow sm:p-8">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-500 text-xl font-bold text-white">
            A
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#0e2a47]">Commission Calculator</h1>
            <p className="text-sm text-slate-500">Please log in to continue</p>
          </div>
        </div>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="username" className="mb-1 block text-sm font-medium text-slate-700">
              Username or Email
            </label>
            <input
              id="username"
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#0e2a47] focus:ring-2 focus:ring-[#0e2a47]/20"
              placeholder="Username or email"
              required
            />
          </div>
          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-slate-700">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#0e2a47] focus:ring-2 focus:ring-[#0e2a47]/20"
              placeholder="Password"
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
            {busy ? "Logging in…" : "Log in"}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-slate-400">
          Default login: ashikur / commission123. Change it in .env.local.
        </p>
        <div className="mt-3 flex items-center justify-center gap-4 text-sm">
          <a href="/signup" className="font-medium text-[#0e2a47] hover:underline">
            Sign up
          </a>
          <span className="text-slate-300">|</span>
          <a href="/forgot" className="font-medium text-[#0e2a47] hover:underline">
            Forgot password?
          </a>
        </div>
      </div>
    </div>
  );
}
