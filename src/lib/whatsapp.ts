import { money, type Snapshot } from "./domain";
export function whatsappUrl(number: string, message: string) {
  if (!/^[1-9]\d{9,14}$/.test(number))
    throw new Error("WhatsApp da loja ainda não configurado.");
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}
export function buildWhatsAppMessage(
  name: string,
  items: Snapshot[],
  baseUrl: string,
) {
  const customer = name.trim();
  if (!customer || !items.length)
    throw new Error("Informe seu nome e selecione ao menos uma peça.");
  const link = (item: Snapshot) =>
    new URL(`/produto/${item.slug}`, baseUrl).href;
  if (items.length === 1) {
    const i = items[0];
    return `Olá! Me chamo ${customer} e estou entrando em contato através do site da Zion Maison.\n\nTenho interesse no seguinte produto:\n\nProduto: ${i.name}\nCor: ${i.color}\nTamanho: ${i.size}\nQuantidade: ${i.quantity}\nValor exibido: ${money(i.unit_price_cents)}${i.quantity > 1 ? `\nSubtotal estimado: ${money(i.quantity * i.unit_price_cents)}` : ""}\n\nLink do produto: ${link(i)}\n\nGostaria de confirmar a disponibilidade e saber como posso finalizar minha compra. Obrigada!`;
  }
  return `Olá! Me chamo ${customer} e vim através do site da Zion Maison.\n\nGostaria de consultar a disponibilidade das seguintes peças:\n\n${items.map((i, n) => `${n + 1}. ${i.name}\nCor: ${i.color}\nTamanho: ${i.size}\nQuantidade: ${i.quantity}\nValor unitário: ${money(i.unit_price_cents)}\nSubtotal estimado: ${money(i.quantity * i.unit_price_cents)}\nLink: ${link(i)}`).join("\n\n")}\n\nTotal estimado: ${money(items.reduce((s, i) => s + i.unit_price_cents * i.quantity, 0))}\n\nGostaria de receber as informações para finalizar meu pedido!`;
}
