import { AdminHome } from "@/components/admin/home";
import { requireAdmin } from "@/server/auth";
export default async function Admin() {
  const { profile } = await requireAdmin();
  return <AdminHome profile={profile} />;
}
