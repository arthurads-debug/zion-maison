import "server-only";
import { requireAdmin, HttpError } from "./auth";
import { productSchema, variantSchema, permissionOptions } from "@/lib/domain";
import {
  contentSchema,
  settingsSchema,
  taxonomySchema,
  validatePublication,
} from "@/lib/admin-schemas";
import { checkDb, serviceDatabase } from "./supabase";
import { productSelect } from "./catalog";
import { z } from "zod";
import { processDeliveries } from "./integrations";
const resources = {
  products: {
    table: "products",
    read: "products.read",
    write: "products.write",
  },
  stock: { table: "variants", read: "stock.read", write: "stock.write" },
  content: {
    table: "content_entries",
    read: "content.read",
    write: "content.write",
  },
  taxonomy: { table: "taxonomy", read: "content.read", write: "content.write" },
  media: {
    table: "media_assets",
    read: "products.write",
    write: "products.write",
  },
  sales: { table: "sales", read: "stock.write", write: "stock.write" },
  intents: {
    table: "purchase_intents",
    read: "reports.read",
    write: "reports.read",
  },
  history: { table: "audit_log", read: "history.read", write: "history.read" },
  team: { table: "admin_profiles", read: "team.write", write: "team.write" },
  settings: {
    table: "site_settings",
    read: "settings.write",
    write: "settings.write",
  },
} as const;
type Resource = keyof typeof resources;
function resource(input: string) {
  if (!(input in resources))
    throw new HttpError(404, "Recurso não encontrado.");
  return resources[input as Resource];
}
export async function listAdmin(input: string, params: URLSearchParams) {
  const r = resource(input);
  const auth = await requireAdmin();
  const { allowed } = await import("@/lib/domain");
  if (
    !allowed(auth.profile, r.read) &&
    !allowed(auth.profile, r.write) &&
    !(input === "media" && allowed(auth.profile, "content.write")) &&
    !(input === "taxonomy" && allowed(auth.profile, "products.write"))
  )
    throw new HttpError(403, "Sem permissão para consultar esta área.");
  const page = Math.max(1, Math.min(10000, Number(params.get("page")) || 1));
  let query = auth.db
    .from(r.table)
    .select(
      input === "products"
        ? productSelect
        : input === "content"
          ? "*,look_items(*)"
          : input === "stock"
            ? "*,product:products(name,slug)"
            : "*",
      { count: "exact" },
    );
  if (input === "settings") {
    const { data, error } = await query.eq("id", "public").single();
    checkDb(error);
    return { data, count: 1 };
  }
  const q = (params.get("q") || "")
    .replace(/[^\p{L}\p{N} -]/gu, "")
    .slice(0, 100);
  if (q && ["products", "taxonomy"].includes(input))
    query = query.ilike("name", `%${q}%`);
  if (params.get("status") && ["products", "content"].includes(input))
    query = query.eq("status", params.get("status"));
  if (params.get("id"))
    query = query.eq(
      input === "team" ? "user_id" : "id",
      z.uuid().parse(params.get("id")),
    );
  if (params.get("kind") && ["content", "taxonomy"].includes(input))
    query = query.eq("kind", params.get("kind"));
  if (input === "history" && params.get("entity"))
    query = query.eq("entity", params.get("entity"));
  if (input === "history" && params.get("actor"))
    query = query.eq("actor_id", z.uuid().parse(params.get("actor")));
  const order =
    input === "products"
      ? "created_at"
      : input === "team"
        ? "created_at"
        : input === "stock"
          ? "color"
          : input === "content" || input === "taxonomy"
            ? "sort_order"
            : "created_at";
  const { data, count, error } = await query
    .order(order, { ascending: ["color", "sort_order"].includes(order) })
    .range((page - 1) * 25, page * 25 - 1);
  checkDb(error);
  return { data, count, page };
}
export async function mutateAdmin(
  input: string,
  body: Record<string, unknown>,
  method: string,
) {
  const r = resource(input);
  const { db, user, profile } = await requireAdmin();
  const { allowed } = await import("@/lib/domain");
  if (
    !allowed(profile, r.write) &&
    !(input === "media" && allowed(profile, "content.write"))
  )
    throw new HttpError(403, "Sem permissão para alterar esta área.");
  if (method === "DELETE") {
    const id = z.uuid().parse(body.id);
    if (input === "products") {
      const { error } = await db.rpc("archive_product", { p_id: id });
      checkDb(error);
      return { archived: true };
    }
    if (!["content", "taxonomy", "media"].includes(input))
      throw new HttpError(403, "Exclusão indisponível para este registro.");
    // Keep reused media and commercial history intact. FK constraints enforce it.
    const { error } =
      input === "media"
        ? await db.rpc("media_metadata", { p_id: id, p_delete: true })
        : await db.from(r.table).delete().eq("id", id);
    checkDb(error);
    if (input === "media") {
      try {
        await processDeliveries({ assetId: id });
        const { data } = await serviceDatabase().rpc("delivery_jobs", {
          p_action: "media-status",
          p_id: id,
        });
        return { deleted: true, cleanup_pending: data?.state !== "delivered" };
      } catch {
        return { deleted: true, cleanup_pending: true };
      }
    }
    return { deleted: true };
  }
  if (input === "products") {
    const product = productSchema.parse(body.product);
    const variants = z.array(variantSchema).max(100).parse(body.variants);
    const media = z
      .array(
        z.object({
          asset_id: z.uuid(),
          color: z.string().max(80).nullable().optional(),
        }),
      )
      .max(40)
      .parse(body.media || []);
    validatePublication(product.status, variants, media.length);
    if (media.length) {
      const { data, error } = await db
        .from("media_assets")
        .select("id,kind")
        .in(
          "id",
          media.map((m) => m.asset_id),
        );
      checkDb(error);
      if (
        data?.length !== media.length ||
        (product.status === "published" &&
          !data.some((a) => a.kind === "image"))
      )
        throw new HttpError(
          400,
          "Selecione imagens verificadas para publicar.",
        );
    }
    const { data: id, error } = await db.rpc("save_product_complete", {
      p_product: product,
      p_variants: variants,
      p_media: media,
    });
    checkDb(error);
    return { id };
  }
  if (input === "stock") {
    const data = z
      .object({
        variant_id: z.uuid(),
        quantity: z.number().int().min(0).max(100000),
        version: z.number().int().min(0),
        reason: z.string().trim().min(1).max(500),
        low_stock: z.number().int().min(0).max(10000).optional(),
      })
      .parse(body);
    const { error } = await db.rpc("adjust_stock", {
      p_variant: data.variant_id,
      p_quantity: data.quantity,
      p_version: data.version,
      p_reason: data.reason,
    });
    checkDb(error);
    if (data.low_stock !== undefined) {
      const { error: e } = await db.rpc("set_stock_threshold", {
        p_variant: data.variant_id,
        p_minimum: data.low_stock,
      });
      checkDb(e);
    }
    return { saved: true };
  }
  if (input === "sales") {
    if (body.action === "reverse") {
      const { error } = await db.rpc("reverse_sale", {
        p_sale: z.uuid().parse(body.id),
      });
      checkDb(error);
      return { saved: true };
    }
    const data = z
      .object({
        key: z.uuid(),
        items: z
          .array(
            z.object({
              variant_id: z.uuid(),
              quantity: z.number().int().min(1).max(99),
            }),
          )
          .min(1)
          .max(100),
        note: z.string().max(2000),
      })
      .parse(body);
    const { data: id, error } = await db.rpc("record_sale", {
      p_key: data.key,
      p_items: data.items,
      p_note: data.note,
    });
    checkDb(error);
    return { id };
  }
  if (input === "settings") {
    const data = settingsSchema.parse(body);
    const { data: old } = await db
      .from("site_settings")
      .select("data")
      .eq("id", "public")
      .single();
    const { error } = await db
      .from("site_settings")
      .update({
        data: { ...old?.data, ...data },
        updated_at: new Date().toISOString(),
      })
      .eq("id", "public");
    checkDb(error);
    return { saved: true };
  }
  if (input === "team") {
    const data = z
      .object({
        user_id: z.uuid().optional(),
        email: z.email().optional(),
        display_name: z.string().trim().min(1).max(120),
        permissions: z.array(z.enum(permissionOptions)),
        active: z.boolean().default(true),
      })
      .parse(body);
    if (data.user_id) {
      const { error } = await db
        .from("admin_profiles")
        .update({
          display_name: data.display_name,
          permissions: data.permissions,
          active: data.active,
        })
        .eq("user_id", data.user_id);
      checkDb(error);
      return { saved: true };
    }
    if (!data.email) throw new HttpError(400, "Informe o e-mail.");
    const service = serviceDatabase();
    const { data: invite, error } = await service.auth.admin.inviteUserByEmail(
      data.email,
      {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?next=/admin/redefinir`,
      },
    );
    checkDb(error);
    const { error: profileError } = await db.from("admin_profiles").insert({
      user_id: invite.user!.id,
      display_name: data.display_name,
      role: "staff",
      permissions: data.permissions,
      active: true,
    });
    checkDb(profileError);
    return { invited: true };
  }
  if (input === "media") {
    const data = z
      .object({
        id: z.uuid(),
        alt: z.string().max(300),
        poster_url: z.string().url().optional(),
      })
      .parse(body);
    const { error } = await db.rpc("media_metadata", {
      p_id: data.id,
      p_alt: data.alt,
      p_poster: data.poster_url ?? null,
    });
    checkDb(error);
    return { saved: true };
  }
  if (input === "content" || input === "taxonomy") {
    const data =
      input === "content"
        ? contentSchema.parse(body)
        : taxonomySchema.parse(body);
    const { data: result, error } =
      input === "content"
        ? await db
            .from("content_entries")
            .upsert(contentSchema.parse(body))
            .select("id")
            .single()
        : await db
            .from("taxonomy")
            .upsert(taxonomySchema.parse(body))
            .select("id")
            .single();
    checkDb(error);
    if (
      input === "content" &&
      "kind" in data &&
      data.kind === "look" &&
      body.look_items
    ) {
      const items = z
        .array(
          z.object({
            product_id: z.uuid(),
            x: z.number().min(0).max(100).nullable().optional(),
            y: z.number().min(0).max(100).nullable().optional(),
          }),
        )
        .max(30)
        .parse(body.look_items);
      const { error: e } = await db.rpc("set_look_items", {
        p_look: result!.id,
        p_items: items,
      });
      checkDb(e);
    }
    return { id: result!.id };
  }
  void user;
  throw new HttpError(403, "Esta área permite somente consultas.");
}
