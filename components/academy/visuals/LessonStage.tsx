"use client";
import { useState, useEffect, useRef } from "react";
import { ChevronRight, Volume2, Zap } from "lucide-react";
import { ConceptDiagram } from "./ConceptDiagram";
import { BeforeAfterSlider } from "./BeforeAfterSlider";
import { cn } from "@/lib/utils";
import type { LessonContent } from "@/lib/academy/content";
import type { Stage } from "./StageProgress";

interface LessonStageProps {
  lesson: LessonContent;
  stage: Stage;
  onNext: () => void;
  isLast: boolean;
}

// ─── Animated text reveal ─────────────────────────────────────────────────────
function Reveal({ children, delay = 0, className }: {
  children: React.ReactNode; delay?: number; className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    ref.current.style.opacity = "0";
    ref.current.style.transform = "translateY(14px)";
    const t = setTimeout(() => {
      if (!ref.current) return;
      ref.current.style.transition = `opacity 0.5s ease ${delay}ms, transform 0.5s ease ${delay}ms`;
      ref.current.style.opacity = "1";
      ref.current.style.transform = "translateY(0)";
    }, 30);
    return () => clearTimeout(t);
  }, [delay]);
  return <div ref={ref} className={className}>{children}</div>;
}

// ─── Stage: HOOK ──────────────────────────────────────────────────────────────
function HookStage({ lesson, onNext }: Pick<LessonStageProps, "lesson"|"onNext">) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 flex flex-col items-center justify-center px-8 py-10 text-center">
        <Reveal delay={0}>
          <div className="w-20 h-20 rounded-2xl bg-lime-400/10 border border-lime-400/20 flex items-center justify-center mx-auto mb-8">
            <span className="text-5xl">{lesson.emoji}</span>
          </div>
        </Reveal>

        <Reveal delay={150} className="mb-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-zinc-700 text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
            <Zap size={10} className="text-lime-400"/>
            Урок · {lesson.type === "theory" ? "Теория" : lesson.type === "exercise" ? "Упражнение" : "Задание"}
          </div>
        </Reveal>

        <Reveal delay={250}>
          <h2 className="text-3xl md:text-4xl font-bold text-zinc-100 mb-6 leading-tight">{lesson.title}</h2>
        </Reveal>

        <Reveal delay={400}>
          <div className="max-w-lg mx-auto rounded-2xl border border-lime-400/20 bg-lime-400/5 px-8 py-6">
            <p className="text-lg text-zinc-200 leading-relaxed font-medium italic">
              &ldquo;{lesson.hook}&rdquo;
            </p>
          </div>
        </Reveal>

        <Reveal delay={600} className="mt-8 text-sm text-zinc-500 font-mono">
          ~{lesson.durationMin} мин
        </Reveal>
      </div>

      <Reveal delay={700} className="p-6 flex justify-center">
        <button onClick={onNext}
          className="flex items-center gap-2 px-8 py-3.5 rounded-xl bg-lime-400 hover:bg-lime-300 text-zinc-950 font-semibold transition-all hover:scale-105">
          Начать урок <ChevronRight size={18}/>
        </button>
      </Reveal>
    </div>
  );
}

