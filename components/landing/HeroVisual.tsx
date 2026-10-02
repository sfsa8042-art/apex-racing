"use client";

/** Full-bleed racing photograph — the product world, not a decorative SVG. */
export function HeroVisual() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <picture>
        <source
          media="(max-width: 767px)"
          srcSet="/images/cars/porsche-640.webp 640w, /images/cars/porsche-1200.webp 1200w"
          sizes="100vw"
        />
        <img
          src="/images/cars/porsche-1800.webp"
          srcSet="/images/cars/porsche-1200.webp 1200w, /images/cars/porsche-1800.webp 1800w"
          sizes="100vw"
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-[68%_45%] sm:object-[72%_40%]"
          fetchPriority="high"
        />
      </picture>

      {/* Keep type readable without killing the photograph */}
      <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-950/88 to-zinc-950/25 sm:via-zinc-950/78 sm:to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-zinc-950/55" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-zinc-950 to-transparent" />
    </div>
  );
}
