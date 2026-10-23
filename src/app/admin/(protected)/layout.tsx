import { redirect } from "next/navigation";
import { requireAdmin } from "@/server/auth";
import { AdminShell } from "@/components/admin/shell";
export default async function Protected({
  children,
}: {
  children: React.ReactNode;
}) {
  let auth;
  try {
    auth = await requireAdmin();
  } catch {
    redirect("/admin/login");
  }
  return <AdminShell profile={auth.profile}>{children}</AdminShell>;
}
