import { homeBlocks } from "./home-blocks";
import { z } from "zod";
const web = z
  .string()
  .max(2000)
  .refine(
    (v) => !v || /^https?:\/\/[^\s]+$/i.test(v),
    "Use uma URL HTTP ou HTTPS.",
  );
const target = z
  .string()
  .max(2000)
  .refine(
    (v) =>
      !v ||
      (/^\/(?!\/)/.test(v) && !v.includes("\\")) ||
      /^https?:\/\//i.test(v),
    "Link inválido.",
  );
export const contentSchema = z
  .object({
    id: z.uuid().optional(),
    kind: z.enum([
      "hero",
      "section",
      "page",
      "look",
      "video",
      "instagram",
      "campaign",
    ]),
    title: z.string().trim().min(1).max(200),
    slug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
    status: z.enum(["draft", "published", "archived"]),
    sort_order: z.number().int().default(0),
    body: z
      .object({
        text: z.string().max(30000).optional(),
        subtitle: z.string().max(600).optional(),
        image_url: web.optional(),
        mobile_image_url: web.optional(),
        video_url: web.optional(),
        poster_url: web.optional(),
        alt: z.string().max(300).optional(),
        cta_label: z.string().max(100).optional(),
        cta_href: target.optional(),
        section_type: z
          .enum(["editorial", "newest", "popular", "featured"])
          .optional(),
        product_ids: z.array(z.uuid()).max(100).optional(),
      })
      .strict(),
  })
  .refine(
    (c) =>
      c.kind !== "video" ||
      c.status !== "published" ||
      !!(c.body.video_url && c.body.poster_url),
    { message: "Vídeo publicado exige arquivo e capa." },
  );
export const settingsSchema = z
  .object({
    home_order: z
      .array(z.enum(homeBlocks))
      .max(homeBlocks.length)
      .refine((v) => new Set(v).size === v.length)
      .optional(),
    name: z.string().min(1).max(100).optional(),
    announcement: z.string().max(300).optional(),
    whatsapp: z
      .string()
      .refine(
        (v) => !v || /^[1-9]\d{9,14}$/.test(v),
        "Número internacional inválido.",
      )
      .optional(),
    instagram: web.optional(),
    logo_url: web.optional(),
    icon_url: web.optional(),
    email: z.union([z.email(), z.literal("")]).optional(),
    address: z.string().max(500).optional(),
    business_id: z.string().max(100).optional(),
    timezone: z.literal("America/Belem").optional(),
    about: z.string().max(10000).optional(),
    default_message: z.string().max(5000).optional(),
  })
  .strict();
export const integrationSchema = z.object({
  enabled: z.boolean(),
  secret: z.string().max(4000).optional(),
  remove_secret: z.boolean().optional(),
  config: z
    .object({
      pixel_id: z.string().regex(/^\d*$/).max(30).optional(),
      measurement_id: z
        .string()
        .regex(/^(G-[A-Z0-9]+)?$/)
        .optional(),
      test_code: z.string().max(100).optional(),
      events: z.array(z.string().max(80)).max(30).optional(),
      mode: z.enum(["individual", "summary"]).optional(),
      interval_minutes: z.number().int().min(5).max(1440).optional(),
      rate_per_hour: z.number().int().min(1).max(1000).optional(),
      title: z.string().max(150).optional(),
      text: z.string().max(1000).optional(),
      phone_id: z.string().max(80).optional(),
    })
    .strict(),
});
export const taxonomySchema = z.object({
  id: z.uuid().optional(),
  kind: z.enum(["category", "collection"]),
  name: z.string().min(1).max(100),
  slug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
  description: z.string().max(5000).default(""),
  image_url: web.nullable().default(null),
  published: z.boolean(),
  sort_order: z.number().int().default(0),
});
export function validatePublication(
  status: string,
  variants: unknown[],
  mediaCount: number,
) {
  if (status === "published" && (!variants.length || mediaCount === 0))
    throw new Error(
      "Para publicar, adicione pelo menos uma variação e uma imagem verificada.",
    );
}
