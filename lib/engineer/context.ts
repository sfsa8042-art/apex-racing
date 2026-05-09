/**
 * lib/engineer/context.ts
 * ARCHITECTURE: Raw telemetry NEVER goes to LLM.
 * Flow: ParsedLap → analyseLap() → LapAnalysisResult → buildEngineerContext()
 *       → compact structured context → LLM system prompt
 */
import type { LapAnalysisResult } from "@/types/telemetry";
import type { DriverProfile, PatternReport, ProgressSummary } from "@/types/extended";

export interface IssueEntry { type:string; corner:string; costMs:number; description:string }

export interface EngineerContext {
  lapTimeMs:number; refTimeMs:number; totalTimeLossMs:number; potentialGainMs:number;
  overallScore:number; trackName:string; filename:string;
  drivingStyle:string; brakeConfidence:number; throttleControl:number;
  cornerSpeed:number; consistency:number;
  mainIssues:IssueEntry[]; strongestCorner:string; weakestCorner:string;
  recurringMistakes:string[]; improvements:string[];
  sessionCount:number; trend:string;
  sectors:Array<{label:string;deltaMs:number;status:string}>;
}

export function buildEngineerContext(
  result:LapAnalysisResult, lapTimeMs:number, profile:DriverProfile|null,
  patterns:PatternReport|null, progress:ProgressSummary|null, filename:string
): EngineerContext {
  const refTimeMs = lapTimeMs - result.totalTimeDeltaMs;
  const mainIssues:IssueEntry[] = result.insights
    .filter(i => i.severity==="critical"||i.severity==="warning")
    .sort((a,b)=>b.timeCostMs-a.timeCostMs).slice(0,5)
    .map(i=>({
      type:(i as any).type??i.category,
      corner:i.titleRu?.split(":")[0]?.trim()??"Unknown",
      costMs:i.timeCostMs, description:i.descriptionRu
    }));
  const sortedSegs=[...result.segmentAnalyses]
    .filter(sa=>sa.segment.type==="corner").sort((a,b)=>a.deltaMs-b.deltaMs);
  const f=filename.toLowerCase();
  const trackName=f.includes("monza")?"Monza":f.includes("spa")?"Spa-Francorchamps":
    f.includes("silver")?"Silverstone":f.includes("nurb")?"Nürburgring":
    f.includes("suzuka")?"Suzuka":"the circuit";
  return {
    lapTimeMs,refTimeMs,totalTimeLossMs:result.totalTimeDeltaMs,
    potentialGainMs:result.optimalLap.potentialGainMs,overallScore:result.overallScore,
    trackName,filename,drivingStyle:profile?.style??"developing",
    brakeConfidence:profile?.brakeConfidence??50,throttleControl:profile?.throttleControl??50,
    cornerSpeed:profile?.cornerSpeed??50,consistency:profile?.consistency??50,
    mainIssues,
    strongestCorner:sortedSegs[0]?.segment.label??"Sector 1",
    weakestCorner:sortedSegs[sortedSegs.length-1]?.segment.label??"Sector 3",
    recurringMistakes:patterns?.patterns.filter(p=>!p.improving).map(p=>p.descriptionEn)??[],
    improvements:patterns?.improvingAreas??[],
    sessionCount:progress?.entries.length??1, trend:progress?.trend??"first",
    sectors:result.sectors.map(s=>({
      label:`S${s.sectorIdx+1}`,deltaMs:s.deltaMs,
      status:s.deltaMs>300?"critical":s.deltaMs>100?"warning":"good"
    }))
  };
}

export function serializeContextForLLM(ctx:EngineerContext):string {
  const fms=(ms:number)=>ms>=1000?`${(ms/1000).toFixed(3)}s`:`${ms}ms`;
  const flap=(ms:number)=>{const m=Math.floor(ms/60000),s=Math.floor((ms%60000)/1000),mil=ms%1000;return `${m}:${String(s).padStart(2,"0")}.${String(mil).padStart(3,"0")}`;};
  return `=== LAP DATA ===
Lap: ${flap(ctx.lapTimeMs)} | Ref: ${flap(ctx.refTimeMs)} | Gap: +${fms(ctx.totalTimeLossMs)}
Potential gain: ${fms(ctx.potentialGainMs)} | Score: ${ctx.overallScore}/100 | Track: ${ctx.trackName}
=== DRIVER ===
Style: ${ctx.drivingStyle} | Sessions: ${ctx.sessionCount} | Trend: ${ctx.trend}
Braking: ${ctx.brakeConfidence} | Throttle: ${ctx.throttleControl} | Corner speed: ${ctx.cornerSpeed} | Consistency: ${ctx.consistency}
Best corner: ${ctx.strongestCorner} | Worst corner: ${ctx.weakestCorner}
=== ISSUES (by cost) ===
${ctx.mainIssues.map((i,n)=>`${n+1}. ${i.corner}: ${i.description} [${fms(i.costMs)}]`).join("\n")||"None detected."}
=== SECTORS ===
${ctx.sectors.map(s=>`${s.label}: ${s.deltaMs>0?"+":""}${fms(s.deltaMs)} [${s.status}]`).join(" | ")}
=== HISTORY ===
${ctx.recurringMistakes.length?`Recurring: ${ctx.recurringMistakes.slice(0,3).join("; ")}`:"No recurring patterns yet."}
${ctx.improvements.length?`Improving: ${ctx.improvements.join(", ")}`:""}`.trim();
}
