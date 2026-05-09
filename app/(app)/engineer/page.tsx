"use client";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Send, Loader2, Radio, AlertCircle, ChevronRight, Activity, Play, TrendingUp, GitCompare } from "lucide-react";
import { useTelemetry } from "@/context/TelemetryContext";
import { useLang } from "@/context/LanguageContext";
import { cn } from "@/lib/utils";
import { buildEngineerContext, serializeContextForLLM } from "@/lib/engineer/context";
import { PERSONALITIES, getSuggestedQuestions } from "@/lib/engineer/personalities";
import type { PersonalityId } from "@/lib/engineer/personalities";
import type { ChatMessage } from "@/app/api/engineer/route";
import Link from "next/link";

// ─── Typing dots ──────────────────────────────────────────────────────────────
function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-4 py-3">
      {[0, 1, 2].map(i => (
        <div key={i} className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }} />
      ))}
    </div>
  );
}

// ─── Quickaction buttons appended to engineer messages ────────────────────────
function QuickActions({ content, onAction }: {
  content: string;
  onAction: (prompt: string) => void;
}) {
  // Detect relevant actions from message content
  const actions: Array<{ icon: React.ElementType; label: string; prompt: string }> = [];

  if (/turn|corner|sector|t\d|braking/i.test(content)) {
    actions.push({
      icon: Play, label: "Show Replay",
      prompt: "Show me which corner this is and how to replay it",
    });
  }
  if (/brake|braking|stopping/i.test(content)) {
    actions.push({
      icon: GitCompare, label: "Compare Braking",
      prompt: "Compare my braking trace to the reference in detail",
    });
  }
  if (/line|apex|trajectory/i.test(content)) {
    actions.push({
      icon: TrendingUp, label: "View Racing Line",
      prompt: "Explain the optimal racing line for this corner",
    });
  }

  if (!actions.length) return null;

  return (
    <div className="flex flex-wrap gap-1.5 mt-2 pt-2 border-t border-zinc-700/50">
      {actions.map(({ icon: Icon, label, prompt }) => (
        <button key={label} onClick={() => onAction(prompt)}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-zinc-700 bg-zinc-800/60 hover:bg-zinc-700 text-[11px] font-mono text-zinc-400 hover:text-zinc-200 transition-all">
          <Icon size={10} />
          {label}
        </button>
      ))}
    </div>
  );
}

// ─── Message bubble ────────────────────────────────────────────────────────────
function MessageBubble({
  msg, personalityColor, onAction,
}: {
  msg: ChatMessage & { isNew?: boolean };
  personalityColor: string;
  onAction: (prompt: string) => void;
}) {
  const isUser = msg.role === "user";
  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}
      style={{ animation: msg.isNew ? "slideUp 0.3s ease both" : "none" }}>
      {!isUser && (
        <div className="w-7 h-7 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0 mr-2 mt-0.5">
          <Radio size={12} className={personalityColor} />
        </div>
      )}
      <div className={cn(
        "max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
        isUser
          ? "bg-lime-400/15 border border-lime-400/20 text-zinc-100 rounded-br-sm"
          : "bg-zinc-800/80 border border-zinc-700/60 text-zinc-200 rounded-bl-sm"
      )}>
        <p className="whitespace-pre-wrap">{msg.content}</p>
        {!isUser && <QuickActions content={msg.content} onAction={onAction} />}
      </div>
    </div>
  );
}

