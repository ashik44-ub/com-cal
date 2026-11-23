"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/", label: "Dashboard" },
  { href: "/bills", label: "Bills" },
  { href: "/rules", label: "Commission Rules" },
  { href: "/salary", label: "Salary & Benefits" },
];

function linkClass(href: string, pathname: string, mobile: boolean) {
  const active = pathname === href;
  if (mobile) {
    return active
      ? "rounded-full bg-amber-500 px-3 py-1.5 text-sm font-semibold text-white"
      : "rounded-full bg-white/10 px-3 py-1.5 text-sm font-medium text-white/85 hover:bg-white/20";
  }
  return active
    ? "block rounded-lg bg-white/15 px-4 py-2.5 text-sm font-semibold text-white border-l-4 border-amber-500"
    : "block rounded-lg px-4 py-2.5 text-sm font-medium text-white/80 hover:bg-white/10 hover:text-white border-l-4 border-transparent";
}

export default function Sidebar({
  isAdmin = false,
  userName = "Ashikur",
}: {
  isAdmin?: boolean;
  userName?: string;
}) {
  const pathname = usePathname();
  const nav = isAdmin ? [...NAV, { href: "/admin", label: "Admin" }] : NAV;

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col bg-[#0e2a47] text-white md:flex">
        <div className="flex items-center gap-3 px-5 pb-6 pt-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-500 text-xl font-bold text-white">
            A
          </div>
          <div>
            <p className="text-base font-bold leading-tight">{userName}</p>
            <p className="text-xs text-white/70">Area Sales Executive</p>
          </div>
        </div>
        <nav className="flex flex-col gap-1 px-3">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={linkClass(item.href, pathname, false)}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto px-5 pb-6">
          <button
            type="button"
            onClick={logout}
            className="mb-3 block w-full rounded-lg bg-white/10 px-4 py-2.5 text-left text-sm font-medium text-white/85 hover:bg-white/20"
          >
            Log out
          </button>
          <p className="text-xs text-white/50">Commission Calculator</p>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="bg-[#0e2a47] px-4 pb-3 pt-4 text-white md:hidden">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500 text-lg font-bold text-white">
            A
          </div>
          <div>
            <p className="text-base font-bold leading-tight">{userName}</p>
            <p className="text-xs text-white/70">Area Sales Executive</p>
          </div>
        </div>
        <nav className="mt-3 flex flex-wrap gap-2">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={linkClass(item.href, pathname, true)}
            >
              {item.label}
            </Link>
          ))}
          <button
            type="button"
            onClick={logout}
            className="rounded-full bg-white/10 px-3 py-1.5 text-sm font-medium text-white/85 hover:bg-white/20"
          >
            Log out
          </button>
        </nav>
      </header>
    </>
  );
}
