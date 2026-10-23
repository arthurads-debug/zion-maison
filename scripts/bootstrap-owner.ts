import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
const env = z
  .object({
    NEXT_PUBLIC_SUPABASE_URL: z.url(),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
    BOOTSTRAP_OWNER_EMAIL: z.email(),
    BOOTSTRAP_OWNER_NAME: z.string().min(1),
    BOOTSTRAP_OWNER_PASSWORD: z.string().min(12).max(128),
  })
  .parse(process.env);
const db = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);
const { data: existing, error: lookupError } = await db
  .from("admin_profiles")
  .select("user_id")
  .eq("role", "owner")
  .eq("active", true)
  .limit(1);
if (lookupError) throw new Error("Aplique as migrations antes do bootstrap.");
if (existing?.length)
  throw new Error(
    "Uma proprietária já existe. Use o fluxo de recuperação ou a administração.",
  );
const { data, error } = await db.auth.admin.createUser({
  email: env.BOOTSTRAP_OWNER_EMAIL,
  password: env.BOOTSTRAP_OWNER_PASSWORD,
  email_confirm: true,
});
if (error)
  throw new Error(
    "Não foi possível criar a conta. Verifique configuração e existência do e-mail no Supabase.",
  );
const { error: profileError } = await db.from("admin_profiles").insert({
  user_id: data.user.id,
  display_name: env.BOOTSTRAP_OWNER_NAME,
  role: "owner",
  permissions: [],
  active: true,
});
if (profileError) {
  await db.auth.admin.deleteUser(data.user.id);
  throw new Error("Não foi possível provisionar o perfil administrativo.");
}
console.log(
  "Proprietária criada. Acesse /admin com as credenciais definidas por você.",
);
