"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Pause, Play } from "lucide-react";
export function EditorialVideo({
  src,
  poster,
  title,
  href,
}: {
  src: string;
  poster: string;
  title: string;
  href: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const manual = useRef(false);
  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !reduced.matches && !manual.current) {
          void video.play().catch(() => setPlaying(false));
        } else video.pause();
      },
      { threshold: 0.5 },
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, []);
  return (
    <article className="motion-card">
      <video
        ref={ref}
        src={src}
        poster={poster}
        muted
        playsInline
        loop
        preload="none"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
      />
      <button
        className="video-toggle icon-button"
        aria-label={playing ? "Pausar vídeo" : "Reproduzir vídeo"}
        onClick={() => {
          manual.current = true;
          if (playing) ref.current?.pause();
          else void ref.current?.play().catch(() => setPlaying(false));
        }}
      >
        {playing ? <Pause size={18} /> : <Play size={18} />}
      </button>
      <div className="video-caption">
        <p>{title}</p>
        <Link href={href}>Comprar este look ↗</Link>
      </div>
    </article>
  );
}
