import { notFound } from "next/navigation";
import { requireAdmin } from "@/server/auth";
import { productSelect } from "@/server/catalog";
import { checkDb } from "@/server/supabase";
import { ProductEditor } from "@/components/admin/product-editor";
import type { Product } from "@/lib/domain";
export default async function EditProduct({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { db } = await requireAdmin("products.write");
  let initial: Product | null = null;
  if (id !== "novo") {
    const { data, error } = await db
      .from("products")
      .select(productSelect)
      .eq("id", id)
      .maybeSingle();
    checkDb(error);
    if (!data) notFound();
    initial = data as unknown as Product;
  }
  return (
    <ProductEditor
      key={`${id}-${initial?.version}`}
      initial={initial}
      initialTab={(await searchParams).tab}
    />
  );
}