// ─── Stage: CONCEPT ───────────────────────────────────────────────────────────
function ConceptStage({ lesson, onNext }: Pick<LessonStageProps, "lesson"|"onNext">) {
  const [showDiagram, setShowDiagram] = useState(false);
  useEffect(() => { const t = setTimeout(() => setShowDiagram(true), 400); return () => clearTimeout(t); }, []);

  // Map lesson to diagram type
  const diagramType = lesson.telemetryCheck === "speed_min_corners"    ? "apex_compare"
    : lesson.telemetryCheck === "brake_profile_shape"   ? "brake_trace"
    : lesson.telemetryCheck === "lap_analysis_complete" ? "delta_explained"
    : lesson.telemetryCheck === "throttle_open_timing"  ? "throttle_exit"
    : "racing_line_overview";

  return (
    <div className="flex flex-col gap-6 px-6 py-6 overflow-y-auto">
      <Reveal>
        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-blue-400/10 border border-blue-400/20">
          <span className="text-xs font-mono text-blue-400 uppercase tracking-widest">💡 Концепция</span>
        </div>
        <h3 className="text-xl font-bold text-zinc-100 mt-2">{lesson.title}</h3>
      </Reveal>

      {/* Key points as a visual list */}
      <div className="grid grid-cols-1 gap-2">
        {lesson.keyPoints.map((pt, i) => (
          <Reveal key={i} delay={i * 100}>
            <div className="flex items-start gap-3 rounded-xl border border-zinc-800 bg-zinc-900/80 px-4 py-3">
              <div className="w-6 h-6 rounded-full bg-lime-400/15 border border-lime-400/25 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-xs font-bold text-lime-400 font-mono">{i+1}</span>
              </div>
              <p className="text-sm text-zinc-300 leading-relaxed">{pt}</p>
            </div>
          </Reveal>
        ))}
      </div>

      {/* Concept diagram */}
      {showDiagram && lesson.visual && (
        <Reveal>
          <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-2">{lesson.visual.title}</p>
          <ConceptDiagram type={diagramType as any} className="h-48" animated/>
          <p className="text-xs text-zinc-500 mt-2 text-center">{lesson.visual.caption}</p>
        </Reveal>
      )}

      <Reveal delay={600}>
        <button onClick={onNext}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium transition-all border border-zinc-700">
          Понял, дальше <ChevronRight size={16}/>
        </button>
      </Reveal>
    </div>
  );
}

// ─── Stage: MISTAKE ───────────────────────────────────────────────────────────
function MistakeStage({ lesson, onNext }: Pick<LessonStageProps, "lesson"|"onNext">) {
  const mistakeType = lesson.telemetryCheck === "speed_min_corners"    ? "apex_early"
    : lesson.telemetryCheck === "brake_profile_shape"   ? "brake_trace"
    : lesson.telemetryCheck === "throttle_open_timing"  ? "throttle_exit"
    : lesson.telemetryCheck === "lap_analysis_complete" ? "delta_sectors"
    : "apex_early";

  return (
    <div className="flex flex-col gap-5 px-6 py-6 overflow-y-auto">
      <Reveal>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-400/10 border border-red-400/20 w-fit">
          <span className="text-xs font-mono text-red-400 uppercase tracking-widest">❌ Типичная ошибка</span>
        </div>
      </Reveal>

      <Reveal delay={100}>
        <div className="rounded-2xl border border-red-400/25 bg-red-400/5 p-5">
          <p className="text-base text-zinc-200 leading-relaxed">{lesson.mistake}</p>
        </div>
      </Reveal>

      <Reveal delay={200}>
        <ConceptDiagram type={mistakeType as any} className="h-44" animated/>
      </Reveal>

      {/* What happens as a result */}
      <Reveal delay={350}>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-2">Что происходит</p>
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-red-400 shrink-0"/>
            <p className="text-sm text-zinc-400">Машина идёт к внешнему краю</p>
          </div>
          <div className="flex items-center gap-3 mt-1.5">
            <div className="w-2 h-2 rounded-full bg-red-400 shrink-0"/>
            <p className="text-sm text-zinc-400">Газ приходится держать закрытым</p>
          </div>
          <div className="flex items-center gap-3 mt-1.5">
            <div className="w-2 h-2 rounded-full bg-red-400 shrink-0"/>
            <p className="text-sm text-zinc-400 font-medium">Потеря 0.2–0.5с на выходе</p>
          </div>
        </div>
      </Reveal>

      <Reveal delay={500}>
        <button onClick={onNext}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium transition-all border border-zinc-700">
          Покажи как исправить <ChevronRight size={16}/>
        </button>
      </Reveal>
    </div>
  );
}

