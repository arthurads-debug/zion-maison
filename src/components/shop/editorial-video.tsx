"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Pause, Play } from "lucide-react";
export function EditorialVideo({
  src,
  poster,
  title,
  href,
  ctaLabel = "Ver detalhes ↗",
}: {
  src: string;
  poster: string;
  title: string;
  href?: string;
  ctaLabel?: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const synchronize = useRef<() => void>(() => {});
  const manualPause = useRef(false),
    explicitPlay = useRef(false);
  const [playing, setPlaying] = useState(false),
    [failed, setFailed] = useState(false);
  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    let visible = false,
      disposed = false;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
      if (
        visible &&
        !document.hidden &&
        !manualPause.current &&
        (!reduced.matches || explicitPlay.current)
      ) {
        void video
          .play()
          .then(() => {
            if (disposed || !visible || document.hidden || manualPause.current)
              video.pause();
          })
          .catch(() => {});
      } else video.pause();
    };
    synchronize.current = update;
    const observer = new IntersectionObserver(
      (entries) => {
        visible =
          entries[0].isIntersecting && entries[0].intersectionRatio >= 0.5;
        update();
      },
      { threshold: 0.5 },
    );
    observer.observe(video);
    document.addEventListener("visibilitychange", update);
    reduced.addEventListener("change", update);
    return () => {
      disposed = true;
      observer.disconnect();
      document.removeEventListener("visibilitychange", update);
      reduced.removeEventListener("change", update);
      video.pause();
      synchronize.current = () => {};
    };
  }, [src]);
  return (
    <article className="motion-card" aria-label={title}>
      <video
        ref={ref}
        src={src}
        poster={poster || undefined}
        aria-label={title}
        muted
        playsInline
        loop
        preload="none"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onError={() => setFailed(true)}
        onLoadedData={() => setFailed(false)}
      />
      {!failed && (
        <button
          type="button"
          className="video-toggle icon-button"
          aria-label={playing ? "Pausar vídeo" : "Reproduzir vídeo"}
          onClick={() => {
            manualPause.current = playing;
            explicitPlay.current = !playing;
            synchronize.current();
          }}
        >
          {playing ? <Pause size={18} /> : <Play size={18} />}
        </button>
      )}
      {failed && (
        <p className="video-unavailable" role="status">
          Vídeo indisponível no momento.
        </p>
      )}
      <div className="video-caption">
        <p>{title}</p>
        {href && <Link href={href}>{ctaLabel}</Link>}
      </div>
    </article>
  );
}
