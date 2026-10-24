import type { Metadata, Viewport } from "next";
import "./globals.css";
import localFont from "next/font/local";
const reading = localFont({
  src: "./fonts/Manrope.ttf",
  variable: "--font-reading",
  display: "swap",
  weight: "200 800",
});
const editorial = localFont({
  src: [
    { path: "./fonts/Lora.ttf", weight: "400 700", style: "normal" },
    { path: "./fonts/Lora-Italic.ttf", weight: "400 700", style: "italic" },
  ],
  variable: "--font-editorial",
  display: "swap",
});
export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "http://127.0.0.1:3000",
  ),
  title: {
    default: "Zion Maison — Elegância atemporal",
    template: "%s | Zion Maison",
  },
  description:
    "Moda feminina contemporânea. Peças atemporais que traduzem personalidade, qualidade e versatilidade.",
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f8f5ef",
  colorScheme: "light",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      className={`${reading.variable} ${editorial.variable}`}
      lang="pt-BR"
      data-scroll-behavior="smooth"
    >
      <body>
        <a className="skip-link" href="#conteudo">
          Pular para o conteúdo
        </a>
        {children}
      </body>
    </html>
  );
}