// ─── Stage: FIX ───────────────────────────────────────────────────────────────
function FixStage({ lesson, onNext }: Pick<LessonStageProps, "lesson"|"onNext">) {
  const fixType = lesson.telemetryCheck === "speed_min_corners"    ? "apex_late"
    : lesson.telemetryCheck === "brake_profile_shape"   ? "brake_trace_ok"
    : lesson.telemetryCheck === "throttle_open_timing"  ? "throttle_exit"
    : lesson.telemetryCheck === "lap_analysis_complete" ? "delta_explained"
    : "apex_late";

  return (
    <div className="flex flex-col gap-5 px-6 py-6 overflow-y-auto">
      <Reveal>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-lime-400/10 border border-lime-400/20 w-fit">
          <span className="text-xs font-mono text-lime-400 uppercase tracking-widest">✅ Как исправить</span>
        </div>
      </Reveal>

      <Reveal delay={100}>
        <div className="rounded-2xl border border-lime-400/25 bg-lime-400/5 p-5">
          <p className="text-base text-zinc-200 leading-relaxed">{lesson.fix}</p>
        </div>
      </Reveal>

      {/* Before / after slider */}
      <Reveal delay={200}>
        <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-2">До и после — сдвиньте ползунок</p>
        <BeforeAfterSlider beforeLabel="Ошибка" afterLabel="Исправлено" beforeCost="−0.3с" afterGain="+0.3с" className="h-48">
          <ConceptDiagram type={lesson.telemetryCheck === "speed_min_corners" ? "apex_early" : "brake_trace"} className="h-44 rounded-none border-0" animated={false}/>
          <ConceptDiagram type={fixType as any} className="h-44 rounded-none border-0" animated={false}/>
        </BeforeAfterSlider>
      </Reveal>

      <Reveal delay={450}>
        <button onClick={onNext}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-lime-400/15 hover:bg-lime-400/25 text-lime-400 font-semibold transition-all border border-lime-400/30">
          Понятно, хочу увидеть в данных <ChevronRight size={16}/>
        </button>
      </Reveal>
    </div>
  );
}

// ─── Stage: PROOF (telemetry data) ────────────────────────────────────────────
function ProofStage({ lesson, onNext }: Pick<LessonStageProps, "lesson"|"onNext">) {
  return (
    <div className="flex flex-col gap-5 px-6 py-6 overflow-y-auto">
      <Reveal>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-400/10 border border-blue-400/20 w-fit">
          <span className="text-xs font-mono text-blue-400 uppercase tracking-widest">📊 Доказательство в данных</span>
        </div>
      </Reveal>

      <Reveal delay={100}>
        <ConceptDiagram type="delta_explained" className="h-44" animated/>
        <p className="text-xs text-zinc-500 text-center mt-2">
          Дельта-график показывает именно этот эффект — потерю в зоне ошибки
        </p>
      </Reveal>

      <Reveal delay={250}>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-3">Метрика для проверки</p>
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-lime-400 shrink-0"/>
            <p className="text-sm text-zinc-300 font-mono">
              {lesson.telemetryCheck === "speed_min_corners"
                ? "Минимальная скорость в апексе > референса"
                : lesson.telemetryCheck === "brake_profile_shape"
                ? "Точка торможения на 5–8м позже текущей"
                : "Дельта-время положительное в зоне поворота"}
            </p>
          </div>
        </div>
      </Reveal>

      <Reveal delay={400}>
        <div className="rounded-xl border border-yellow-400/20 bg-yellow-400/5 p-4">
          <p className="text-[10px] font-mono text-yellow-400/80 uppercase tracking-widest mb-1">Что загрузить в телеметрию</p>
          <p className="text-sm text-zinc-300 leading-relaxed">{lesson.practicalTask}</p>
        </div>
      </Reveal>

      <Reveal delay={550}>
        <button onClick={onNext}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium transition-all border border-zinc-700">
          К практике <ChevronRight size={16}/>
        </button>
      </Reveal>
    </div>
  );
}

