"use client";

/**
 * Full-bleed hero photograph.
 * Source: Wikimedia Commons original 4000×3000 JPEG, re-encoded at high quality
 * (q≈92 WebP + JPEG fallback) up to 3840px for sharp retina displays.
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
          height={2880}
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-[70%_42%] sm:object-[74%_40%]"
          fetchPriority="high"
          decoding="async"
        />
      </picture>

      {/* Soft readability veil — keep the photograph visible and sharp */}
      <div className="absolute inset-0 bg-gradient-to-r from-zinc-950/95 via-zinc-950/55 to-zinc-950/15 sm:via-zinc-950/45 sm:to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/25 to-zinc-950/40" />
    </div>
  );
}
