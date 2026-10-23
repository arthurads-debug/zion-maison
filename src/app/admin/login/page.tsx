import { configured } from "@/server/supabase";
import { AuthForm } from "@/components/admin/auth-form";
export default function Login() {
  return <AuthForm configured={configured()} />;
}
