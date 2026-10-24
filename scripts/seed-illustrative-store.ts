/** Explicitly requested, additive example content. Run with --conditions=react-server and .env.local. */
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { finalizeMedia } from "../src/server/media";
import { serviceDatabase, checkDb } from "../src/server/supabase";

const db = serviceDatabase();
const { data: owner, error: ownerError } = await db
  .from("admin_profiles")
  .select("user_id")
  .eq("role", "owner")
  .eq("active", true)
  .order("created_at")
  .limit(1)
  .single();
checkDb(ownerError);
if (!owner)
  throw Error("Configure uma proprietária ativa antes de importar o conteúdo.");
const actor = owner.user_id;
function id(label: string) {
  const hash = createHash("sha256")
    .update(`zion-illustrative-v1:${label}`)
    .digest("hex");
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-5${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}
async function insertMissing(table: string, row: Record<string, unknown>) {
  const { data: existing, error: readError } = await db
    .from(table)
    .select("*")
    .eq("id", row.id)
    .maybeSingle();
  checkDb(readError);
  if (existing) return { row: existing, created: false };
  const { data, error } = await db.from(table).insert(row).select("*").single();
  checkDb(error);
  return { row: data!, created: true };
}
type Asset = { id: string; url: string; kind: string; original_path: string };
const assets: Record<string, Asset> = {};
const keys = [
  "hero",
  "sage-dress",
  "ivory-lace",
  "blue-tailoring",
  "floral-dress",
  "black-dress",
  "sand-linen",
];
for (const key of [
  ...keys,
  ...["ivory-lace", "blue-tailoring", "floral-dress"].map(
    (key) => `${key}-motion`,
  ),
]) {
  const video = key.endsWith("-motion");
  const basename = video ? key.replace(/-motion$/, "") : key;
  const file = `assets/illustrative/${video ? "videos" : "images"}/${basename}.${video ? "mp4" : "webp"}`;
  const path = `${actor}/illustrative-v1/${key}.${video ? "mp4" : "webp"}`;
  const mime = video ? "video/mp4" : "image/webp";
  const { data: existing, error } = await db
    .from("media_assets")
    .select("*")
    .eq("original_path", path)
    .maybeSingle();
  checkDb(error);
  if (existing) {
    assets[key] = existing;
    continue;
  }
  const bytes = await readFile(file);
  const { error: uploadError } = await db.storage
    .from("originals")
    .upload(path, bytes, { contentType: mime, upsert: false });
  // A previous interrupted run may already have stored the private original.
  if (uploadError && !/already exists|duplicate/i.test(uploadError.message))
    checkDb(uploadError);
  const asset = await finalizeMedia(
    path,
    mime,
    actor,
    `Editorial ilustrativo Zion Maison — ${key.replaceAll("-", " ")}. Imagem gerada para apresentação da loja.`,
  );
  if (video) {
    const { error } = await db
      .from("media_assets")
      .update({ poster_url: assets[basename].url })
      .eq("id", asset.id);
    checkDb(error);
  }
  assets[key] = asset;
  console.log(`Mídia verificada: ${key}`);
}
const categories = [
  ["vestidos", "Vestidos", "sage-dress"],
  ["conjuntos", "Conjuntos", "ivory-lace"],
  ["alfaiataria", "Alfaiataria", "blue-tailoring"],
  ["essenciais", "Essenciais", "sand-linen"],
];
const collections = [
  ["essencia-atemporal", "Essência Atemporal", "ivory-lace"],
  ["luz-de-verao", "Luz de Verão", "floral-dress"],
];
for (const [kind, entries] of [
  ["category", categories],
  ["collection", collections],
] as const)
  for (const [index, [slug, name, image]] of entries.entries())
    await insertMissing("taxonomy", {
      id: id(`${kind}:${slug}`),
      kind,
      name,
      slug,
      description: `Uma curadoria de formas, texturas e possibilidades. ${name} para acompanhar você. Imagens e peças ilustrativas, editáveis no painel.`,
      image_url: assets[image].url,
      published: true,
      sort_order: index,
    });
const pieces = [
  {
    key: "sage-dress",
    name: "Vestido Renda Gola Alta",
    slug: "vestido-renda-gola-alta",
    category: "vestidos",
    collection: "essencia-atemporal",
    price: 42990,
    color: "Sálvia",
    description:
      "Renda delicada, gola alta e uma silhueta que acompanha o movimento. Uma proposta feminina para composições especiais.",
  },
  {
    key: "ivory-lace",
    name: "Conjunto Laise Premium",
    slug: "conjunto-laise-premium",
    category: "conjuntos",
    collection: "essencia-atemporal",
    price: 48990,
    color: "Marfim",
    description:
      "O encontro entre textura e leveza. Camisa em renda e calça de corte amplo para um visual naturalmente elegante.",
  },
  {
    key: "blue-tailoring",
    name: "Conjunto Alfaiataria Colete",
    slug: "conjunto-alfaiataria-colete",
    category: "alfaiataria",
    collection: "essencia-atemporal",
    price: 45990,
    color: "Azul névoa",
    description:
      "Linhas precisas e uma cor suave. Colete alongado e calça de cintura alta em uma composição contemporânea.",
  },
  {
    key: "floral-dress",
    name: "Vestido Floral Midi",
    slug: "vestido-floral-midi",
    category: "vestidos",
    collection: "luz-de-verao",
    price: 39990,
    color: "Floral damasco",
    description:
      "Flores em tons suaves, alças delicadas e um caimento fluido. Uma inspiração para os dias de luz.",
  },
  {
    key: "black-dress",
    name: "Vestido Cetim Assimétrico",
    slug: "vestido-cetim-assimetrico",
    category: "vestidos",
    collection: "essencia-atemporal",
    price: 44990,
    color: "Preto",
    description:
      "Brilho sutil e drapeado delicado em uma silhueta midi. Uma proposta elegante para ocasiões especiais.",
  },
  {
    key: "sand-linen",
    name: "Conjunto Linho Essencial",
    slug: "conjunto-linho-essencial",
    category: "essenciais",
    collection: "luz-de-verao",
    price: 46990,
    color: "Areia",
    description:
      "A beleza dos tons naturais em uma composição leve. Camisa de linhas relaxadas e calça ampla para vestir com intenção.",
  },
];
let createdProducts = 0;
for (const [index, piece] of pieces.entries()) {
  const productId = id(`product:${piece.key}`);
  const result = await insertMissing("products", {
    id: productId,
    name: piece.name,
    slug: piece.slug,
    sku: `DEMO-ZM-${String(index + 1).padStart(3, "0")}`,
    description: `${piece.description}\n\nPeça ilustrativa: imagem e valor de exemplo para personalização da loja. Não representa mercadoria disponível para compra.`,
    short_description: piece.description,
    price_cents: piece.price,
    promo_cents: null,
    status: "draft",
    featured: index < 4,
    sort_order: index,
    category_id: id(`category:${piece.category}`),
    collection_id: id(`collection:${piece.collection}`),
    details: {
      tags: ["ilustrativo", "zion-maison", "modelo-zion-v1"],
      composition:
        "Informação de exemplo. Substitua pela composição real informada pelo fabricante.",
      care: "Informação de exemplo. Cadastre aqui os cuidados reais da peça.",
      measurements:
        "Informe as medidas reais de cada tamanho antes de disponibilizar esta peça para compra.",
    },
  });
  const pendingImport =
    !result.created &&
    result.row.status === "draft" &&
    result.row.version === 0 &&
    Array.isArray(result.row.details?.tags) &&
    result.row.details.tags.includes("modelo-zion-v1");
  if (!result.created && !pendingImport) continue;
  for (const size of ["P", "M", "G"])
    await insertMissing("variants", {
      id: id(`variant:${piece.key}:${size}`),
      product_id: productId,
      color: piece.color,
      size,
      sku: null,
      stock: 0,
      low_stock: 2,
      active: true,
    });
  await insertMissing("product_media", {
    id: id(`product-media:${piece.key}`),
    product_id: productId,
    asset_id: assets[piece.key].id,
    color: null,
    sort_order: 0,
  });
  const { error } = await db
    .from("products")
    .update({
      status: "published",
      details: {
        ...result.row.details,
        tags: result.row.details.tags.filter(
          (tag: string) => tag !== "modelo-zion-v1",
        ),
      },
    })
    .eq("id", productId)
    .eq("status", "draft")
    .eq("version", 0);
  checkDb(error);
  createdProducts++;
}
const entries = [
  {
    key: "hero",
    kind: "hero",
    title: "Elegância que acompanha você.",
    slug: "banner-principal",
    body: {
      image_url: assets.hero.url,
      mobile_image_url: assets["ivory-lace"].url,
      alt: "Editorial ilustrativo Zion Maison, conjunto marfim em uma galeria de pedra natural.",
      subtitle:
        "Peças atemporais que unem personalidade, qualidade e versatilidade.",
      cta_label: "Explorar coleção",
      cta_href: "/catalogo",
    },
  },
  {
    key: "story",
    kind: "section",
    title: "Mais que moda, uma maneira de se expressar.",
    slug: "historia-da-maison",
    body: {
      image_url: assets["sand-linen"].url,
      subtitle: "O universo Zion",
      text: "Acreditamos em escolhas que fazem sentido para você. Texturas, cores e formas se encontram em uma curadoria que valoriza a sua essência e acompanha cada momento da vida.",
      cta_label: "Conheça nossa história",
      cta_href: "/sobre",
    },
  },
  {
    key: "editorial",
    kind: "section",
    title: "A leveza de ser você.",
    slug: "editorial-luz-natural",
    body: {
      image_url: assets["floral-dress"].url,
      subtitle: "Luz de Verão · Editorial ilustrativo",
      text: "Tons suaves, linhas fluidas e detalhes que convidam a olhar de perto. Descubra uma coleção pensada para inspirar novas combinações.",
      cta_label: "Descobrir a coleção",
      cta_href: "/colecoes/luz-de-verao",
    },
  },
  {
    key: "look-blue",
    kind: "look",
    title: "Elegância em azul",
    slug: "elegancia-em-azul",
    body: {
      image_url: assets["blue-tailoring"].url,
      text: "Uma composição ilustrativa de alfaiataria em azul suave, com linhas que equilibram presença e leveza.",
    },
  },
  {
    key: "look-natural",
    kind: "look",
    title: "Essência natural",
    slug: "essencia-natural",
    body: {
      image_url: assets["sand-linen"].url,
      text: "Uma inspiração ilustrativa em tons de areia, texturas naturais e formas leves.",
    },
  },
  {
    key: "about",
    kind: "page",
    title: "O universo Zion Maison",
    slug: "sobre",
    body: {
      image_url: assets.hero.url,
      text: "Mais que moda, uma maneira de se expressar.\n\nA Zion Maison reúne elegância atemporal, personalidade e versatilidade. Nosso olhar se volta aos detalhes que tornam cada escolha especial: uma textura delicada, uma forma bem desenhada, uma cor que traduz um momento.\n\nEsta coleção de apresentação usa imagens e peças ilustrativas, prontas para serem substituídas pela curadoria real da marca. Personalize esta história com a essência da sua Maison.",
    },
  },
  ...["sage-dress", "ivory-lace", "blue-tailoring", "floral-dress"].map(
    (key, index) => ({
      key: `instagram-${key}`,
      kind: "instagram",
      title: [
        "Texturas que inspiram",
        "Delicadeza em cada detalhe",
        "Linhas que acompanham",
        "Um convite à leveza",
      ][index],
      slug: `olhar-maison-${index + 1}`,
      body: {
        image_url: assets[key].url,
        alt: "Imagem editorial ilustrativa para apresentação da Zion Maison.",
        cta_href: `/produto/${pieces.find((piece) => piece.key === key)!.slug}`,
      },
    }),
  ),
  ...["ivory-lace", "blue-tailoring", "floral-dress"].map((key, index) => ({
    key: `video-${key}`,
    kind: "video",
    title: [
      "Texturas em movimento · ilustrativo",
      "Alfaiataria leve · ilustrativo",
      "Dias de luz · ilustrativo",
    ][index],
    slug: `zion-motion-${index + 1}`,
    body: {
      video_url: assets[`${key}-motion`].url,
      poster_url: assets[key].url,
      text: "Movimento editorial criado a partir de uma imagem ilustrativa.",
      cta_label: "Conhecer a peça",
      cta_href: `/produto/${pieces.find((piece) => piece.key === key)!.slug}`,
    },
  })),
];
let createdContent = 0;
for (const [index, entry] of entries.entries()) {
  const result = await insertMissing("content_entries", {
    id: id(`content:${entry.key}`),
    kind: entry.kind,
    title: entry.title,
    slug: entry.slug,
    body: entry.body,
    status: "published",
    sort_order: index,
  });
  if (result.created) createdContent++;
}
for (const [look, key] of [
  ["look-blue", "blue-tailoring"],
  ["look-natural", "sand-linen"],
])
  await insertMissing("look_items", {
    id: id(`look-item:${key}`),
    look_id: id(`content:${look}`),
    product_id: id(`product:${key}`),
    x: 52,
    y: 48,
    sort_order: 0,
  });
const { data: settings, error: settingsError } = await db
  .from("site_settings")
  .select("data")
  .eq("id", "public")
  .single();
checkDb(settingsError);
if (
  settings?.data.announcement === "Enviamos para todo o Brasil" &&
  createdProducts
) {
  const { error } = await db
    .from("site_settings")
    .update({
      data: {
        ...settings.data,
        announcement:
          "Vitrine ilustrativa · Imagens, peças e valores de exemplo",
      },
    })
    .eq("id", "public");
  checkDb(error);
}
const manifest = {
  version: 1,
  project: process.env.NEXT_PUBLIC_SUPABASE_URL,
  assets: Object.fromEntries(
    Object.entries(assets).map(([key, asset]) => [
      key,
      { id: asset.id, url: asset.url },
    ]),
  ),
  products: pieces.map((piece) => ({
    id: id(`product:${piece.key}`),
    slug: piece.slug,
  })),
  content: entries.map((entry) => ({
    id: id(`content:${entry.key}`),
    kind: entry.kind,
    slug: entry.slug,
  })),
};
await writeFile(
  "assets/illustrative/published.json",
  JSON.stringify(manifest, null, 2) + "\n",
);
console.log(
  JSON.stringify({
    createdProducts,
    createdContent,
    media: Object.keys(assets).length,
    stock: "zero",
    editable: true,
  }),
);
