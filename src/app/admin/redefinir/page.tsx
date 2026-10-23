import { redirect } from "next/navigation";
import { requireAdmin } from "@/server/auth";
import { AuthForm } from "@/components/admin/auth-form";
export default async function Reset() {
  try {
    await requireAdmin();
  } catch {
    redirect("/admin/login");
  }
  return <AuthForm configured reset />;
}
