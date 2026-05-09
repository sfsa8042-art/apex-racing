"use client";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export type DiagramType =
  | "apex_late" | "apex_early" | "apex_compare"
  | "brake_trace" | "brake_trace_ok"
  | "trail_brake" | "trail_brake_compare"
  | "delta_explained" | "delta_sectors"
  | "throttle_exit" | "throttle_compare"
  | "racing_line_overview"
  | "oversteer" | "understeer";

interface ConceptDiagramProps {
  type: DiagramType;
  className?: string;
  animated?: boolean;
  compact?: boolean;
}

// ─── Shared SVG tokens ─────────────────────────────────────────────────────────
const LIME   = "#a3e635";
const RED    = "#f87171";
const YELLOW = "#facc15";
const BLUE   = "#60a5fa";
const ZINC8  = "#27272a";
const ZINC7  = "#3f3f46";

// ─── Animated SVG path ────────────────────────────────────────────────────────
function AnimPath({ d, stroke, width = 3, delay = 0, duration = 1.2, ...rest }: {
  d: string; stroke: string; width?: number; delay?: number; duration?: number;
  [k: string]: unknown;
}) {
  const ref = useRef<SVGPathElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const len = el.getTotalLength?.() ?? 300;
    el.style.strokeDasharray = String(len);
    el.style.strokeDashoffset = String(len);
    el.style.transition = "none";
    const t = setTimeout(() => {
      el.style.transition = `stroke-dashoffset ${duration}s cubic-bezier(0.4,0,0.2,1) ${delay}s`;
      el.style.strokeDashoffset = "0";
    }, 60);
    return () => clearTimeout(t);
  }, [d, delay, duration]);
  return <path ref={ref} d={d} fill="none" stroke={stroke} strokeWidth={width}
    strokeLinecap="round" strokeLinejoin="round" {...rest as any}/>;
}

// ─── Individual diagram components ────────────────────────────────────────────

function ApexCompare({ early }: { early?: boolean }) {
  const W = 380, H = 200;
  // Track background
  const outer = "M 10,80 Q 120,80 200,100 Q 260,116 340,116 L 340,136 Q 260,136 200,120 Q 120,100 10,100 Z";
  const goodLine = "M 10,95 Q 80,95 140,104 Q 200,114 260,112 Q 310,110 340,108";
  const badLine  = "M 10,95 Q 60,92 100,102 Q 140,112 170,110 Q 230,108 340,108";

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full">
      {/* Track surface */}
      <path d={outer} fill={ZINC8}/>
      {/* Track borders */}
      <path d="M 10,80 Q 120,80 200,100 Q 260,116 340,116" fill="none" stroke={ZINC7} strokeWidth="1.5"/>
      <path d="M 10,100 Q 120,100 200,120 Q 260,136 340,136" fill="none" stroke={ZINC7} strokeWidth="1.5"/>

      {/* Bad line */}
      {(early == null || early) && (
        <>
          <AnimPath d={badLine}  stroke={RED}  width={2.5} delay={0.3} duration={0.9}
            strokeDasharray="6,4" strokeOpacity="0.8"/>
          <circle cx="100" cy="102" r="6" fill="rgba(248,113,113,0.15)" stroke={RED} strokeWidth="1.5"/>
          <text x="100" y="88" textAnchor="middle" fontSize="9" fill={RED} fontFamily="monospace" fontWeight="700">⛔ ранний апекс</text>
        </>
      )}

      {/* Good line */}
      {(early == null || !early) && (
        <>
          <AnimPath d={goodLine} stroke={LIME} width={3}   delay={0.0} duration={1.0}/>
          <circle cx="200" cy="114" r="6" fill="rgba(163,230,53,0.15)" stroke={LIME} strokeWidth="1.5"/>
          <text x="210" y="100" textAnchor="start" fontSize="9" fill={LIME} fontFamily="monospace" fontWeight="700">✓ поздний апекс</text>
        </>
      )}

      {/* Direction arrows */}
      <text x="14" y="92" fontSize="10" fill="#71717a" fontFamily="monospace">→</text>
      {/* Throttle label */}
      {early == null && (
        <>
          <text x="270" y="100" fontSize="9" fill={LIME} fontFamily="monospace">⚡ газ раньше</text>
          <text x="248" y="128" fontSize="9" fill={RED}  fontFamily="monospace">🔒 газ задержан</text>
        </>
      )}
    </svg>
  );
}