// ─── Stage: DRILL ─────────────────────────────────────────────────────────────
function DrillStage({ lesson, onNext }: Pick<LessonStageProps, "lesson"|"onNext">) {
  const steps = lesson.drill.split(/\n/).filter(Boolean);
  return (
    <div className="flex flex-col gap-5 px-6 py-6 overflow-y-auto">
      <Reveal>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-orange-400/10 border border-orange-400/20 w-fit">
          <span className="text-xs font-mono text-orange-400 uppercase tracking-widest">🎯 Практика прямо сейчас</span>
        </div>
      </Reveal>

      <Reveal delay={100}>
        <div className="rounded-2xl border border-orange-400/20 bg-orange-400/5 p-5">
          <div className="space-y-3">
            {steps.map((step, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-orange-400/20 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-[11px] font-bold text-orange-400 font-mono">{i+1}</span>
                </div>
                <p className="text-sm text-zinc-300 leading-relaxed">{step.replace(/^\d+[.):]\s*/, "")}</p>
              </div>
            ))}
          </div>
        </div>
      </Reveal>

      <Reveal delay={300}>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-2">Цель упражнения</p>
          <p className="text-sm text-zinc-300">{lesson.practicalTask}</p>
        </div>
      </Reveal>

      <Reveal delay={450}>
        <button onClick={onNext}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-orange-400/15 hover:bg-orange-400/25 text-orange-400 font-semibold transition-all border border-orange-400/30">
          Выполнил, проверить знания <ChevronRight size={16}/>
        </button>
      </Reveal>
    </div>
  );
}

// ─── Stage: QUIZ ─────────────────────────────────────────────────────────────
function QuizStage({ lesson, onNext }: Pick<LessonStageProps, "lesson"|"onNext">) {
  const quiz = lesson.quiz;
  const [selected, setSelected] = useState<number|null>(null);
  const [revealed, setRevealed] = useState(false);

  if (!quiz) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <span className="text-4xl mb-4">🧠</span>
        <p className="text-zinc-400 mb-6">Для этого урока нет теста — переходим к завершению.</p>
        <button onClick={onNext} className="px-6 py-3 rounded-xl bg-lime-400 text-zinc-950 font-semibold">Завершить урок</button>
      </div>
    );
  }

  const isCorrect = selected === quiz.correct;

  return (
    <div className="flex flex-col gap-5 px-6 py-6 overflow-y-auto">
      <Reveal>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-purple-400/10 border border-purple-400/20 w-fit">
          <span className="text-xs font-mono text-purple-400 uppercase tracking-widest">🧠 Проверка знаний</span>
        </div>
      </Reveal>

      <Reveal delay={100}>
        <div className="rounded-2xl border border-zinc-700 bg-zinc-900 p-5">
          <p className="text-base font-semibold text-zinc-100 leading-snug">{quiz.question}</p>
        </div>
      </Reveal>

      <div className="space-y-2">
        {quiz.options.map((opt, i) => {
          const isSelected = selected === i;
          const showResult = revealed;
          const isRight = i === quiz.correct;
          return (
            <Reveal key={i} delay={150 + i * 80}>
              <button
                onClick={() => { if (!revealed) { setSelected(i); setTimeout(() => setRevealed(true), 300); } }}
                className={cn(
                  "w-full text-left flex items-center gap-3 px-4 py-3.5 rounded-xl border text-sm font-medium transition-all",
                  !revealed && "border-zinc-700 bg-zinc-800/60 hover:border-zinc-600 hover:bg-zinc-800 text-zinc-300",
                  showResult && isRight && "border-lime-400/40 bg-lime-400/10 text-lime-400",
                  showResult && isSelected && !isRight && "border-red-400/40 bg-red-400/10 text-red-400",
                  showResult && !isSelected && !isRight && "border-zinc-800 bg-zinc-900/50 text-zinc-600 opacity-60",
                )}>
                <div className={cn(
                  "w-6 h-6 rounded-full border flex items-center justify-center shrink-0 text-xs font-bold",
                  !revealed && isSelected && "border-white bg-white text-zinc-950",
                  !revealed && !isSelected && "border-zinc-600 text-zinc-500",
                  showResult && isRight && "border-lime-400 bg-lime-400 text-zinc-950",
                  showResult && isSelected && !isRight && "border-red-400 bg-red-400 text-white",
                  showResult && !isSelected && !isRight && "border-zinc-700 text-zinc-700",
                )}>
                  {showResult ? (isRight ? "✓" : isSelected ? "✗" : String.fromCharCode(65+i)) : String.fromCharCode(65+i)}
                </div>
                {opt}
              </button>
            </Reveal>
          );
        })}
      </div>

      {revealed && (
        <Reveal>
          <div className={cn("rounded-2xl border p-4",
            isCorrect ? "border-lime-400/30 bg-lime-400/8" : "border-yellow-400/25 bg-yellow-400/5")}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">{isCorrect ? "🎯" : "💡"}</span>
              <span className={cn("text-sm font-bold", isCorrect ? "text-lime-400" : "text-yellow-400")}>
                {isCorrect ? "Правильно!" : "Не совсем, но вот почему:"}
              </span>
            </div>
            <p className="text-sm text-zinc-300 leading-relaxed">{quiz.explanation}</p>
          </div>
          <button onClick={onNext}
            className="w-full mt-3 flex items-center justify-center gap-2 py-3 rounded-xl bg-lime-400 hover:bg-lime-300 text-zinc-950 font-semibold transition-all">
            {isCorrect ? "🏆 Завершить урок!" : "Понял, завершить"} <ChevronRight size={16}/>
          </button>
        </Reveal>
      )}
    </div>
  );
}

