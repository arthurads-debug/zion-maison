import "server-only";
import { database } from "./supabase";
import { allowed } from "@/lib/domain";
export type AdminProfile = {
  user_id: string;
  display_name: string;
  role: "owner" | "staff";
  permissions: string[];
  active: boolean;
};
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export async function requireAdmin(permission?: string) {
  const db = await database();
  const {
    data: { user },
    error,
  } = await db.auth.getUser();
  if (error || !user)
    throw new HttpError(401, "Entre na sua conta para continuar.");
  const { data: profile } = await db
    .from("admin_profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();
  if (!profile?.active || (permission && !allowed(profile, permission)))
    throw new HttpError(403, "Você não tem permissão para esta operação.");
  return { db, user, profile: profile as AdminProfile };
}
