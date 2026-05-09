"use client";
import { useState, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";

interface BeforeAfterSliderProps {
  beforeLabel?: string;
  afterLabel?: string;
  beforeCost?: string;
  afterGain?: string;
  children: [React.ReactNode, React.ReactNode];
  className?: string;
}

export function BeforeAfterSlider({
  beforeLabel = "До", afterLabel = "После",
  beforeCost, afterGain,
  children, className,
}: BeforeAfterSliderProps) {
  const [pos, setPos] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const updatePos = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const p = Math.max(5, Math.min(95, ((clientX - rect.left) / rect.width) * 100));
    setPos(p);
  }, []);

  return (
    <div ref={containerRef}
      className={cn("relative rounded-xl overflow-hidden border border-zinc-700 select-none cursor-col-resize", className)}
      onMouseDown={() => { dragging.current = true; }}
      onMouseUp={() => { dragging.current = false; }}
      onMouseMove={e => { if (dragging.current) updatePos(e.clientX); }}
      onMouseLeave={() => { dragging.current = false; }}
      onTouchMove={e => updatePos(e.touches[0].clientX)}
    >
      {/* AFTER panel (full width, behind) */}
      <div className="w-full bg-zinc-900">
        {children[1]}
      </div>

      {/* BEFORE panel (clipped to left of slider) */}
      <div className="absolute inset-0 overflow-hidden" style={{ width: `${pos}%` }}>
        <div className="w-full bg-zinc-900" style={{ width: `${100 / (pos / 100)}%` }}>
          {children[0]}
        </div>
      </div>

      {/* Divider line */}
      <div className="absolute top-0 bottom-0 w-0.5 bg-white z-20 pointer-events-none"
        style={{ left: `${pos}%`, transform: "translateX(-50%)" }}>
        {/* Handle */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white shadow-xl flex items-center justify-center">
          <div className="flex gap-0.5">
            <div className="w-0.5 h-4 bg-zinc-400 rounded"/>
            <div className="w-0.5 h-4 bg-zinc-400 rounded"/>
          </div>
        </div>
      </div>

      {/* Labels */}
      <div className="absolute top-2 left-2 z-10 pointer-events-none">
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-zinc-950/90 border border-red-400/30">
          <span className="text-[10px] font-bold text-red-400 font-mono">{beforeLabel}</span>
          {beforeCost && <span className="text-[10px] font-mono text-red-400">· {beforeCost}</span>}
        </div>
      </div>
      <div className="absolute top-2 right-2 z-10 pointer-events-none">
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-zinc-950/90 border border-lime-400/30">
          <span className="text-[10px] font-bold text-lime-400 font-mono">{afterLabel}</span>
          {afterGain && <span className="text-[10px] font-mono text-lime-400">· {afterGain}</span>}
        </div>
      </div>

      {/* Drag hint (fades after first use) */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
        <p className="text-[9px] font-mono text-zinc-600">← перетащи →</p>
      </div>
    </div>
  );
}