// ─── Stage: DONE ─────────────────────────────────────────────────────────────
function DoneStage({ lesson, onNext, isLast }: LessonStageProps) {
  const [xpShown, setXpShown] = useState(false);
  useEffect(() => { const t = setTimeout(() => setXpShown(true), 600); return () => clearTimeout(t); }, []);

  return (
    <div className="flex flex-col h-full items-center justify-center px-8 py-10 text-center">
      <Reveal>
        <div className="text-7xl mb-6 animate-bounce">🏆</div>
      </Reveal>
      <Reveal delay={200}>
        <h2 className="text-2xl font-bold text-zinc-100 mb-2">Урок завершён!</h2>
        <p className="text-zinc-400 mb-8">{lesson.title}</p>
      </Reveal>

      {/* XP badge */}
      <Reveal delay={400}>
        <div className={cn("flex items-center gap-2 px-5 py-3 rounded-xl border border-yellow-400/30 bg-yellow-400/10 transition-all duration-700",
          xpShown ? "opacity-100 scale-100" : "opacity-0 scale-90")}>
          <Zap size={18} className="text-yellow-400"/>
          <span className="text-yellow-400 font-bold text-lg">+75 XP</span>
        </div>
      </Reveal>

      {/* Summary */}
      <Reveal delay={650}>
        <div className="mt-8 max-w-sm mx-auto rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-3">Что ты выучил</p>
          <ul className="space-y-2 text-left">
            {lesson.keyPoints.slice(0, 3).map((pt, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-zinc-300">
                <span className="text-lime-400 shrink-0 mt-0.5">✓</span>{pt}
              </li>
            ))}
          </ul>
        </div>
      </Reveal>

      <Reveal delay={850} className="mt-8 flex gap-3">
        <button onClick={onNext}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-lime-400 hover:bg-lime-300 text-zinc-950 font-semibold transition-all hover:scale-105">
          {isLast ? "К модулям 🎓" : "Следующий урок →"}
        </button>
      </Reveal>
    </div>
  );
}

// ─── Router ───────────────────────────────────────────────────────────────────
export function LessonStage(props: LessonStageProps) {
  const { stage } = props;
  return (
    <div className="h-full overflow-y-auto">
      {stage === "hook"    && <HookStage    {...props}/>}
      {stage === "concept" && <ConceptStage {...props}/>}
      {stage === "mistake" && <MistakeStage {...props}/>}
      {stage === "fix"     && <FixStage     {...props}/>}
      {stage === "proof"   && <ProofStage   {...props}/>}
      {stage === "drill"   && <DrillStage   {...props}/>}
      {stage === "quiz"    && <QuizStage    {...props}/>}
      {stage === "done"    && <DoneStage    {...props}/>}
    </div>
  );
}
