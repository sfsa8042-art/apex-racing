"use client";
import { useState, useEffect, useCallback } from "react";
import {
   CheckCircle, Circle, Clock, ChevronRight, BookOpen, Target,
  Zap, Trophy, Star, ArrowLeft, Flame, X, PlayCircle,
} from "lucide-react";
import { useLang } from "@/context/LanguageContext";
import { cn } from "@/lib/utils";
import { ACADEMY_MODULES, type ModuleContent, type LessonContent } from "@/lib/academy/content";
import { loadProgress, completeLesson, getModuleCompletedCount, getModuleStatus, type AcademyProgress } from "@/lib/academy/progress";
import { awardLessonXP } from "@/lib/ranking/system";
import { LessonStage } from "@/components/academy/visuals/LessonStage";
import { StageProgress, type Stage } from "@/components/academy/visuals/StageProgress";
import { TrackRenderer } from "@/components/charts/TrackRenderer";
import { useTelemetry } from "@/context/TelemetryContext";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Button } from "@/components/ui/Button";

// ─── Module colour map ────────────────────────────────────────────────────────
const MCOL: Record<string, { text: string; bg: string; border: string; glow: string }> = {
  lime:   { text:"text-lime-400",   bg:"bg-lime-400/8",   border:"border-lime-400/25",   glow:"shadow-lime-400/10"   },
  red:    { text:"text-red-400",    bg:"bg-red-400/8",    border:"border-red-400/25",    glow:"shadow-red-400/10"    },
  yellow: { text:"text-yellow-400", bg:"bg-yellow-400/8", border:"border-yellow-400/25", glow:"shadow-yellow-400/10" },
  orange: { text:"text-orange-400", bg:"bg-orange-400/8", border:"border-orange-400/25", glow:"shadow-orange-400/10" },
  blue:   { text:"text-blue-400",   bg:"bg-blue-400/8",   border:"border-blue-400/25",   glow:"shadow-blue-400/10"   },
  purple: { text:"text-purple-400", bg:"bg-purple-400/8", border:"border-purple-400/25", glow:"shadow-purple-400/10" },
  zinc:   { text:"text-zinc-400",   bg:"bg-zinc-800/40",  border:"border-zinc-700",      glow:""                     },
};

const TIER_LABEL: Record<string, string> = {
  beginner: "Начальный", intermediate: "Средний", advanced: "Продвинутый",
};

const STAGE_ORDER: Stage[] = ["hook","concept","mistake","fix","proof","drill","quiz","done"];