function BrakeTrace({ optimized }: { optimized?: boolean }) {
  const W=380, H=160;
  // Reference
  const ref  = "M 20,130 L 100,130 L 112,24 L 210,24 L 222,130 L 360,130";
  // User (early/late)
  const bad  = "M 20,130 L 76,130 L 92,24  L 210,24 L 222,130 L 360,130";
  const good = "M 20,130 L 112,130 L 124,24 L 210,24 L 222,130 L 360,130";
  const userLine = optimized ? good : bad;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full">
      {/* Grid */}
      {[0.25,0.5,0.75].map(x=>(
        <line key={x} x1={x*340+20} y1="10" x2={x*340+20} y2="145" stroke={ZINC7} strokeWidth="0.8" strokeDasharray="3,3"/>
      ))}
      {[0.33,0.66].map(y=>(
        <line key={y} x1="20" y1={y*130+10} x2="370" y2={y*130+10} stroke={ZINC7} strokeWidth="0.8" strokeDasharray="3,3"/>
      ))}
      {/* Fill */}
      <path d={`${userLine} L 360,145 L 20,145 Z`} fill={optimized ? "rgba(163,230,53,0.05)" : "rgba(248,113,113,0.05)"}/>

      {/* Reference dashed */}
      <AnimPath d={ref} stroke="#52525b" width={2} delay={0} duration={0.8} strokeDasharray="7,5"/>
      {/* User solid */}
      <AnimPath d={userLine} stroke={optimized ? LIME : RED} width={3} delay={0.2} duration={1.0}/>

      {/* Annotations */}
      {!optimized && (
        <g>
          <line x1="76" y1="80" x2="50" y2="62" stroke={RED} strokeWidth="1.5" markerEnd="url(#arr)"/>
          <text x="14" y="58" fontSize="9" fill={RED} fontFamily="monospace" fontWeight="600">⚠ слишком рано</text>
          <text x="14" y="70" fontSize="8" fill="#71717a" fontFamily="monospace">−{(0.31).toFixed(2)}с</text>
        </g>
      )}
      {optimized && (
        <g>
          <line x1="124" y1="80" x2="150" y2="62" stroke={LIME} strokeWidth="1.5"/>
          <text x="154" y="58" fontSize="9" fill={LIME} fontFamily="monospace" fontWeight="600">✓ оптимально</text>
        </g>
      )}

      {/* Axis labels */}
      <text x="14" y="150" fontSize="8" fill="#52525b" fontFamily="monospace">вход</text>
      <text x="182" y="150" fontSize="8" fill="#52525b" fontFamily="monospace">апекс</text>
      <text x="342" y="150" fontSize="8" fill="#52525b" fontFamily="monospace">выход</text>
      <text x="14" y="26" fontSize="8" fill="#52525b" fontFamily="monospace">100%</text>
      <text x="14" y="83" fontSize="8" fill="#52525b" fontFamily="monospace">50%</text>
      <text x="14" y="135" fontSize="8" fill="#52525b" fontFamily="monospace">0%</text>

      {/* Legend */}
      <line x1="220" y1="14" x2="248" y2="14" stroke={optimized?LIME:RED} strokeWidth="2.5"/>
      <text x="252" y="18" fontSize="8" fill={optimized?LIME:RED} fontFamily="monospace">Ваш трейс</text>
      <line x1="220" y1="26" x2="248" y2="26" stroke="#52525b" strokeWidth="2" strokeDasharray="5,4"/>
      <text x="252" y="30" fontSize="8" fill="#52525b" fontFamily="monospace">Референс</text>
    </svg>
  );
}

