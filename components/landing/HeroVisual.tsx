"use client";

import { CircuitDrawing } from "@/components/catalog/CatalogVisuals";

/** Full-bleed track visual for the landing hero — product atmosphere, not a card. */
export function HeroVisual() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden animate-hero-visual">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_40%,rgba(163,230,53,0.08),transparent_55%),linear-gradient(180deg,#09090b_0%,#0c0c0f_45%,#09090b_100%)]" />
      <div
        className="absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage:
            "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />
      <div className="absolute -right-[8%] top-[8%] h-[88%] w-[70%] max-w-none opacity-90 sm:-right-[4%] sm:w-[62%] lg:w-[58%]">
        <div className="h-full w-full [&_svg]:h-full [&_svg]:w-full [&_path]:animate-track-draw">
          <CircuitDrawing id="monza" label="Monza" />
        </div>
      </div>
      <div className="absolute inset-y-0 left-0 w-full bg-gradient-to-r from-zinc-950 via-zinc-950/85 to-transparent sm:w-[58%] lg:w-[52%]" />
      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-zinc-950 to-transparent" />
    </div>
  );
}
