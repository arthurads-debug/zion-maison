import { whatsappUrl } from "@/lib/whatsapp";
import { notFound } from "next/navigation";
import { getContent, getSettings } from "@/server/catalog";
import { ResponsiveImage } from "@/components/responsive-image";
import { text, imageUrl } from "@/lib/content";
const titles: Record<string, string> = {
  sobre: "O universo Zion Maison",
  contato: "Uma conversa, muitas possibilidades.",
  privacidade: "Sua privacidade",
  "trocas-e-devolucoes": "Trocas e devoluções",
  entregas: "Informações de entrega",
  termos: "Termos de uso",
};
export async function generateMetadata({
  params,
}: {
  params: Promise<{ document: string }>;
}) {
  return { title: titles[(await params).document] || "Zion Maison" };
}
export default async function Document({
  params,
}: {
  params: Promise<{ document: string }>;
}) {
  const { document } = await params;
  if (!titles[document]) notFound();
  const [entries, settings] = await Promise.all([
    getContent("page"),
    getSettings(),
  ]);
  const entry = entries.find((e) => e.slug === document);
  return (
    <article className="legal-page">
      <p className="eyebrow">ZION MAISON</p>
      <h1>{entry?.title || titles[document]}</h1>
      {entry ? (
        <>
          {imageUrl(text(entry.body, "image_url")) && (
            <ResponsiveImage
              className="document-editorial-image"
              src={imageUrl(text(entry.body, "image_url"))}
              alt={entry.title}
              sizes="(max-width: 850px) 100vw, 800px"
            />
          )}
          <p>{text(entry.body, "text")}</p>
        </>
      ) : document === "sobre" ? (
        <>
          {settings.about ? (
            <p>{settings.about}</p>
          ) : (
            <>
              <h2>Mais que moda, uma maneira de se expressar.</h2>
              <p>
                A Zion Maison une elegância atemporal, personalidade, qualidade
                e versatilidade. Nossa boutique digital aproxima você das peças
                e do atendimento da marca.
              </p>
            </>
          )}
        </>
      ) : document === "contato" ? (
        <>
          <p>
            O atendimento e a finalização das compras acontecem pelo WhatsApp da
            loja.
          </p>
          {settings.whatsapp ? (
            <a
              href={whatsappUrl(
                settings.whatsapp,
                settings.default_message ||
                  "Olá! Gostaria de conhecer a Zion Maison.",
              )}
              className="button"
              target="_blank"
              rel="noreferrer"
            >
              Conversar com a Zion →
            </a>
          ) : (
            <p className="notice">
              O canal de WhatsApp ainda não foi informado pela administração.
            </p>
          )}
          {settings.email && (
            <p>
              <a href={`mailto:${settings.email}`}>{settings.email}</a>
            </p>
          )}
          <p>
            <a href={settings.instagram} target="_blank" rel="noreferrer">
              Instagram oficial ↗
            </a>
          </p>
        </>
      ) : document === "privacidade" ? (
        <>
          <p>
            Você pode navegar sem cadastro. Sua seleção e seus favoritos são
            guardados neste dispositivo. Seu nome é solicitado apenas para
            preparar o atendimento e só é lembrado localmente se você escolher
            essa opção.
          </p>
          <p>
            Estatísticas de navegação e ferramentas de marketing dependem das
            suas preferências. Você pode revê-las no rodapé. Recusar essas
            ferramentas não impede usar o catálogo.
          </p>
          <p className="notice">
            A identificação do responsável pelo tratamento, o canal de
            solicitações e a política completa de retenção serão publicados pela
            administração antes do lançamento comercial.
          </p>
        </>
      ) : (
        <p className="notice">
          Estas informações ainda precisam ser publicadas pela administração.
          Consulte a loja antes de concluir sua compra.
        </p>
      )}
    </article>
  );
}
