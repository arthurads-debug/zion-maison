import { notFound } from "next/navigation";
import { ProductDetail } from "@/components/shop/product-detail";
import { ProductCard } from "@/components/shop/product-card";
import { Cart } from "@/components/shop/selection";
import { ProductEditor } from "@/components/admin/product-editor";
import { AdminShell } from "@/components/admin/shell";
import { Dashboard } from "@/components/admin/dashboard";
import { MediaLibrary } from "@/components/admin/media-library";
import "../../admin/admin.css";
export const dynamic = "force-dynamic";
export default async function TestingPage({
  params,
}: {
  params: Promise<{ screen: string }>;
}) {
  if (process.env.NODE_ENV === "production" || process.env.ZION_E2E !== "1")
    notFound();
  const { fixtureProduct } = await import("../../../../tests/fixtures/catalog");
  const { screen } = await params;
  let content: React.ReactNode;
  if (screen === "product")
    content = <ProductDetail product={fixtureProduct} />;
  else if (screen === "card")
    content = <ProductCard product={fixtureProduct} />;
  else if (screen === "cart") content = <Cart />;
  else if (screen === "editor")
    content = <ProductEditor initial={fixtureProduct} />;
  else if (screen === "media") content = <MediaLibrary />;
  else if (screen === "admin") content = <Dashboard />;
  else notFound();
  const badge = (
    <div role="note" className="notice">
      AMBIENTE DE TESTE — produtos e métricas fictícios, isolados da produção.
    </div>
  );
  return ["editor", "admin", "media"].includes(screen) ? (
    <AdminShell
      profile={{
        user_id: "11111111-1111-4111-8111-111111111111",
        display_name: "Proprietária — teste",
        role: "owner",
        permissions: [],
        active: true,
      }}
    >
      {badge}
      {content}
    </AdminShell>
  ) : (
    <main id="conteudo" className="section">
      {badge}
      {content}
    </main>
  );
}