// ─── MODULE CARD ──────────────────────────────────────────────────────────────
function ModuleCard({
  module, progress, isSelected, onSelect,
}: {
  module: ModuleContent; progress: AcademyProgress; isSelected: boolean; onSelect: () => void;
}) {
  const done  = getModuleCompletedCount(progress, module.id, module.lessons.length);
  const status = getModuleStatus(progress, module.id, module.lessons.length, null);
  const pct   = module.lessons.length > 0 ? Math.round((done / module.lessons.length) * 100) : 0;
  const col   = MCOL[module.color] ?? MCOL.zinc;
  const locked = status === "locked";

  return (
    <button
      onClick={() => onSelect()}
            className={cn(
        "w-full text-left rounded-2xl border p-4 transition-all duration-200",
        isSelected ? `${col.border} ${col.bg} shadow-lg ${col.glow}` : "border-zinc-800 bg-zinc-900 hover:border-zinc-700",
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-xl", col.bg, col.border, "border")}>
          {module.emoji}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[9px] font-mono uppercase tracking-widest text-zinc-600">M{module.number}</span>
            <span className={cn("text-[9px] font-mono uppercase tracking-widest", col.text)}>{TIER_LABEL[module.tier]}</span>
          </div>
          <p className="text-sm font-semibold text-zinc-200 leading-snug">{module.title}</p>
          <p className="text-xs text-zinc-500 mt-0.5 leading-snug line-clamp-2">{module.description}</p>
        </div>
        {!locked && (
          <div className="shrink-0 flex flex-col items-end gap-1">
            {status === "completed" && <CheckCircle size={16} className={col.text}/>}
            {status === "in_progress" && <div className="w-2 h-2 rounded-full bg-lime-400 animate-pulse"/>}
            <span className="text-[10px] font-mono text-zinc-600">{done}/{module.lessons.length}</span>
          </div>
        )}
      </div>
      {!locked && done > 0 && (
        <div className="mt-3">
          <ProgressBar value={done} max={module.lessons.length} size="sm" animated={isSelected} className=""/>
        </div>
      )}
    </button>
  );
}

// ─── LESSON LIST inside module ────────────────────────────────────────────────
function LessonList({
  module, progress, onStart,
}: {
  module: ModuleContent; progress: AcademyProgress; onStart: (lesson: LessonContent) => void;
}) {
  const col  = MCOL[module.color] ?? MCOL.zinc;
  const done = getModuleCompletedCount(progress, module.id, module.lessons.length);
  const pct  = module.lessons.length > 0 ? Math.round((done / module.lessons.length) * 100) : 0;

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Module header */}
      <div className={cn("px-5 py-5 border-b border-zinc-800", col.bg)}>
        <div className="flex items-start gap-3 mb-4">
          <span className="text-3xl">{module.emoji}</span>
          <div>
            <p className={cn("text-[10px] font-mono uppercase tracking-widest mb-0.5", col.text)}>{TIER_LABEL[module.tier]}</p>
            <h2 className="text-xl font-bold text-zinc-100">{module.title}</h2>
            <p className="text-sm text-zinc-400 mt-1 leading-relaxed">{module.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <ProgressBar value={done} max={module.lessons.length} animated className="flex-1" showLabel label={`${done}/${module.lessons.length} уроков`}/>
          <div className="flex items-center gap-1 text-xs font-mono text-zinc-500 shrink-0">
            <Clock size={11}/> {module.durationMin} мин
          </div>
        </div>
      </div>

      {/* Lessons */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {module.lessons.map((lesson, i) => {
          const lessonDone = progress.completedLessons[module.id]?.includes(lesson.id) ?? false;
          const isNext = !lessonDone && (i === 0 || (progress.completedLessons[module.id]?.includes(module.lessons[i-1].id)));
          return (
            <button key={lesson.id} onClick={() => onStart(lesson)}
              className={cn(
                "w-full text-left rounded-xl border p-4 transition-all group",
                lessonDone ? "border-zinc-700/50 bg-zinc-900/50" : isNext
                  ? `${col.border} ${col.bg} hover:shadow-md`
                  : "border-zinc-800 bg-zinc-900 hover:border-zinc-700",
              )}>
              <div className="flex items-center gap-3">
                <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-base",
                  lessonDone ? "bg-lime-400/15" : isNext ? col.bg : "bg-zinc-800")}>
                  {lessonDone ? "✓" : lesson.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest">
                      {lesson.type === "theory" ? "ТЕОРИЯ" : lesson.type === "exercise" ? "УПРАЖНЕНИЕ" : "ЗАДАНИЕ"}
                    </span>
                    <span className="text-[9px] font-mono text-zinc-700">{lesson.durationMin} мин</span>
                  </div>
                  <p className={cn("text-sm font-medium leading-snug",
                    lessonDone ? "text-zinc-500" : "text-zinc-200")}>{lesson.title}</p>
                  {isNext && !lessonDone && (
                    <p className="text-[11px] text-zinc-500 mt-0.5 italic">{lesson.hook.slice(0,80)}…</p>
                  )}
                </div>
                <div className="shrink-0">
                  {lessonDone
                    ? <CheckCircle size={16} className="text-lime-400"/>
                    : isNext
                    ? <ChevronRight size={16} className={cn("transition-transform group-hover:translate-x-0.5", col.text)}/>
                    : <Circle size={14} className="text-zinc-700"/>}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── IMMERSIVE LESSON VIEW ────────────────────────────────────────────────────
function ImmersiveLessonView({
  module, lesson, onComplete, onBack,
}: {
  module: ModuleContent; lesson: LessonContent;
  onComplete: () => void; onBack: () => void;
}) {
  const col = MCOL[module.color] ?? MCOL.zinc;
  const [stage, setStage] = useState<Stage>("hook");
  const [completed, setCompleted] = useState<Stage[]>([]);

  const nextStage = useCallback(() => {
    const idx = STAGE_ORDER.indexOf(stage);
    if (idx < STAGE_ORDER.length - 1) {
      setCompleted(prev => prev.includes(stage) ? prev : [...prev, stage]);
      setStage(STAGE_ORDER[idx + 1]);
    } else {
      onComplete();
    }
  }, [stage, onComplete]);

  const goToStage = useCallback((s: Stage) => {
    setStage(s);
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-zinc-950 flex flex-col">
      {/* Top bar */}
      <div className={cn("flex items-center gap-3 px-4 py-3 border-b border-zinc-800 shrink-0", col.bg)}>
        <button onClick={onBack}
          className="w-8 h-8 rounded-lg hover:bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-zinc-200 transition-colors">
          <X size={16}/>
        </button>
        <div className="flex items-center gap-2">
          <span className="text-base">{lesson.emoji}</span>
          <div>
            <p className={cn("text-[9px] font-mono uppercase tracking-widest", col.text)}>
              M{module.number} · {module.title}
            </p>
            <p className="text-sm font-semibold text-zinc-200 leading-none mt-0.5">{lesson.title}</p>
          </div>
        </div>
        <div className="flex-1"/>
        <StageProgress current={stage} completed={completed} onStageClick={goToStage} className="hidden md:flex"/>
      </div>

      {/* Mobile stage progress */}
      <div className="md:hidden px-3 py-2 border-b border-zinc-800">
        <StageProgress current={stage} completed={completed} onStageClick={goToStage}/>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <div className="max-w-2xl mx-auto h-full">
          <LessonStage
            lesson={lesson}
            stage={stage}
            onNext={nextStage}
            isLast={false}
          />
        </div>
      </div>
    </div>
  );
}

// ─── STATS BAR ────────────────────────────────────────────────────────────────
function StatsBar({ progress }: { progress: AcademyProgress }) {
  const totalLessons = ACADEMY_MODULES.reduce((s, m) => s + m.lessons.length, 0);
  const doneLessons  = ACADEMY_MODULES.reduce((s, m) =>
    s + getModuleCompletedCount(progress, m.id, m.lessons.length), 0);
  const doneModules  = ACADEMY_MODULES.filter(m =>
    getModuleCompletedCount(progress, m.id, m.lessons.length) === m.lessons.length).length;
  const streak = 3; // placeholder

  return (
    <div className="grid grid-cols-3 gap-3 mb-5">
      {[
        { icon: BookOpen, value: `${doneLessons}/${totalLessons}`, label: "Уроков", color: "text-blue-400" },
        { icon: Trophy,   value: `${doneModules}/${ACADEMY_MODULES.length}`, label: "Модулей", color: "text-yellow-400" },
        { icon: Flame,    value: `${streak}д`,  label: "Серия",   color: "text-orange-400" },
      ].map(({ icon: Icon, value, label, color }) => (
        <div key={label} className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 flex items-center gap-3">
          <Icon size={16} className={color}/>
          <div>
            <p className={cn("text-lg font-bold font-mono tabular", color)}>{value}</p>
            <p className="text-[10px] text-zinc-500">{label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
type FilterTier = "all" | "beginner" | "intermediate" | "advanced";

export default function AcademyPage() {
  const { t } = useLang();
  const [progress,      setProgress]      = useState<AcademyProgress>(() => loadProgress());
  const [selectedMod,   setSelectedMod]   = useState<ModuleContent | null>(null);
  const [activeLessonState, setActiveLessonState] = useState<{
    module: ModuleContent; lesson: LessonContent;
  } | null>(null);
  const [filterTier,    setFilterTier]    = useState<FilterTier>("all");

  const refreshProgress = () => setProgress(loadProgress());

  const handleLessonComplete = () => {
    if (!activeLessonState) return;
    const { module, lesson } = activeLessonState;
    completeLesson(module.id, lesson.id);
    awardLessonXP(lesson.title);
    refreshProgress();
    setActiveLessonState(null);
  };

  const filtered = filterTier === "all" ? ACADEMY_MODULES
    : ACADEMY_MODULES.filter(m => m.tier === filterTier);

  // ── Immersive lesson overlay ──
  if (activeLessonState) {
    return (
      <ImmersiveLessonView
        module={activeLessonState.module}
        lesson={activeLessonState.lesson}
        onComplete={handleLessonComplete}
        onBack={() => setActiveLessonState(null)}
      />
    );
  }

  return (
    <div className="flex h-full min-h-0">
      {/* ─── LEFT: module list ─────────────────────────────────────────── */}
      <div className="w-72 xl:w-80 shrink-0 border-r border-zinc-800 flex flex-col bg-zinc-950 overflow-hidden">
        {/* Header */}
        <div className="px-5 py-5 border-b border-zinc-800">
          <div className="flex items-center gap-2 mb-1">
            <BookOpen size={16} className="text-lime-400"/>
            <h1 className="text-base font-bold text-zinc-100">Академия</h1>
          </div>
          <p className="text-xs text-zinc-500">Программа от новичка до профи</p>
        </div>

        {/* Stats */}
        <div className="px-4 py-3 border-b border-zinc-800">
          <StatsBar progress={progress}/>

          {/* Tier filters */}
          <div className="flex gap-1">
            {(["all","beginner","intermediate","advanced"] as FilterTier[]).map(tier => (
              <button key={tier} onClick={() => setFilterTier(tier)}
                className={cn("px-2.5 py-1 rounded-md text-[10px] font-mono uppercase tracking-wide transition-all",
                  filterTier === tier ? "bg-zinc-700 text-zinc-100" : "text-zinc-600 hover:text-zinc-400")}>
                {tier === "all" ? "Все" : tier === "beginner" ? "Нач." : tier === "intermediate" ? "Сред." : "Прод."}
              </button>
            ))}
          </div>
        </div>

        {/* Module cards */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {filtered.map(module => (
            <ModuleCard
              key={module.id}
              module={module}
              progress={progress}
              isSelected={selectedMod?.id === module.id}
              onSelect={() => setSelectedMod(module)}
            />
          ))}
        </div>
      </div>

      {/* ─── RIGHT: lesson list or empty state ────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden bg-zinc-950">
        {selectedMod ? (
          <LessonList
            module={selectedMod}
            progress={progress}
            onStart={lesson => setActiveLessonState({ module: selectedMod, lesson })}
          />
        ) : (
          <EmptyState onPickModule={() => setSelectedMod(ACADEMY_MODULES[0])} progress={progress}/>
        )}
      </div>
    </div>
  );
}

// ─── EMPTY STATE ──────────────────────────────────────────────────────────────
function EmptyState({ onPickModule, progress }: { onPickModule: () => void; progress: AcademyProgress }) {
  // Find the "continue" module (first with partial completion)
  const continueModule = ACADEMY_MODULES.find(m => {
    const done = getModuleCompletedCount(progress, m.id, m.lessons.length);
    return done > 0 && done < m.lessons.length;
  });

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
      <div className="w-20 h-20 rounded-2xl bg-zinc-800 border border-zinc-700 flex items-center justify-center mb-6">
        <BookOpen size={32} className="text-zinc-600"/>
      </div>
      <h2 className="text-xl font-bold text-zinc-200 mb-2">Выбери модуль</h2>
      <p className="text-sm text-zinc-500 mb-8 max-w-xs leading-relaxed">
        Каждый урок — конкретный навык, визуальный разбор ошибки и проверка знаний.
        Ничего лишнего.
      </p>
      {continueModule ? (
        <div className="rounded-xl border border-lime-400/25 bg-lime-400/5 p-4 mb-4 max-w-xs cursor-pointer hover:border-lime-400/40 transition-colors"
          onClick={onPickModule}>
          <p className="text-[10px] font-mono text-lime-400 uppercase tracking-widest mb-1">Продолжить</p>
          <p className="text-sm font-semibold text-zinc-200">{continueModule.title}</p>
        </div>
      ) : (
        <Button variant="primary" onClick={onPickModule}>
          Начать с M1 <ChevronRight size={14}/>
        </Button>
      )}
    </div>
  );
}
