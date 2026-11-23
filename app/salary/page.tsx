"use client";

import { useState } from "react";
import { fmt } from "@/components/format";

type CategoryKey = "A" | "B" | "C";

const BASICS: Record<CategoryKey, { basic: number; experience: string }> = {
  A: { basic: 5500, experience: "More than 5 years" },
  B: { basic: 4500, experience: "More than 2 – 5 years" },
  C: { basic: 3500, experience: "Fresh – 2 years" },
};

const CONVEYANCE: Record<"inside" | "outside", number> = {
  inside: 3300,
  outside: 3800,
};

const FOOD = 1250;
const MOBILE_CEILING = 1000;

const inputCls =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#0e2a47] focus:outline-none";

export default function SalaryPage() {
  const [category, setCategory] = useState<CategoryKey>("A");
  const [location, setLocation] = useState<"inside" | "outside">("inside");
  const [tenureDays, setTenureDays] = useState("");

  const basic = BASICS[category].basic;
  const conveyance = CONVEYANCE[location];
  const monthlyFixed = basic + conveyance + FOOD;

  const tenure = Number(tenureDays);
  const bonusPerFestival =
    Number.isFinite(tenure) && tenureDays !== ""
      ? tenure >= 120
        ? basic
        : tenure >= 90
          ? basic / 2
          : 0
      : null;
  const yearlyFestivalTotal =
    bonusPerFestival === null ? null : bonusPerFestival * 2;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0e2a47]">Salary &amp; Benefits</h1>
        <p className="text-sm text-slate-500">
          Fixed monthly pay structure for Area Sales Executive
        </p>
      </div>

      {/* Calculator */}
      <div className="rounded-xl bg-white p-5 shadow">
        <h2 className="text-base font-bold text-[#0e2a47]">Monthly Fixed Salary Calculator</h2>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="text-sm font-medium text-slate-600">
            Category (Experience)
            <select
              className={inputCls}
              value={category}
              onChange={(e) => setCategory(e.target.value as CategoryKey)}
            >
              <option value="A">A — More than 5 years (Basic ৳5,500)</option>
              <option value="B">B — More than 2–5 years (Basic ৳4,500)</option>
              <option value="C">C — Fresh–2 years (Basic ৳3,500)</option>
            </select>
          </label>
          <label className="text-sm font-medium text-slate-600">
            Location
            <select
              className={inputCls}
              value={location}
              onChange={(e) => setLocation(e.target.value as "inside" | "outside")}
            >
              <option value="inside">Inside Metropolitan (Conveyance ৳3,300)</option>
              <option value="outside">Outside Metropolitan (Conveyance ৳3,800)</option>
            </select>
          </label>
        </div>

        <div className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between border-b border-slate-100 pb-2">
            <span className="text-slate-600">
              Basic Salary — Category {category} ({BASICS[category].experience})
            </span>
            <span className="font-semibold text-[#0e2a47]">{fmt(basic)}</span>
          </div>
          <div className="flex justify-between border-b border-slate-100 pb-2">
            <span className="text-slate-600">
              Conveyance Allowance —{" "}
              {location === "inside" ? "Inside Metropolitan" : "Outside Metropolitan"}
            </span>
            <span className="font-semibold text-[#0e2a47]">{fmt(conveyance)}</span>
          </div>
          <div className="flex justify-between border-b border-slate-100 pb-2">
            <span className="text-slate-600">Food Allowance (fixed)</span>
            <span className="font-semibold text-[#0e2a47]">{fmt(FOOD)}</span>
          </div>
          <div className="flex justify-between rounded-lg bg-[#0e2a47] px-3 py-3 text-white">
            <span className="font-semibold">Monthly Fixed Total</span>
            <span className="text-lg font-bold">{fmt(monthlyFixed)}</span>
          </div>
          <p className="pt-1 text-xs text-slate-500">
            Mobile allowance ceiling is {fmt(MOBILE_CEILING)} per month — this is a ceiling,
            not an addition. It is NOT included in the monthly fixed total above.
          </p>
        </div>
      </div>

      {/* Festival bonus */}
      <div className="rounded-xl bg-white p-5 shadow">
        <h2 className="text-base font-bold text-[#0e2a47]">Festival Bonus</h2>
        <p className="mt-1 text-sm text-slate-600">
          2 bonuses per year — Eid-ul-Fitr &amp; Eid-ul-Azha. Each bonus equals 1 month of
          basic salary.
        </p>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-600">
          <li>Full bonus (100% of basic) at 120 days of tenure or more.</li>
          <li>Half bonus (50% of basic) at 90–120 days of tenure.</li>
          <li>Below 90 days of tenure — no festival bonus.</li>
        </ul>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="text-sm font-medium text-slate-600">
            Tenure (days)
            <input
              className={inputCls}
              type="number"
              min={0}
              placeholder="e.g. 150"
              value={tenureDays}
              onChange={(e) => setTenureDays(e.target.value)}
            />
          </label>
          <div className="rounded-lg bg-amber-50 px-4 py-3 text-sm">
            {bonusPerFestival === null ? (
              <span className="text-slate-600">
                Enter your tenure in days to calculate the festival bonus for Category{" "}
                {category} (basic {fmt(basic)}).
              </span>
            ) : (
              <>
                <p className="text-slate-600">
                  Bonus per festival (Category {category}):{" "}
                  <span className="font-bold text-[#0e2a47]">{fmt(bonusPerFestival)}</span>
                </p>
                <p className="mt-1 text-slate-600">
                  Total for 2 festivals per year:{" "}
                  <span className="font-bold text-amber-600">{fmt(yearlyFestivalTotal ?? 0)}</span>
                </p>
                {bonusPerFestival === 0 && (
                  <p className="mt-1 text-xs text-red-600">
                    Tenure below 90 days — not eligible for festival bonus yet.
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Reference tables */}
      <div className="rounded-xl bg-white p-5 shadow">
        <h2 className="text-base font-bold text-[#0e2a47]">Salary Structure Reference</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[480px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="py-2 pr-3">Category</th>
                <th className="py-2 pr-3">Experience</th>
                <th className="py-2 text-right">Basic Salary</th>
              </tr>
            </thead>
            <tbody>
              {(Object.keys(BASICS) as CategoryKey[]).map((key) => (
                <tr key={key} className="border-b border-slate-100">
                  <td className="py-2 pr-3 font-semibold text-[#0e2a47]">{key}</td>
                  <td className="py-2 pr-3 text-slate-600">{BASICS[key].experience}</td>
                  <td className="py-2 text-right font-semibold">{fmt(BASICS[key].basic)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[480px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="py-2 pr-3">Allowance</th>
                <th className="py-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-100">
                <td className="py-2 pr-3 text-slate-600">Conveyance — Inside Metropolitan</td>
                <td className="py-2 text-right font-semibold">{fmt(3300)}</td>
              </tr>
              <tr className="border-b border-slate-100">
                <td className="py-2 pr-3 text-slate-600">Conveyance — Outside Metropolitan</td>
                <td className="py-2 text-right font-semibold">{fmt(3800)}</td>
              </tr>
              <tr className="border-b border-slate-100">
                <td className="py-2 pr-3 text-slate-600">Food Allowance (fixed)</td>
                <td className="py-2 text-right font-semibold">{fmt(FOOD)}</td>
              </tr>
              <tr>
                <td className="py-2 pr-3 text-slate-600">
                  Mobile Allowance (ceiling only — not added to total)
                </td>
                <td className="py-2 text-right font-semibold">{fmt(MOBILE_CEILING)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