function DeltaExplained() {
  const W=380, H=170;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full">
      <defs>
        <linearGradient id="dg1" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stopColor={LIME} stopOpacity="0.3"/>
          <stop offset="42%"  stopColor={LIME} stopOpacity="0.05"/>
          <stop offset="58%"  stopColor={RED}  stopOpacity="0.05"/>
          <stop offset="100%" stopColor={RED}  stopOpacity="0.3"/>
        </linearGradient>
      </defs>
      {/* Zero line */}
      <line x1="20" y1="85" x2="360" y2="85" stroke={ZINC7} strokeWidth="1.5" strokeDasharray="5,5"/>
      <text x="365" y="89" fontSize="8" fill="#52525b" fontFamily="monospace">0.000</text>

      {/* Fill area */}
      <path d="M 20,85 Q 80,70 130,60 Q 170,54 200,85 Q 240,116 280,124 Q 326,130 360,120 L 360,85 Z"
        fill="url(#dg1)"/>

      {/* Delta line */}
      <AnimPath d="M 20,85 Q 80,70 130,60 Q 170,54 200,85 Q 240,116 280,124 Q 326,130 360,120"
        stroke={LIME} width={3.5} delay={0} duration={1.2}/>

      {/* Colour change point */}
      <circle cx="200" cy="85" r="4" fill={YELLOW}/>
      <line x1="200" y1="60" x2="200" y2="140" stroke={YELLOW} strokeWidth="1" strokeDasharray="4,4" strokeOpacity="0.6"/>
      <text x="202" y="56" fontSize="8" fill={YELLOW} fontFamily="monospace">поворот 3</text>

      {/* Labels */}
      <text x="60" y="52" fontSize="9" fill={LIME} fontFamily="monospace" fontWeight="700">↑ Выигрываю</text>
      <text x="256" y="144" fontSize="9" fill={RED}  fontFamily="monospace" fontWeight="700">↓ Теряю</text>

      {/* Values */}
      <text x="365" y="122" fontSize="8" fill={RED} fontFamily="monospace">+0.8s</text>

      {/* Axes */}
      <line x1="20" y1="150" x2="360" y2="150" stroke={ZINC7} strokeWidth="0.8"/>
      <text x="14"  y="162" fontSize="8" fill="#52525b" fontFamily="monospace">Старт</text>
      <text x="338" y="162" fontSize="8" fill="#52525b" fontFamily="monospace">Финиш</text>
    </svg>
  );
}

function TrailBrakeCompare() {
  const W=380, H=190;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full">
      {/* Track corner */}
      <path d="M 20,160 Q 100,160 170,110 Q 220,70 340,55" fill="none" stroke={ZINC8} strokeWidth="28" strokeLinecap="round"/>
      <path d="M 20,160 Q 100,160 170,110 Q 220,70 340,55" fill="none" stroke="#1c1c1f" strokeWidth="22" strokeLinecap="round"/>
      {/* Track borders */}
      <path d="M 20,148 Q 100,148 166,98 Q 216,58 340,43" fill="none" stroke={ZINC7} strokeWidth="1.5" strokeOpacity="0.6"/>
      <path d="M 20,172 Q 100,172 174,122 Q 224,82 340,67" fill="none" stroke={ZINC7} strokeWidth="1.5" strokeOpacity="0.6"/>

      {/* No trail brake — hard stop then understeer */}
      <AnimPath d="M 20,152 L 70,150 L 72,145 Q 120,140 155,122 Q 195,98 340,58"
        stroke={RED} width={2.5} delay={0.3} duration={0.9} strokeDasharray="8,5"/>

      {/* Trail brake — smooth, stays on ideal line */}
      <AnimPath d="M 20,157 Q 80,156 130,148 Q 165,140 185,122 Q 218,96 340,56"
        stroke={LIME} width={3.5} delay={0.0} duration={1.0}/>

      {/* Brake pressure bar — good */}
      <rect x="30" y="12" width="90" height="8" rx="4" fill={ZINC8}/>
      <rect x="30" y="12" width="80" height="8" rx="4" fill={RED} opacity="0.9"/>
      <rect x="30" y="24" width="90" height="8" rx="4" fill={ZINC8}/>
      <rect x="30" y="24" width="35" height="8" rx="4" fill={YELLOW} opacity="0.8"/>
      <text x="128" y="19" fontSize="8" fill={LIME} fontFamily="monospace">Trail: постепенный сброс</text>
      <text x="128" y="31" fontSize="8" fill={RED}  fontFamily="monospace">Без trail: резкий стоп</text>

      {/* Legend */}
      <line x1="240" y1="170" x2="264" y2="170" stroke={LIME} strokeWidth="3"/>
      <text x="268" y="174" fontSize="9" fill={LIME} fontFamily="monospace">Trail brake</text>
      <line x1="240" y1="182" x2="264" y2="182" stroke={RED} strokeWidth="2.5" strokeDasharray="6,4"/>
      <text x="268" y="186" fontSize="9" fill={RED}  fontFamily="monospace">Без trail</text>
    </svg>
  );
}

