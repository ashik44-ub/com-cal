import { fmt } from "@/components/format";

const FLAT_ROWS = [
  { range: "1,000 or less", amount: "0" },
  { range: "> 1,000 – 3,000", amount: "150" },
  { range: "> 3,000 – 6,000", amount: "300" },
  { range: "> 6,000 – 15,000", amount: "400" },
  { range: "> 15,000", amount: "500" },
];

const PERCENT_ROWS = [
  { threshold: "≥ 115,000", rate: "1.75%", bonus: "750" },
  { threshold: "≥ 150,000", rate: "2%", bonus: "1,000" },
  { threshold: "≥ 200,000", rate: "2.25%", bonus: "1,250" },
  { threshold: "≥ 300,000", rate: "2.5%", bonus: "1,500" },
  { threshold: "≥ 400,000", rate: "2.75%", bonus: "1,750" },
  { threshold: "≥ 500,000", rate: "3%", bonus: "2,000" },
  { threshold: "≥ 700,000", rate: "3.25%", bonus: "2,500" },
];

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl bg-white p-5 shadow">
      <h2 className="text-base font-bold text-[#0e2a47]">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Table({
  headers,
  rows,
}: {
  headers: string[];
  rows: string[][];
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[480px] text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-slate-500">
            {headers.map((h, i) => (
              <th key={h} className={`py-2 pr-3 ${i === headers.length - 1 ? "text-right" : ""}`}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-slate-100 last:border-0">
              {row.map((cell, j) => (
                <td
                  key={j}
                  className={`py-2 pr-3 ${j === 0 ? "font-medium text-slate-700" : ""} ${
                    j === row.length - 1 ? "text-right font-semibold text-[#0e2a47]" : "text-slate-600"
                  }`}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function RulesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0e2a47]">Commission Rules</h1>
        <p className="text-sm text-slate-500">
          How commission is calculated on collections — reference guide
        </p>
      </div>

      <Section title="Flat Commission — Service / TDS / VDS Collections">
        <p className="mb-3 text-sm text-slate-600">
          Fixed amount per posting, based on the posting amount (strict lower
          bounds). Flat commission is paid only when the month&apos;s total
          collection reaches the area minimum (see below) — below it, flat
          commission is ৳0 for the whole month.
        </p>
        <Table
          headers={["Collected Amount (৳)", "Commission (৳)"]}
          rows={FLAT_ROWS.map((r) => [r.range, fmt(Number(r.amount))])}
        />
      </Section>

      <Section title="Percentage Commission — Parts Sale Collections">
        <p className="mb-3 text-sm text-slate-600">
          Based on the month&apos;s total parts-sale collection — not on one
          bill. A partially-collected bill still earns commission. The rate
          plus a slab bonus on top. Commission is calculated per month: if
          the month&apos;s total collection is below the area minimum, no
          commission is added that month.
        </p>
        <Table
          headers={["Monthly Collection (৳)", "Rate", "Slab Bonus (৳)"]}
          rows={PERCENT_ROWS.map((r) => [
            r.threshold,
            r.rate,
            fmt(Number(r.bonus.replace(/,/g, ""))),
          ])}
        />
        <p className="mt-3 text-sm text-slate-600">
          Monthly 100% achievement on parts sale earns an extra{" "}
          <span className="font-semibold text-[#0e2a47]">+1.75%</span>.
        </p>
      </Section>

      <Section title="Area Minimums — Monthly Collection Gate">
        <p className="mb-3 text-sm text-slate-600">
          The month&apos;s total collection (all categories) must reach the
          area minimum, otherwise no commission at all is paid that month —
          neither parts-sale percentage nor service / TDS / VDS flat
          commission. The minimum is ৳275,000 when any bill collected that
          month is industrial / outside-metro, otherwise ৳115,000. Service
          contracts are not gated.
        </p>
        <p className="mb-3 text-sm text-slate-600">
          <span className="font-semibold text-[#0e2a47]">Where the area comes from:</span>{" "}
          each user picks their area — Residential or Outside Residential —
          when signing up, and every bill they add inherits that area
          automatically (there is no area field on the bill form). The admin
          can change a user&apos;s area from the Admin page; changing it
          updates that user&apos;s existing bills too, so the dashboard
          recomputes under the new area.
        </p>
        <Table
          headers={["Area", "Minimum Monthly Collection (৳)"]}
          rows={[
            ["Residential", fmt(115000)],
            ["Industrial / Outside Metropolitan", fmt(275000)],
          ]}
        />
        <p className="mt-3 text-sm text-slate-600">
          <span className="font-semibold text-[#0e2a47]">Residential cap:</span>{" "}
          in a residential month (no industrial collections that month), the
          parts-sale commission base is capped at ৳250,000 — so a residential
          month with ৳500,000 parts collected pays commission on ৳250,000
          (৳6,875), not on ৳500,000. The ৳115,000 gate is unchanged.
          Industrial months have no cap.
        </p>
      </Section>

      <Section title="Monthly Sales Target — Parts Sale">
        <p className="mb-3 text-sm text-slate-600">
          Each user has a monthly sales target (default ৳550,000, set by the
          admin). The dashboard shows the achievement % for parts sale only:
          parts-sale collection this month ÷ target × 100, with 1 decimal.
          0 collection shows 0.0%; any positive collection shows at least
          1.0% (even ৳1 collected shows 1.0%); above 100% is shown uncapped
          (e.g. 110.0%). The target base is the month&apos;s total parts-sale
          collection — TDS &amp; VDS (challan) postings do not count toward it.
        </p>
      </Section>

      <Section title="Posting Types — Collection vs TDS & VDS">
        <p className="mb-3 text-sm text-slate-600">
          Postings added to a bill are always a{" "}
          <span className="font-semibold text-[#0e2a47]">Collection</span> (cash
          collected from the customer) — there is no Type choice on the bill
          card. A{" "}
          <span className="font-semibold text-[#0e2a47]">TDS &amp; VDS</span>{" "}
          entry is added from the dashboard quick-entry card instead (standalone
          Service / TDS &amp; VDS collection, not tied to a bill). Bills that
          already have a TDS &amp; VDS (challan) posting keep working: the
          challan counts toward the bill total (cash + challan can make a bill
          fully collected) and toward the month&apos;s total collection and the
          monthly gate, but on the dashboard it counts as TDS &amp; VDS — it
          earns the flat TDS/VDS commission and appears in the Service &amp;
          TDS/VDS Commission card — not in the parts-sale commission base or
          the sales-target %.
        </p>
      </Section>

      <Section title="45-Day Deadline & Disqualifiers">
        <ul className="list-disc space-y-2 pl-5 text-sm text-slate-600">
          <li>
            <span className="font-semibold text-[#0e2a47]">45-day deadline:</span> each
            posting must be within 45 days of its bill&apos;s invoice date to
            earn commission.
          </li>
          <li>
            Collections after 45 days earn{" "}
            <span className="font-semibold text-red-600">৳0 commission</span> but still
            count in total collection.
          </li>
          <li>
            Collections made in <span className="font-semibold">31–45 days</span> need
            HoD approval.
          </li>
          <li>
            <span className="font-semibold text-[#0e2a47]">Partial payment</span> — no
            commission on the bill.
          </li>
          <li>
            <span className="font-semibold text-[#0e2a47]">Profit below SnS budget</span>{" "}
            — no commission on the bill.
          </li>
          <li>
            <span className="font-semibold text-[#0e2a47]">Monthly achievement below 50%</span>{" "}
            — no commission.
          </li>
        </ul>
      </Section>

      <Section title="Service Contracts">
        <p className="mb-3 text-sm text-slate-600">
          A service contract (CSA / SnM / OnM) earns commission in the month
          of its invoice date, and is not gated by the monthly minimum: a new
          contract earns ৳500, a renewal earns ৳1,000. You can also add a
          CSA without a bill from the dashboard quick entry (Service / TDS
          &amp; VDS / CSA) — the same rates apply, and it counts in contract
          earned and Earning, but not in Collection totals, the gate, the
          parts-sale base or the target %.
        </p>
        <Table
          headers={["Contract Type", "Commission (৳)"]}
          rows={[
            ["New Contract", fmt(500)],
            ["Renewal", fmt(1000)],
          ]}
        />
      </Section>

      <Section title="Bonuses">
        <ul className="list-disc space-y-2 pl-5 text-sm text-slate-600">
          <li>
            <span className="font-semibold text-[#0e2a47]">Yearly 100% target:</span>{" "}
            {fmt(25000)} bonus on achieving 100% of the yearly target.
          </li>
          <li>
            <span className="font-semibold text-[#0e2a47]">Monthly 100% achievement (parts sale):</span>{" "}
            +1.75% extra commission.
          </li>
        </ul>
      </Section>
    </div>
  );
}
