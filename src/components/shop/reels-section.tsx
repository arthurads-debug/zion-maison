"use client";
import { useEffect, useId, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Play } from "lucide-react";
import { EditorialVideo } from "./editorial-video";
export type Reel = {
  id: string;
  src: string;
  poster: string;
  title: string;
  href?: string;
  ctaLabel?: string;
};
export function ReelsSection({
  items,
}: {
  items: Reel[];
  "data-home-block"?: string;
}) {
  const track = useRef<HTMLDivElement>(null);
  const id = useId();
  const [edges, setEdges] = useState({ start: true, end: true });
  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const update = () =>
      setEdges((previous) => {
        const next = {
          start: el.scrollLeft < 2,
          end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 2,
        };
        return previous.start === next.start && previous.end === next.end
          ? previous
          : next;
      });
    el.addEventListener("scroll", update, { passive: true });
    const resize = new ResizeObserver(update);
    resize.observe(el);
    update();
    return () => {
      el.removeEventListener("scroll", update);
      resize.disconnect();
    };
  }, [items.length]);
  function move(direction: number) {
    const el = track.current;
    if (!el) return;
    el.scrollBy({
      left: direction * (el.clientWidth + 16),
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    });
  }
  return (
    <section
      className="section reels-section"
      data-home-block="videos"
      aria-labelledby={`${id}-heading`}
    >
      <div className="section-top reels-heading">
        <div>
          <p className="eyebrow">A elegância ganha movimento</p>
          <h2 id={`${id}-heading`}>Zion in Motion</h2>
          <p className="reels-description">
            Texturas, detalhes e novas maneiras de se expressar.
          </p>
        </div>
        {items.length > 0 && (
          <div className="reels-navigation">
            <button
              type="button"
              className="icon-button"
              aria-label="Vídeos anteriores"
              aria-controls={id}
              disabled={edges.start}
              onClick={() => move(-1)}
            >
              <ArrowLeft size={20} />
            </button>
            <button
              type="button"
              className="icon-button"
              aria-label="Próximos vídeos"
              aria-controls={id}
              disabled={edges.end}
              onClick={() => move(1)}
            >
              <ArrowRight size={20} />
            </button>
          </div>
        )}
      </div>
      {items.length > 0 ? (
        <>
          <div
            className="reels-track"
            id={id}
            ref={track}
            role="group"
            aria-label="Vídeos verticais da Maison"
          >
            {items.map((item) => (
              <EditorialVideo key={item.id} {...item} />
            ))}
          </div>
          <p className="reels-hint">
            Deslize para descobrir cada detalhe{" "}
            <span aria-hidden="true">↔</span>
          </p>
        </>
      ) : (
        <div className="reels-empty">
          <span className="reels-emblem" aria-hidden="true">
            <Play size={24} strokeWidth={1} />
          </span>
          <div>
            <p className="eyebrow">O olhar da Maison</p>
            <p>Novas histórias em movimento. Em breve, por aqui.</p>
          </div>
          <span className="reels-signature" aria-hidden="true">
            Z
          </span>
        </div>
      )}
    </section>
  );
}