function ThrottleExit() {
  const W=380, H=160;
  // Progressive throttle (good)
  const good = "M 20,130 L 80,130 Q 130,130 160,80 Q 185,40 230,22 L 360,22";
  // Snap throttle (bad — too early)
  const bad  = "M 20,130 L 60,130 L 62,22 L 360,22";
  // Lazy throttle (bad — too late)
  const lazy = "M 20,130 L 180,130 Q 230,130 260,80 Q 290,40 330,22 L 360,22";

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full">
      {/* Grid */}
      {[0.25,0.5,0.75].map(x=>(
        <line key={x} x1={x*340+20} y1="10" x2={x*340+20} y2="145" stroke={ZINC7} strokeWidth="0.8" strokeDasharray="3,3"/>
      ))}
      {/* Bad (snap) */}
      <AnimPath d={bad}  stroke={RED}    width={2} delay={0.2} duration={0.7} strokeDasharray="6,4" strokeOpacity="0.7"/>
      {/* Lazy */}
      <AnimPath d={lazy} stroke={YELLOW} width={2} delay={0.4} duration={0.8} strokeDasharray="4,4" strokeOpacity="0.7"/>
      {/* Good */}
      <AnimPath d={good} stroke={LIME}   width={3.5} delay={0} duration={1.0}/>

      {/* Labels */}
      <text x="82"  y="32" fontSize="9" fill={RED}    fontFamily="monospace">⚠ рывок — занос</text>
      <text x="230" y="120" fontSize="9" fill={YELLOW} fontFamily="monospace">⚠ слишком поздно</text>
      <text x="162" y="62" fontSize="9" fill={LIME}   fontFamily="monospace">✓ прогрессивно</text>

      {/* Axes */}
      <text x="14"  y="150" fontSize="8" fill="#52525b" fontFamily="monospace">апекс</text>
      <text x="330" y="150" fontSize="8" fill="#52525b" fontFamily="monospace">выход</text>
      <text x="14"  y="26"  fontSize="8" fill="#52525b" fontFamily="monospace">100%</text>
    </svg>
  );
}

function RacingLineOverview() {
  const W=380, H=200;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full">
      {/* Straight */}
      <rect x="80" y="10" width="220" height="30" rx="4" fill={ZINC8}/>
      {/* Corner track */}
      <path d="M 80,40 Q 80,130 180,165 Q 260,190 360,180 L 360,160 Q 280,172 200,148 Q 110,120 100,40 Z" fill={ZINC8}/>
      {/* Bad line — geometric apex */}
      <AnimPath
        d="M 190,22 Q 170,42 148,78 Q 134,108 148,138 Q 164,162 200,174"
        stroke={RED} width={2.5} delay={0.3} duration={0.8} strokeDasharray="8,5"/>
      {/* Good line — late apex */}
      <AnimPath
        d="M 190,22 Q 186,44 184,68 Q 184,100 192,128 Q 210,160 248,172"
        stroke={LIME} width={3.5} delay={0} duration={1.0}/>

      {/* Apex dots */}
      <circle cx="148" cy="108" r="6" fill={RED}  opacity="0.85"/>
      <circle cx="192" cy="118" r="6" fill={LIME} opacity="0.85"/>

      {/* Labels */}
      <text x="94"  y="100" fontSize="9" fill={RED}  fontFamily="monospace">⛔ ранний</text>
      <text x="214" y="120" fontSize="9" fill={LIME} fontFamily="monospace">✓ поздний</text>
      <text x="90"  y="22"  fontSize="9" fill="#52525b" fontFamily="monospace">→ прямая →</text>
      <text x="196" y="192" fontSize="9" fill="#52525b" fontFamily="monospace">→ прямая →</text>
    </svg>
  );
}

