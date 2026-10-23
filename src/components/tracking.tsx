"use client";
import { useEffect, useState, useRef } from "react";
import { usePathname } from "next/navigation";
import Script from "next/script";
import Link from "next/link";
import { attribution } from "@/lib/events";
import { useConsent, currentConsent, type Consent } from "./consent-store";
import {
  configureVendorConsent,
  queueVendorEvent,
  googleLoaded,
  metaLoaded,
} from "./vendor-tracking";
export function Tracking() {
  const path = usePathname();
  const lastPage = useRef("");
  const preferences = useConsent();
  const consent = preferences.consent;
  const [manualOpen, setOpen] = useState(false);
  const open = manualOpen || (preferences.ready && !consent);
  const [providers, setProviders] = useState<
    { provider: string; public_config: Record<string, string> }[]
  >([]);
  useEffect(() => {
    const button = document.getElementById("privacy-preferences");
    const show = () => setOpen(true);
    button?.addEventListener("click", show);
    return () => button?.removeEventListener("click", show);
  }, []);
  useEffect(() => {
    if (!consent?.analytics && !consent?.marketing) return;
    fetch("/api/tracking-config")
      .then((r) => r.json())
      .then((d) => setProviders(d.providers || []))
      .catch(() => {});
  }, [consent]);
  useEffect(() => {
    configureVendorConsent(consent || { analytics: false, marketing: false });
    if (!consent?.analytics) lastPage.current = "";
  }, [consent]);
  useEffect(() => {
    if (!consent?.analytics) return;
    function emit(detail: Record<string, unknown>) {
      try {
        let visitor = localStorage.getItem("zion-visitor");
        if (!visitor) {
          visitor = crypto.randomUUID();
          localStorage.setItem("zion-visitor", visitor);
        }
        let session = JSON.parse(
          localStorage.getItem("zion-session") || "null",
        );
        if (!session || Date.now() - session.last > 30 * 60 * 1000)
          session = {
            id: crypto.randomUUID(),
            last: Date.now(),
            attribution: attribution(location.href),
          };
        session.last = Date.now();
        localStorage.setItem("zion-session", JSON.stringify(session));
        const payload = {
          ...detail,
          id: crypto.randomUUID(),
          session_id: session.id,
          visitor_id: visitor,
          attribution: session.attribution,
        };
        void fetch("/api/events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          keepalive: true,
        }).catch(() => {});
        queueVendorEvent(
          String(detail.type),
          payload.id,
          detail.product_id
            ? {
                content_ids: [detail.product_id],
                content_type: "product",
                currency: "BRL",
              }
            : {},
        );
      } catch {
        /* Optional tracking never blocks browsing. */
      }
    }
    const newPage = lastPage.current !== path;
    if (newPage) {
      lastPage.current = path;
      emit({ type: "page_view", data: { path } });
    }
    const product = document
      .querySelector("[data-track-product]")
      ?.getAttribute("data-track-product");
    if (product && newPage)
      emit({ type: "view_item", product_id: product, data: { path } });
    const query = new URL(location.href).searchParams.get("q");
    if (query && newPage)
      emit({ type: "search", data: { query: query.slice(0, 100), path } });
    if (newPage && path === "/minha-selecao")
      emit({ type: "view_cart", data: { path } });
    const listener = (e: Event) => emit((e as CustomEvent).detail);
    window.addEventListener("zion-event", listener);
    return () => window.removeEventListener("zion-event", listener);
  }, [consent, path]);
  function save(value: Consent) {
    preferences.save(value);
    setOpen(false);
    if (!value.analytics) {
      localStorage.removeItem("zion-visitor");
      localStorage.removeItem("zion-session");
    }
  }
  const ga = providers.find((p) => p.provider === "analytics")?.public_config
    .measurement_id;
  const pixel = providers.find((p) => p.provider === "meta")?.public_config
    .pixel_id;
  return (
    <>
      {consent?.analytics && ga && /^G-[A-Z0-9]+$/.test(ga) && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${ga}`}
            strategy="afterInteractive"
            onReady={() => googleLoaded(ga, currentConsent())}
          />
        </>
      )}
      {consent?.marketing && pixel && /^\d+$/.test(pixel) && (
        <>
          <Script id="meta-init">{`if(!window.fbq){var f=function(){f.queue.push(arguments)};f.queue=[];f.loaded=true;f.version='2.0';window.fbq=f;window._fbq=f;}`}</Script>
          <Script
            src="https://connect.facebook.net/en_US/fbevents.js"
            strategy="afterInteractive"
            onReady={() => metaLoaded(pixel, currentConsent())}
          />
        </>
      )}
      {open && (
        <section
          className="consent-banner"
          aria-label="Preferências de privacidade"
        >
          <div>
            <p className="eyebrow">Sua privacidade, sua escolha</p>
            <p>
              Usamos armazenamento essencial para sua seleção. Com sua
              permissão, medimos a navegação e campanhas para melhorar a
              experiência. <Link href="/privacidade">Saiba mais</Link>.
            </p>
          </div>
          <div className="consent-actions">
            <button
              className="button outline small"
              onClick={() => save({ analytics: false, marketing: false })}
            >
              Somente essenciais
            </button>
            <button
              className="button outline small"
              onClick={() => save({ analytics: true, marketing: false })}
            >
              Permitir estatísticas
            </button>
            <button
              className="button small"
              onClick={() => save({ analytics: true, marketing: true })}
            >
              Permitir todos
            </button>
          </div>
        </section>
      )}
    </>
  );
}
