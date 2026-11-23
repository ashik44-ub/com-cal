import ResetForm from "./ResetForm";

export default function ResetPage({
  searchParams,
}: {
  searchParams: { token?: string };
}) {
  const token = typeof searchParams.token === "string" ? searchParams.token : "";
  return (
    <div className="flex min-h-[80vh] items-center justify-center">
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow sm:p-8">
        <h1 className="text-xl font-bold text-[#0e2a47]">Reset password</h1>
        <p className="text-sm text-slate-500">
          Choose a new password. The link works once and expires after 1 hour.
        </p>
        <ResetForm token={token} />
        <p className="mt-4 text-center text-sm text-slate-500">
          <a href="/login" className="font-medium text-[#0e2a47] hover:underline">
            Back to log in
          </a>
        </p>
      </div>
    </div>
  );
}