function DeltaSectors() {
  const W=380, H=150;
  const sectors = [
    { label:"S1", delta:-0.124, color:LIME   },
    { label:"S2", delta:+0.312, color:RED    },
    { label:"S3", delta:+0.094, color:YELLOW },
  ];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full">
      {sectors.map((s, i) => {
        const x = 30 + i * 114;
        const barH = Math.min(80, Math.abs(s.delta) * 200);
        const barY = s.delta < 0 ? 60 - barH : 60;
        return (
          <g key={s.label}>
            <rect x={x} y={barY} width={80} height={barH} rx="6" fill={s.color} opacity={0.25}/>
            <AnimPath
              d={`M ${x+4},${barY+barH} L ${x+4},${barY+4} Q ${x+4},${barY} ${x+8},${barY} L ${x+76},${barY} Q ${x+80},${barY} ${x+80},${barY+4} L ${x+80},${barY+barH}`}
              stroke={s.color} width={2} delay={i * 0.2} duration={0.7}/>
            <text x={x+40} y={50} textAnchor="middle" fontSize="9" fill={s.color} fontFamily="monospace" fontWeight="700">{s.label}</text>
            <text x={x+40} y={barY + (s.delta < 0 ? -6 : barH + 14)} textAnchor="middle" fontSize="10" fill={s.color} fontFamily="monospace" fontWeight="800">
              {s.delta > 0 ? "+" : ""}{s.delta.toFixed(3)}s
            </text>
          </g>
        );
      })}
      {/* Zero line */}
      <line x1="20" y1="60" x2="360" y2="60" stroke={ZINC7} strokeWidth="1.5" strokeDasharray="4,4"/>
      <text x="14" y="64" fontSize="8" fill="#52525b" fontFamily="monospace">0</text>
      <text x="100" y="140" fontSize="9" fill={LIME} fontFamily="monospace" textAnchor="middle">↑ опережение</text>
      <text x="220" y="140" fontSize="9" fill={RED}  fontFamily="monospace" textAnchor="middle">↓ потеря</text>
    </svg>
  );
}

// ─── Placeholder for types not yet implemented ─────────────────────────────────
function GenericPlaceholder({ type }: { type: string }) {
  return (
    <svg viewBox="0 0 380 160" className="w-full h-full">
      <rect x="10" y="10" width="360" height="140" rx="8" fill={ZINC8} stroke={ZINC7} strokeWidth="1"/>
      <text x="190" y="85" textAnchor="middle" fontSize="12" fill="#52525b" fontFamily="monospace">{type}</text>
    </svg>
  );
}

// ─── Wrapper ───────────────────────────────────────────────────────────────────
export function ConceptDiagram({ type, className, animated = true, compact = false }: ConceptDiagramProps) {
  const [visible, setVisible] = useState(!animated);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!animated) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true); }, { threshold: 0.2 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [animated]);

  const h = compact ? "h-32" : "h-44";

  return (
    <div ref={ref} className={cn(`rounded-xl bg-zinc-900/80 border border-zinc-800 overflow-hidden ${h}`, className)}
      style={{ opacity: visible ? 1 : 0, transform: visible ? "none" : "translateY(10px)", transition: "opacity 0.5s ease, transform 0.5s ease" }}>
      {visible && (
        <>
          {type === "apex_late"          && <ApexCompare early={false}/>}
          {type === "apex_early"         && <ApexCompare early={true}/>}
          {type === "apex_compare"       && <ApexCompare/>}
          {type === "brake_trace"        && <BrakeTrace optimized={false}/>}
          {type === "brake_trace_ok"     && <BrakeTrace optimized={true}/>}
          {type === "trail_brake"        && <TrailBrakeCompare/>}
          {type === "trail_brake_compare"&& <TrailBrakeCompare/>}
          {type === "delta_explained"    && <DeltaExplained/>}
          {type === "delta_sectors"      && <DeltaSectors/>}
          {type === "throttle_exit"      && <ThrottleExit/>}
          {type === "throttle_compare"   && <ThrottleExit/>}
          {type === "racing_line_overview"&&<RacingLineOverview/>}
          {!["apex_late","apex_early","apex_compare","brake_trace","brake_trace_ok",
             "trail_brake","trail_brake_compare","delta_explained","delta_sectors",
             "throttle_exit","throttle_compare","racing_line_overview",
             "oversteer","understeer"].includes(type) && <GenericPlaceholder type={type}/>}
        </>
      )}
    </div>
  );
}
