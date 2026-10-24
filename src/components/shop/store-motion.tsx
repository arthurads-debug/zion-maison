"use client";
import { useEffect, useRef, type ReactNode } from "react";

/** Progressive enhancement: server-rendered content stays readable without JS. */
export function StoreMotion({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const container = root.current;
    if (!container || !window.IntersectionObserver) return;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const animations = new Set<Animation>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          observer.unobserve(entry.target);
          if (
            preference.matches ||
            entry.target.contains(document.activeElement)
          )
            continue;
          const animation = entry.target.animate(
            [
              { opacity: 0, transform: "translateY(22px)" },
              { opacity: 1, transform: "translateY(0)" },
            ],
            { duration: 650, easing: "cubic-bezier(0.23, 1, 0.32, 1)" },
          );
          animations.add(animation);
          animation.finished.then(
            () => animations.delete(animation),
            () => animations.delete(animation),
          );
        }
      },
      { threshold: 0.12 },
    );
    container
      .querySelectorAll(
        ".section-top, .section-heading, .story-copy, .editorial-copy, .closing-section > div",
      )
      .forEach((element) => observer.observe(element));
    const stop = () => {
      if (preference.matches)
        animations.forEach((animation) => animation.cancel());
    };
    preference.addEventListener("change", stop);
    return () => {
      observer.disconnect();
      animations.forEach((animation) => animation.cancel());
      preference.removeEventListener("change", stop);
    };
  }, []);
  return (
    <div className="shop-experience" ref={root}>
      {children}
    </div>
  );
}
