import { ReelsSection } from "@/components/shop/reels-section";
import { notFound } from "next/navigation";
import { ProductDetail } from "@/components/shop/product-detail";
import { ProductCard } from "@/components/shop/product-card";
import { Cart } from "@/components/shop/selection";
import { ProductEditor } from "@/components/admin/product-editor";
import { AdminShell } from "@/components/admin/shell";
import { ResourceEditor } from "@/components/admin/resource-editor";
import { AdminHome } from "@/components/admin/home";
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
  else if (screen === "content")
    content = <ResourceEditor resource="content" title="Conteúdo da loja" />;
  else if (screen === "reports") content = <Dashboard />;
  else if (screen === "admin")
    content = (
      <AdminHome
        profile={{
          user_id: "test",
          display_name: "Proprietária",
          role: "owner",
          active: true,
          permissions: [],
        }}
      />
    );
  else if (screen === "reels")
    content = (
      <ReelsSection
        items={Array.from({ length: 5 }, (_, i) => ({
          id: String(i),
          src: "/testing/video",
          poster: "/testing/asset",
          title: `Vídeo de teste ${i + 1}`,
        }))}
      />
    );
  else notFound();
  const badge = (
    <div role="note" className="notice">
      AMBIENTE DE TESTE — produtos e métricas fictícios, isolados da produção.
    </div>
  );
  return ["editor", "admin", "reports", "media", "content"].includes(screen) ? (
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
