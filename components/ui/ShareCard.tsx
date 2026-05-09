"use client";
import { useState } from "react";
import { Share2, Copy, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SharePayload } from "@/types/extended";
import { LEVEL_COLORS } from "@/lib/ranking/system";

interface ShareCardProps {
  payload:   SharePayload;
  className?: string;
}

function buildShareText(p: SharePayload): string {
  const lines = [
    `🏎 APEX Sim Racing`,
    ``,
    `Lap: ${p.lapTimeStr}  ${p.deltaStr}`,
    `Score: ${p.score}/100 · ${p.level}`,
    `Top ${100 - p.percentile}% of drivers`,
    p.track ? `Track: ${p.track}` : "",
    ``,
    p.improvements.length > 0 ? `✓ ${p.improvements[0]}` : "",
    ``,
    `apex-racing.app`,
  ].filter((l) => l !== null && l !== undefined);

  return lines.filter(Boolean).join("\n");
}

export function ShareCard({ payload, className }: ShareCardProps) {
  const [open,   setOpen]   = useState(false);
  const [copied, setCopied] = useState(false);

  const shareText = buildShareText(payload);
  const levelColor = LEVEL_COLORS[payload.level];

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: "My APEX lap result",
          text:  shareText,
        });
      } catch {}
    } else {
      handleCopy();
    }
  };

  return (
    <div className={cn("relative", className)}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-700 bg-zinc-800 hover:border-zinc-600 text-xs text-zinc-300 transition-colors font-mono"
      >
        <Share2 size={12} />
        Share
      </button>

      {open && (
        <div className="absolute right-0 top-10 z-30 w-72 rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl overflow-hidden animate-slide-up">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
            <p className="text-xs font-medium text-zinc-300">Share your result</p>
            <button onClick={() => setOpen(false)}>
              <X size={13} className="text-zinc-500 hover:text-zinc-300 transition-colors" />
            </button>
          </div>

          {/* Preview card */}
          <div className="m-3 rounded-xl border border-zinc-700 bg-zinc-800 p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-5 h-5 rounded bg-lime-400 flex items-center justify-center">
                <span className="text-zinc-950 text-[9px] font-bold">AP</span>
              </div>
              <p className="text-xs font-semibold text-zinc-200">APEX Sim Racing</p>
            </div>
            <div className="flex items-baseline gap-3 mb-1">
              <p className="text-xl font-mono font-bold text-lime-400">{payload.lapTimeStr}</p>
              <p className="text-sm font-mono text-zinc-400">{payload.deltaStr}</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-mono px-2 py-0.5 rounded-md border border-zinc-600 text-zinc-300">
                {payload.score}/100
              </span>
              <span className="text-xs font-mono font-semibold" style={{ color: levelColor }}>
                {payload.level}
              </span>
              <span className="text-xs text-zinc-500">· Top {100 - payload.percentile}%</span>
            </div>
            {payload.improvements[0] && (
              <p className="text-[11px] text-lime-400 mt-2">✓ {payload.improvements[0]}</p>
            )}
          </div>

          {/* Actions */}
          <div className="px-3 pb-3 flex gap-2">
            <button onClick={handleCopy}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border text-xs font-mono transition-all",
                copied
                  ? "border-lime-400/40 bg-lime-400/10 text-lime-400"
                  : "border-zinc-700 text-zinc-400 hover:text-zinc-200"
              )}>
              {copied ? <Check size={12} /> : <Copy size={12} />}
              {copied ? "Copied!" : "Copy text"}
            </button>
            <button onClick={handleNativeShare}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-lime-400 hover:bg-lime-300 text-zinc-950 text-xs font-semibold transition-colors">
              <Share2 size={12} />
              Share
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