// ─── Context panel ─────────────────────────────────────────────────────────────
function ContextCard({ ctx }: { ctx: ReturnType<typeof buildEngineerContext> }) {
  const fms = (ms: number) => ms >= 1000 ? `${(ms / 1000).toFixed(3)}s` : `${ms}ms`;
  const SECTOR_COLORS = ["text-lime-400 border-lime-400/25 bg-lime-400/5",
    "text-yellow-400 border-yellow-400/25 bg-yellow-400/5",
    "text-red-400 border-red-400/25 bg-red-400/5"];

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden">
      <div className="px-4 py-2.5 border-b border-zinc-800 flex items-center gap-2">
        <Activity size={12} className="text-lime-400" />
        <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">Lap Context</p>
        <span className="ml-auto text-[10px] font-mono text-zinc-600">{ctx.trackName}</span>
      </div>
      <div className="p-3 space-y-3">
        <div className="grid grid-cols-2 gap-2">
          {[
            { k: "Time lost", v: `+${fms(ctx.totalTimeLossMs)}`, c: "text-red-400" },
            { k: "Score", v: `${ctx.overallScore}/100`, c: ctx.overallScore >= 70 ? "text-lime-400" : ctx.overallScore >= 50 ? "text-yellow-400" : "text-red-400" },
            { k: "Style", v: ctx.drivingStyle, c: "text-zinc-300" },
            { k: "Sessions", v: String(ctx.sessionCount), c: "text-zinc-300" },
          ].map(({ k, v, c }) => (
            <div key={k} className="rounded-lg bg-zinc-800/60 px-2.5 py-1.5">
              <p className="text-[9px] font-mono text-zinc-600 uppercase tracking-wide">{k}</p>
              <p className={cn("text-xs font-mono font-bold mt-0.5 capitalize", c)}>{v}</p>
            </div>
          ))}
        </div>

        {ctx.mainIssues.length > 0 && (
          <div>
            <p className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest mb-1.5">Top Issues</p>
            {ctx.mainIssues.slice(0, 4).map((issue, i) => (
              <div key={i} className="flex items-center gap-2 py-1 border-b border-zinc-800/50 last:border-0">
                <div className={cn("w-1.5 h-1.5 rounded-full shrink-0",
                  i === 0 ? "bg-red-400" : i === 1 ? "bg-orange-400" : i === 2 ? "bg-yellow-400" : "bg-zinc-500")} />
                <span className="text-xs text-zinc-400 truncate flex-1">{issue.corner}</span>
                <span className="text-[11px] font-mono text-zinc-600 shrink-0">−{fms(issue.costMs)}</span>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-1">
          {ctx.sectors.map((s, i) => (
            <div key={s.label} className={cn("flex-1 text-center py-1.5 rounded-lg border text-[10px] font-mono", SECTOR_COLORS[Math.min(i, 2)])}>
              <p className="opacity-60 text-[8px]">{s.label}</p>
              <p className="font-bold">{s.deltaMs > 0 ? "+" : ""}{(s.deltaMs / 1000).toFixed(2)}s</p>
            </div>
          ))}
        </div>

        {ctx.recurringMistakes.length > 0 && (
          <div className="rounded-lg border border-yellow-400/20 bg-yellow-400/5 px-2.5 py-2">
            <p className="text-[9px] font-mono text-yellow-400/70 uppercase tracking-widest mb-1">Recurring</p>
            <p className="text-[11px] text-zinc-400 leading-snug">{ctx.recurringMistakes[0]}</p>
          </div>
        )}
      </div>
    </div>
  );
}


// ─── No API key configured ────────────────────────────────────────────────────
function NoKeyState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
      <div className="w-20 h-20 rounded-2xl bg-yellow-400/10 border border-yellow-400/20 flex items-center justify-center mb-6"
        style={{ animation: "countUp 0.5s cubic-bezier(0.34,1.56,0.64,1) both" }}>
        <span className="text-4xl">🔑</span>
      </div>
      <h2 className="text-xl font-bold text-zinc-200 mb-2">Нужен бесплатный ключ</h2>
      <p className="text-sm text-zinc-500 mb-6 max-w-xs leading-relaxed">
        AI инженер работает через Google Gemini — полностью бесплатно.
        Нужно получить ключ и добавить в настройки сайта.
      </p>

      {/* Steps */}
      <div className="w-full max-w-xs text-left space-y-3 mb-6">
        {[
          { n:"1", text:"Зайди на", link:"aistudio.google.com", href:"https://aistudio.google.com" },
          { n:"2", text:"Нажми «Get API Key» → «Create API key»", link:null, href:null },
          { n:"3", text:"Скопируй ключ (начинается с AIza...)", link:null, href:null },
          { n:"4", text:"В Netlify добавь: GEMINI_API_KEY = твой ключ", link:null, href:null },
        ].map(({ n, text, link, href }) => (
          <div key={n} className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-yellow-400/15 border border-yellow-400/25 flex items-center justify-center shrink-0 mt-0.5">
              <span className="text-xs font-bold text-yellow-400 font-mono">{n}</span>
            </div>
            <p className="text-sm text-zinc-400 leading-snug">
              {text}{" "}
              {href && <a href={href} target="_blank" rel="noopener noreferrer"
                className="text-lime-400 hover:underline">{link}</a>}
            </p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 w-full max-w-xs">
        <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest mb-1">Бесплатные лимиты Gemini</p>
        <div className="flex justify-between text-xs font-mono">
          <span className="text-zinc-400">15 запросов / мин</span>
          <span className="text-lime-400">∞ для 15 чел.</span>
        </div>
        <div className="flex justify-between text-xs font-mono mt-0.5">
          <span className="text-zinc-400">1.5M токенов / день</span>
          <span className="text-lime-400">бесплатно</span>
        </div>
      </div>
    </div>
  );
}

// ─── No-lap state ──────────────────────────────────────────────────────────────
function NoLapState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
      <div className="w-20 h-20 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-6"
        style={{ animation: "countUp 0.5s cubic-bezier(0.34,1.56,0.64,1) both" }}>
        <Radio size={32} className="text-zinc-600" />
      </div>
      <h2 className="text-xl font-bold text-zinc-200 mb-2">Engineer Standing By</h2>
      <p className="text-sm text-zinc-500 mb-6 max-w-xs leading-relaxed">
        Upload a lap on the Telemetry page. The engineer analyses your specific data — braking points, sector times, driving style — not generic advice.
      </p>
      <Link href="/telemetry">
        <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-lime-400 hover:bg-lime-300 text-zinc-950 font-semibold text-sm transition-all hover:scale-105">
          Upload Lap <ChevronRight size={16} />
        </button>
      </Link>
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────
export default function EngineerPage() {
  const { uploadState, driverProfile, patternReport, progress } = useTelemetry();
  const { lang } = useLang();

  const [personality,   setPersonality]   = useState<PersonalityId>("calm");
  const [messages,      setMessages]      = useState<Array<ChatMessage & { isNew?: boolean }>>([]);
  const [input,         setInput]         = useState("");
  const [loading,       setLoading]       = useState(false);
  const [briefingLoad,  setBriefingLoad]  = useState(false);
  const [error,         setError]         = useState<string | null>(null);
  const [noKey,         setNoKey]         = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef       = useRef<HTMLTextAreaElement>(null);
  const abortRef       = useRef<AbortController | null>(null);

  const hasLap = uploadState.status === "done" && uploadState.analysisResult && uploadState.parsedLap;

  // Memoize context computation — expensive, shouldn't recompute on every render
  const engineerCtx = useMemo(() => {
    if (!hasLap) return null;
    return buildEngineerContext(
      uploadState.analysisResult!,
      uploadState.parsedLap!.lapTimeMs,
      driverProfile ?? null,
      patternReport ?? null,
      progress ?? null,
      uploadState.filename ?? "",
    );
  }, [hasLap, uploadState.analysisResult, uploadState.parsedLap?.lapTimeMs, driverProfile, patternReport, progress, uploadState.filename]);

  const ctxSummary = useMemo(
    () => engineerCtx ? serializeContextForLLM(engineerCtx) : null,
    [engineerCtx]
  );

  // Fetch briefing — with AbortController to prevent setState on unmount
  useEffect(() => {
    if (!ctxSummary) return;

    // Cancel any in-flight request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setBriefingLoad(true);
    setMessages([]);

    fetch(
      `/api/engineer?ctx=${encodeURIComponent(ctxSummary)}&personality=${personality}&lang=${lang}`,
      { signal: controller.signal }
    )
      .then(r => r.ok ? r.json() : Promise.reject(r.statusText))
      .then((data: { briefing?: string; error?: string }) => {
        if (controller.signal.aborted) return;
        if (data?.error?.includes("не настроен") || data?.error?.includes("не задан")) {
          setNoKey(true);
          return;
        }
        setMessages([{ role: "assistant", content: data.briefing ?? "", isNew: true }]);
      })
      .catch(err => { if (err.name !== "AbortError") console.warn("Briefing fetch:", err); })
      .finally(() => { if (!controller.signal.aborted) setBriefingLoad(false); });

    return () => controller.abort();
  }, [ctxSummary, personality, lang]);

  // Cleanup on unmount
  useEffect(() => () => { abortRef.current?.abort(); }, []);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, loading]);

  const handleSend = useCallback(async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || !ctxSummary || loading) return;

    setInput("");
    setError(null);
    const userMsg: ChatMessage & { isNew?: boolean } = { role: "user", content: msg, isNew: true };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      // Don't abort briefing controller — use a separate one for chat
      const controller = new AbortController();
      const res = await fetch("/api/engineer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contextSummary: ctxSummary,
          message: msg,
          personality,
          history: messages.slice(-6).map(m => ({ role: m.role, content: m.content })),
          lang,
        }),
        signal: controller.signal,
      });

      if (!res.ok) throw new Error("Engineer unavailable");
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setMessages(prev => [...prev, { role: "assistant", content: data.reply, isNew: true }]);
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== "AbortError") {
        if (err.message?.includes("не настроен") || err.message?.includes("не задан")) {
        setNoKey(true);
      } else {
        setError(err.message ?? "Connection error");
      }
      }
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [input, ctxSummary, loading, messages, personality, lang]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const suggested = useMemo(() => getSuggestedQuestions(lang), [lang]);
  const p = PERSONALITIES[personality];

  return (
    <div className="flex h-full min-h-0 bg-zinc-950">
      {/* Left sidebar */}
      <div className="w-72 xl:w-80 shrink-0 border-r border-zinc-800 flex flex-col overflow-hidden">
        <div className="px-4 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-2 mb-0.5">
            <Radio size={15} className="text-lime-400" />
            <h1 className="text-sm font-bold text-zinc-100">AI Race Engineer</h1>
            {hasLap && <div className="ml-auto w-2 h-2 rounded-full bg-lime-400 animate-pulse" />}
          </div>
          <p className="text-[11px] text-zinc-500 font-mono">Telemetry-aware coaching</p>
        </div>

        {/* Personality selector */}
        <div className="p-3 border-b border-zinc-800">
          <p className="text-[9px] font-mono uppercase tracking-widest text-zinc-600 mb-2">Engineer Style</p>
          <div className="grid grid-cols-2 gap-1.5">
            {Object.values(PERSONALITIES).map(pers => (
              <button key={pers.id} onClick={() => setPersonality(pers.id as PersonalityId)}
                className={cn(
                  "flex items-center gap-2 px-2.5 py-2 rounded-xl border text-left text-xs transition-all",
                  personality === pers.id
                    ? `border-zinc-600 bg-zinc-800 ${pers.color}`
                    : "border-zinc-800 text-zinc-600 hover:border-zinc-700 hover:text-zinc-400"
                )}>
                <span className="text-base shrink-0">{pers.emoji}</span>
                <p className="font-medium text-[11px] leading-none">
                  {lang === "ru" ? pers.nameRu : pers.name}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Context */}
        <div className="flex-1 overflow-y-auto p-3">
          {engineerCtx ? <ContextCard ctx={engineerCtx} /> : (
            <div className="rounded-xl border border-dashed border-zinc-800 p-4 text-center">
              <p className="text-xs text-zinc-600">No lap data</p>
            </div>
          )}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {noKey ? <NoKeyState /> : !hasLap ? <NoLapState /> : (
          <>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="flex items-center justify-center mb-2">
                <span className={cn("text-[11px] font-mono px-3 py-1 rounded-full border",
                  p.color,
                  personality === "calm"         ? "border-blue-400/25 bg-blue-400/6" :
                  personality === "strict"       ? "border-red-400/25 bg-red-400/6" :
                  personality === "motivational" ? "border-lime-400/25 bg-lime-400/6" :
                  "border-yellow-400/25 bg-yellow-400/6")}>
                  {p.emoji} {lang === "ru" ? p.nameRu : p.name}
                </span>
              </div>

              {briefingLoad && messages.length === 0 && (
                <div className="flex justify-start">
                  <div className="w-7 h-7 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0 mr-2 mt-0.5">
                    <Radio size={12} className={p.color} />
                  </div>
                  <div className="bg-zinc-800/80 border border-zinc-700/60 rounded-2xl rounded-bl-sm">
                    <TypingDots />
                  </div>
                </div>
              )}

              {messages.map((msg, i) => (
                <MessageBubble key={i} msg={msg} personalityColor={p.color} onAction={handleSend} />
              ))}

              {loading && (
                <div className="flex justify-start">
                  <div className="w-7 h-7 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0 mr-2 mt-0.5">
                    <Radio size={12} className={p.color} />
                  </div>
                  <div className="bg-zinc-800/80 border border-zinc-700/60 rounded-2xl rounded-bl-sm">
                    <TypingDots />
                  </div>
                </div>
              )}

              {error && (
                <div className="flex items-center gap-2 px-4 py-3 rounded-xl border border-red-400/25 bg-red-400/5 text-xs text-red-400">
                  <AlertCircle size={14} className="shrink-0" />
                  {error}
                  <button onClick={() => setError(null)} className="ml-auto">✕</button>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Suggested questions */}
            {messages.length <= 1 && !loading && (
              <div className="px-4 pb-2">
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                  {suggested.slice(0, 4).map((q, i) => (
                    <button key={i} onClick={() => handleSend(q)}
                      className="flex-none text-xs px-3 py-2 rounded-xl border border-zinc-700 bg-zinc-900 hover:border-zinc-600 text-zinc-400 hover:text-zinc-200 transition-all whitespace-nowrap">
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input */}
            <div className="p-4 border-t border-zinc-800">
              <div className="flex items-end gap-2">
                <div className="flex-1 rounded-xl border border-zinc-700 bg-zinc-800 focus-within:border-zinc-500 transition-colors overflow-hidden">
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={lang === "ru" ? "Спроси инженера…" : "Ask your engineer…"}
                    rows={1}
                    className="w-full px-4 py-3 bg-transparent text-sm text-zinc-200 placeholder-zinc-600 resize-none outline-none leading-relaxed"
                    style={{ maxHeight: "120px" }}
                    disabled={loading}
                  />
                </div>
                <button onClick={() => handleSend()} disabled={!input.trim() || loading}
                  className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center transition-all shrink-0",
                    input.trim() && !loading
                      ? "bg-lime-400 hover:bg-lime-300 text-zinc-950"
                      : "bg-zinc-800 text-zinc-600 cursor-not-allowed"
                  )}>
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                </button>
              </div>
              <p className="text-[10px] text-zinc-700 font-mono mt-1.5 text-center">
                Enter to send · Shift+Enter for new line
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
