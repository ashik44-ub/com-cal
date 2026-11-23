import UserBills from "./UserBills";

export default async function AdminUserBillsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <UserBills userId={id} />;
}
