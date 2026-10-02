"use client";

/**
 * Full-bleed hero photograph at retina-ready resolution.
 * Source: Wikimedia Commons original 8256×5504 JPEG (Osajus Photography, CC BY 2.0),
 * cropped to 16:9 and Lanczos-scaled to 1920 / 2560 / 3840 at WebP q≈96–98
 * with a high-quality JPEG fallback.
 */
export function HeroVisual() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <picture>
        <source
          type="image/webp"
          srcSet={[
            "/images/hero/mercedes-1920.webp 1920w",
            "/images/hero/mercedes-2560.webp 2560w",
            "/images/hero/mercedes-3840.webp 3840w",
          ].join(", ")}
          sizes="100vw"
        />
        <img
          src="/images/hero/mercedes-3840.jpg"
          srcSet="/images/hero/mercedes-3840.jpg 3840w"
          sizes="100vw"
          width={3840}
          height={2160}
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-[center_45%]"
          fetchPriority="high"
          decoding="sync"
        />
      </picture>

      {/* Light veil — keep headlights and body detail visible */}
      <div className="absolute inset-0 bg-gradient-to-r from-zinc-950/85 via-zinc-950/40 to-zinc-950/10" />
      <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-zinc-950/75 via-zinc-950/20 to-transparent" />
      <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-zinc-950/55 to-transparent" />
    </div>
  );
}
