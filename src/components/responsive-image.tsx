import type { ImgHTMLAttributes } from "react";
export function ResponsiveImage({
  src,
  alt = "",
  sizes = "(max-width: 600px) 50vw, 25vw",
  loading = "lazy",
  fetchPriority,
  ...props
}: ImgHTMLAttributes<HTMLImageElement>) {
  const derivatives =
    typeof src === "string" &&
    /\/storage\/v1\/object\/public\/published\/[a-f0-9-]{36}\.webp$/.test(src);
  const srcSet = derivatives
    ? [360, 720, 1200, 2000]
        .map((width) => `${src.replace(/\.webp$/, `-${width}.webp`)} ${width}w`)
        .join(", ")
    : undefined;
  // Images are transformed and stripped server-side at upload; responsive files are immutable Storage assets.
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      srcSet={srcSet}
      sizes={srcSet ? sizes : undefined}
      loading={fetchPriority === "high" ? "eager" : loading}
      fetchPriority={fetchPriority}
      decoding="async"
      {...props}
    />
  );
}
