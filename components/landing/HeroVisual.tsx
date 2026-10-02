"use client";

/**
 * Full-bleed hero photograph at retina-ready resolution.
 * Source: Wikimedia Commons original 4000×3000 (SmackJam, CC BY-SA 4.0),
 * cropped to 16:9 and Lanczos-scaled to 1920 / 2560 / 3840 at WebP q≈95–98
 * with a high-quality JPEG fallback.
 */
export function HeroVisual() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <picture>
        <source
          type="image/webp"
          srcSet={[
            "/images/hero/porsche-1920.webp 1920w",
            "/images/hero/porsche-2560.webp 2560w",
            "/images/hero/porsche-3840.webp 3840w",
          ].join(", ")}
          sizes="100vw"
        />
        <img
          src="/images/hero/porsche-3840.jpg"
          srcSet="/images/hero/porsche-3840.jpg 3840w"
          sizes="100vw"
          width={3840}
          height={2160}
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-center"
          fetchPriority="high"
          decoding="sync"
        />
      </picture>

      {/* Minimal veil — text stays readable, photo stays vivid */}
      <div className="absolute inset-0 bg-gradient-to-r from-zinc-950/80 via-zinc-950/35 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-zinc-950/70 to-transparent" />
      <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-zinc-950/50 to-transparent" />
    </div>
  );
}
