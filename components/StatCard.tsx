type StatCardProps = {
  label: string;
  value: string;
  sub?: string;
  /** Short reason line shown under the value when a commission is ৳0
   *  (v8) — e.g. why the monthly minimum was not reached. */
  note?: string;
  dark?: boolean;
};

export default function StatCard({ label, value, sub, note, dark }: StatCardProps) {
  return (
    <div
      className={
        dark
          ? "rounded-xl bg-[#0e2a47] p-5 text-white shadow"
          : "rounded-xl bg-white p-5 shadow"
      }
    >
      <p
        className={
          dark
            ? "text-sm font-medium text-white/70"
            : "text-sm font-medium text-slate-500"
        }
      >
        {label}
      </p>
      <p
        className={
          dark
            ? "mt-2 text-2xl font-bold text-white sm:text-3xl"
            : "mt-2 text-2xl font-bold text-[#0e2a47] sm:text-3xl"
        }
      >
        {value}
      </p>
      {sub ? (
        <p className={dark ? "mt-1 text-xs text-white/60" : "mt-1 text-xs text-slate-400"}>
          {sub}
        </p>
      ) : null}
      {note ? (
        <p
          className={
            dark ? "mt-2 text-xs font-medium text-amber-300" : "mt-2 text-xs font-medium text-amber-600"
          }
        >
          {note}
        </p>
      ) : null}
    </div>
  );
}
