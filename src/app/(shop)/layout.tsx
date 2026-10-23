import Link from "next/link";
import { getSettings } from "@/server/catalog";
import { Header, Wordmark } from "@/components/shop/header";
import { Tracking } from "@/components/tracking";
export async function generateMetadata() {
  const settings = await getSettings();
  return { icons: settings.icon_url ? { icon: settings.icon_url } : undefined };
}
export const dynamic = "force-dynamic";
export default async function ShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const settings = await getSettings();
  return (
    <>
      <Header settings={settings} />
      <main id="conteudo">{children}</main>
      <footer className="site-footer">
        <div className="footer-brand">
          <Wordmark settings={settings} />
          <p>
            Elegância em cada detalhe.
            <br />
            Personalidade em cada escolha.
          </p>
          <a
            href={settings.instagram}
            target="_blank"
            rel="noopener noreferrer"
          >
            Instagram ↗
          </a>
        </div>
        <div>
          <p className="eyebrow">Explore</p>
          <Link href="/catalogo">Nossa coleção</Link>
          <Link href="/looks">Shop the Look</Link>
          <Link href="/sobre">Sobre a Maison</Link>
          <Link href="/contato">Fale com a Zion</Link>
        </div>
        <div>
          <p className="eyebrow">Para você</p>
          <Link href="/entregas">Entregas</Link>
          <Link href="/trocas-e-devolucoes">Trocas e devoluções</Link>
          <Link href="/privacidade">Privacidade</Link>
          <Link href="/termos">Termos de uso</Link>
          <button
            className="text-link"
            onClick={undefined}
            id="privacy-preferences"
          >
            Preferências de privacidade
          </button>
        </div>
        <div className="footer-note">
          <p className="eyebrow">Feito para acompanhar você</p>
          <p>
            Peças escolhidas com intenção.
            <br />
            Atendimento com proximidade.
          </p>
          {settings.business_id && <p>{settings.business_id}</p>}
          {settings.address && <p>{settings.address}</p>}
          <Link href="/admin" className="admin-entry">
            Acesso administrativo ↗
          </Link>
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} Zion Maison</span>
          <span>MODA COM SIGNIFICADO</span>
          <span>Brasil</span>
        </div>
      </footer>
      <Tracking />
    </>
  );
}
