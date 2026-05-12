"use client";
import { useState, useEffect, useRef } from "react";
import { ChevronRight, Zap, BookOpen, AlertTriangle, CheckCircle2, BarChart2, Target, Brain } from "lucide-react";
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

// ─── Animated reveal ──────────────────────────────────────────────────────────
function Reveal({ children, delay = 0, className }: {
  children: React.ReactNode; delay?: number; className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    ref.current.style.opacity = "0";
    ref.current.style.transform = "translateY(12px)";
    const t = setTimeout(() => {
      if (!ref.current) return;
      ref.current.style.transition = `opacity 0.4s ease ${delay}ms, transform 0.4s ease ${delay}ms`;
      ref.current.style.opacity = "1";
      ref.current.style.transform = "translateY(0)";
    }, 30);
    return () => clearTimeout(t);
  }, [delay]);
  return <div ref={ref} className={className}>{children}</div>;
}

// ─── Markdown-lite renderer ───────────────────────────────────────────────────
function BodyText({ text, className }: { text: string; className?: string }) {
  const paragraphs = text.split(/\n\n+/).filter(Boolean);
  return (
    <div className={cn("space-y-3", className)}>
      {paragraphs.map((para, i) => {
        // Bold: **text** → <strong>
        const parts = para.split(/(\*\*[^*]+\*\*)/).map((part, j) => {
          if (part.startsWith("**") && part.endsWith("**")) {
            return <strong key={j} className="text-zinc-200 font-semibold">{part.slice(2, -2)}</strong>;
          }
          return <span key={j}>{part}</span>;
        });
        return (
          <p key={i} className="text-sm text-zinc-400 leading-relaxed">
            {parts}
          </p>
        );
      })}
    </div>
  );
}

// ─── Diagram type helper ──────────────────────────────────────────────────────
function getDiagramType(lesson: LessonContent, variant: "concept" | "mistake" | "fix") {
  const check = lesson.telemetryCheck;
  if (variant === "mistake") {
    return check === "speed_min_corners" ? "apex_early"
      : check === "brake_profile_shape" ? "brake_trace"
      : check === "throttle_open_timing" ? "throttle_exit"
      : "apex_early";
  }
  if (variant === "fix") {
    return check === "speed_min_corners" ? "apex_late"
      : check === "brake_profile_shape" ? "brake_trace_ok"
      : check === "throttle_open_timing" ? "throttle_exit"
      : "apex_late";
  }
  // concept
  return check === "speed_min_corners" ? "apex_compare"
    : check === "brake_profile_shape" ? "brake_trace"
    : check === "lap_analysis_complete" ? "delta_explained"
    : check === "throttle_open_timing" ? "throttle_exit"
    : "racing_line_overview";
}

// ─── HOOK ─────────────────────────────────────────────────────────────────────
function HookStage({ lesson, onNext }: Pick<LessonStageProps, "lesson" | "onNext">) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 flex flex-col items-center justify-center px-8 py-10 text-center">
        <Reveal>
          <div className="w-20 h-20 rounded-2xl bg-lime-400/10 border border-lime-400/20 flex items-center justify-center mx-auto mb-8">
            <span className="text-5xl">{lesson.emoji}</span>
          </div>
        </Reveal>

        <Reveal delay={120} className="mb-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-zinc-700 text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
            <Zap size={10} className="text-lime-400" />
            {lesson.type === "theory" ? "Теория" : lesson.type === "exercise" ? "Упражнение" : "Задание"}
            &nbsp;·&nbsp;~{lesson.durationMin} мин
          </div>
        </Reveal>

        <Reveal delay={240}>
          <h2 className="text-3xl font-bold text-zinc-100 mb-6 leading-tight">{lesson.title}</h2>
        </Reveal>

        <Reveal delay={380}>
          <div className="max-w-lg mx-auto rounded-2xl border border-lime-400/20 bg-lime-400/5 px-8 py-6">
            <p className="text-lg text-zinc-200 leading-relaxed font-medium italic">
              &ldquo;{lesson.hook}&rdquo;
            </p>
          </div>
        </Reveal>
      </div>

      <Reveal delay={540} className="p-6 flex justify-center">
        <button onClick={onNext}
          className="flex items-center gap-2 px-8 py-3.5 rounded-xl bg-lime-400 hover:bg-lime-300 text-zinc-950 font-semibold transition-all hover:scale-105">
          Начать урок <ChevronRight size={18} />
        </button>
      </Reveal>
    </div>
  );
}

// ─── CONCEPT ─────────────────────────────────────────────────────────────────
function ConceptStage({ lesson, onNext }: Pick<LessonStageProps, "lesson" | "onNext">) {
  const [tab, setTab] = useState<"explain" | "points">("explain");

  return (
    <div className="flex flex-col gap-4 px-6 py-5 overflow-y-auto">
      <Reveal>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-400/10 border border-blue-400/20 w-fit">
          <BookOpen size={12} className="text-blue-400" />
          <span className="text-xs font-mono text-blue-400 uppercase tracking-widest">Объяснение</span>
        </div>
        <h3 className="text-xl font-bold text-zinc-100 mt-2 leading-snug">{lesson.title}</h3>
      </Reveal>

      {/* Tab switcher */}
      <Reveal delay={80}>
        <div className="flex gap-1 p-1 rounded-xl bg-zinc-900 border border-zinc-800">
          <button onClick={() => setTab("explain")}
            className={cn("flex-1 py-2 rounded-lg text-xs font-mono font-medium transition-all",
              tab === "explain" ? "bg-zinc-800 text-zinc-200" : "text-zinc-600 hover:text-zinc-400")}>
            📖 Объяснение
          </button>
          <button onClick={() => setTab("points")}
            className={cn("flex-1 py-2 rounded-lg text-xs font-mono font-medium transition-all",
              tab === "points" ? "bg-zinc-800 text-zinc-200" : "text-zinc-600 hover:text-zinc-400")}>
            ✓ Ключевые тезисы
          </button>
        </div>
      </Reveal>

      {/* Main body text */}
      {tab === "explain" && (
        <Reveal delay={120}>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 px-5 py-4">
            <BodyText text={lesson.body} />
          </div>
        </Reveal>
      )}

      {/* Key points */}
      {tab === "points" && (
        <div className="space-y-2">
          {lesson.keyPoints.map((pt, i) => (
            <Reveal key={i} delay={i * 80}>
              <div className="flex items-start gap-3 rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-3">
                <div className="w-6 h-6 rounded-full bg-lime-400/15 border border-lime-400/25 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-lime-400 font-mono">{i + 1}</span>
                </div>
                <p className="text-sm text-zinc-300 leading-relaxed">{pt}</p>
              </div>
            </Reveal>
          ))}
        </div>
      )}

      {/* Diagram */}
      {lesson.visual && (
        <Reveal delay={200}>
          <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-1.5">{lesson.visual.title}</p>
          <ConceptDiagram type={getDiagramType(lesson, "concept") as any} className="h-44" animated />
          <p className="text-xs text-zinc-500 mt-2 text-center">{lesson.visual.caption}</p>
        </Reveal>
      )}

      <Reveal delay={350}>
        <button onClick={onNext}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium transition-all border border-zinc-700">
          Понятно, к ошибкам <ChevronRight size={16} />
        </button>
      </Reveal>
    </div>
  );
}

// ─── MISTAKE ─────────────────────────────────────────────────────────────────
function MistakeStage({ lesson, onNext }: Pick<LessonStageProps, "lesson" | "onNext">) {
  return (
    <div className="flex flex-col gap-4 px-6 py-5 overflow-y-auto">
      <Reveal>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-400/10 border border-red-400/20 w-fit">
          <AlertTriangle size={12} className="text-red-400" />
          <span className="text-xs font-mono text-red-400 uppercase tracking-widest">Типичная ошибка</span>
        </div>
      </Reveal>

      <Reveal delay={80}>
        <div className="rounded-2xl border border-red-400/25 bg-red-400/5 px-5 py-4">
          <p className="text-sm text-zinc-200 leading-relaxed">{lesson.mistake}</p>
        </div>
      </Reveal>

      <Reveal delay={160}>
        <ConceptDiagram type={getDiagramType(lesson, "mistake") as any} className="h-40" animated />
        <p className="text-xs text-zinc-600 text-center mt-1.5 font-mono">Так делают большинство — это неоптимально</p>
      </Reveal>

      <Reveal delay={280}>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 space-y-2">
          <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Почему это медленно</p>
          {[
            "Машина уходит к внешнему краю раньше апекса",
            "Газ приходится держать закрытым дольше",
            "Потеря 0.2–0.5с на каждом таком повороте",
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
              <p className="text-sm text-zinc-400">{item}</p>
            </div>
          ))}
        </div>
      </Reveal>

      <Reveal delay={400}>
        <button onClick={onNext}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium transition-all border border-zinc-700">
          Как исправить? <ChevronRight size={16} />
        </button>
      </Reveal>
    </div>
  );
}

// ─── FIX ─────────────────────────────────────────────────────────────────────
function FixStage({ lesson, onNext }: Pick<LessonStageProps, "lesson" | "onNext">) {
  return (
    <div className="flex flex-col gap-4 px-6 py-5 overflow-y-auto">
      <Reveal>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-lime-400/10 border border-lime-400/20 w-fit">
          <CheckCircle2 size={12} className="text-lime-400" />
          <span className="text-xs font-mono text-lime-400 uppercase tracking-widest">Как исправить</span>
        </div>
      </Reveal>

      <Reveal delay={80}>
        <div className="rounded-2xl border border-lime-400/25 bg-lime-400/5 px-5 py-4">
          <p className="text-sm text-zinc-200 leading-relaxed">{lesson.fix}</p>
        </div>
      </Reveal>

      <Reveal delay={160}>
        <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-2">До и после — сдвиньте ползунок</p>
        <BeforeAfterSlider beforeLabel="Ошибка" afterLabel="Исправлено" beforeCost="−0.3с" afterGain="+0.3с" className="h-44">
          <ConceptDiagram type={getDiagramType(lesson, "mistake") as any} className="h-40 rounded-none border-0" animated={false} />
          <ConceptDiagram type={getDiagramType(lesson, "fix") as any} className="h-40 rounded-none border-0" animated={false} />
        </BeforeAfterSlider>
      </Reveal>

      {/* Step-by-step fix */}
      <Reveal delay={280}>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 space-y-2.5">
          <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">Пошагово</p>
          {lesson.keyPoints.slice(0, 3).map((pt, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-lime-400/15 border border-lime-400/25 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-[10px] font-bold text-lime-400">{i + 1}</span>
              </div>
              <p className="text-sm text-zinc-300">{pt}</p>
            </div>
          ))}
        </div>
      </Reveal>

      <Reveal delay={400}>
        <button onClick={onNext}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-lime-400/15 hover:bg-lime-400/25 text-lime-400 font-semibold transition-all border border-lime-400/30">
          Покажи в телеметрии <ChevronRight size={16} />
        </button>
      </Reveal>
    </div>
  );
}

// ─── PROOF ───────────────────────────────────────────────────────────────────
function ProofStage({ lesson, onNext }: Pick<LessonStageProps, "lesson" | "onNext">) {
  const metric = lesson.telemetryCheck === "speed_min_corners"
    ? { label: "Минимальная скорость в апексе", hint: "Должна быть выше референса на 3–8 км/ч", color: "text-lime-400" }
    : lesson.telemetryCheck === "brake_profile_shape"
    ? { label: "Точка торможения", hint: "Двигай на 5–8м вперёд относительно текущей", color: "text-blue-400" }
    : lesson.telemetryCheck === "throttle_open_timing"
    ? { label: "Момент открытия газа", hint: "Должен совпадать с апексом или быть сразу после", color: "text-yellow-400" }
    : { label: "Дельта-время", hint: "Должна быть положительной в зоне улучшения", color: "text-lime-400" };

  return (
    <div className="flex flex-col gap-4 px-6 py-5 overflow-y-auto">
      <Reveal>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-400/10 border border-blue-400/20 w-fit">
          <BarChart2 size={12} className="text-blue-400" />
          <span className="text-xs font-mono text-blue-400 uppercase tracking-widest">Доказательство в данных</span>
        </div>
      </Reveal>

      <Reveal delay={80}>
        <ConceptDiagram type="delta_explained" className="h-44" animated />
        <p className="text-xs text-zinc-500 text-center mt-2">Дельта-график показывает потерю именно в этой зоне</p>
      </Reveal>

      <Reveal delay={200}>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-3">Что смотреть в APEX телеметрии</p>
          <div className="flex items-start gap-3 mb-3">
            <div className="w-2 h-2 rounded-full bg-lime-400 shrink-0 mt-1.5" />
            <div>
              <p className={cn("text-sm font-semibold font-mono", metric.color)}>{metric.label}</p>
              <p className="text-xs text-zinc-500 mt-0.5">{metric.hint}</p>
            </div>
          </div>
          <div className="h-px bg-zinc-800 mb-3" />
          <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest mb-1">Практическое задание</p>
          <p className="text-sm text-zinc-300 leading-relaxed">{lesson.practicalTask}</p>
        </div>
      </Reveal>

      <Reveal delay={350}>
        <div className="rounded-xl border border-yellow-400/20 bg-yellow-400/5 p-4 flex items-start gap-3">
          <span className="text-lg shrink-0">💡</span>
          <p className="text-sm text-zinc-300 leading-relaxed">
            Загрузи круг в раздел <span className="text-yellow-400 font-medium">Телеметрия</span> — 
            там увидишь эту ошибку на своих реальных данных.
          </p>
        </div>
      </Reveal>

      <Reveal delay={470}>
        <button onClick={onNext}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium transition-all border border-zinc-700">
          К практике <ChevronRight size={16} />
        </button>
      </Reveal>
    </div>
  );
}

// ─── DRILL ───────────────────────────────────────────────────────────────────
function DrillStage({ lesson, onNext }: Pick<LessonStageProps, "lesson" | "onNext">) {
  const steps = lesson.drill.split(/\n/).filter(Boolean);
  return (
    <div className="flex flex-col gap-4 px-6 py-5 overflow-y-auto">
      <Reveal>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-orange-400/10 border border-orange-400/20 w-fit">
          <Target size={12} className="text-orange-400" />
          <span className="text-xs font-mono text-orange-400 uppercase tracking-widest">Практика прямо сейчас</span>
        </div>
        <h3 className="text-lg font-bold text-zinc-100 mt-2">Упражнение</h3>
      </Reveal>

      <Reveal delay={80}>
        <div className="rounded-2xl border border-orange-400/20 bg-orange-400/5 p-5 space-y-3">
          {steps.map((step, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-orange-400/20 border border-orange-400/30 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-xs font-bold text-orange-400 font-mono">{i + 1}</span>
              </div>
              <p className="text-sm text-zinc-200 leading-relaxed pt-1">{step.replace(/^\d+[.):\s]+/, "")}</p>
            </div>
          ))}
        </div>
      </Reveal>

      <Reveal delay={200}>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
          <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-2">🎯 Цель</p>
          <p className="text-sm text-zinc-300 leading-relaxed">{lesson.practicalTask}</p>
        </div>
      </Reveal>

      <Reveal delay={320}>
        <button onClick={onNext}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-orange-400/15 hover:bg-orange-400/25 text-orange-400 font-semibold transition-all border border-orange-400/30">
          Выполнил → Проверка знаний <ChevronRight size={16} />
        </button>
      </Reveal>
    </div>
  );
}

// ─── QUIZ ────────────────────────────────────────────────────────────────────
function QuizStage({ lesson, onNext }: Pick<LessonStageProps, "lesson" | "onNext">) {
  const quiz = lesson.quiz;
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);

  if (!quiz) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <span className="text-4xl mb-4">🧠</span>
        <p className="text-zinc-400 mb-6">Для этого урока нет теста.</p>
        <button onClick={onNext} className="px-6 py-3 rounded-xl bg-lime-400 text-zinc-950 font-semibold">
          Завершить урок
        </button>
      </div>
    );
  }

  const isCorrect = selected === quiz.correct;

  return (
    <div className="flex flex-col gap-4 px-6 py-5 overflow-y-auto">
      <Reveal>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-purple-400/10 border border-purple-400/20 w-fit">
          <Brain size={12} className="text-purple-400" />
          <span className="text-xs font-mono text-purple-400 uppercase tracking-widest">Проверка знаний</span>
        </div>
      </Reveal>

      <Reveal delay={80}>
        <div className="rounded-2xl border border-zinc-700 bg-zinc-900 px-5 py-4">
          <p className="text-base font-semibold text-zinc-100 leading-snug">{quiz.question}</p>
        </div>
      </Reveal>

      <div className="space-y-2">
        {quiz.options.map((opt, i) => {
          const isSelected = selected === i;
          const isRight = i === quiz.correct;
          return (
            <Reveal key={i} delay={120 + i * 70}>
              <button
                onClick={() => { if (!revealed) { setSelected(i); setTimeout(() => setRevealed(true), 250); } }}
                className={cn(
                  "w-full text-left flex items-center gap-3 px-4 py-3.5 rounded-xl border text-sm font-medium transition-all",
                  !revealed && "border-zinc-700 bg-zinc-800/60 hover:border-zinc-600 hover:bg-zinc-800 text-zinc-300",
                  revealed && isRight && "border-lime-400/40 bg-lime-400/10 text-lime-400",
                  revealed && isSelected && !isRight && "border-red-400/40 bg-red-400/10 text-red-400",
                  revealed && !isSelected && !isRight && "border-zinc-800 bg-zinc-900/40 text-zinc-600 opacity-50",
                )}>
                <div className={cn(
                  "w-7 h-7 rounded-full border flex items-center justify-center shrink-0 text-xs font-bold",
                  !revealed && isSelected && "border-white bg-white text-zinc-950",
                  !revealed && !isSelected && "border-zinc-600 text-zinc-500",
                  revealed && isRight && "border-lime-400 bg-lime-400 text-zinc-950",
                  revealed && isSelected && !isRight && "border-red-400 bg-red-400 text-white",
                  revealed && !isSelected && !isRight && "border-zinc-700 text-zinc-700",
                )}>
                  {revealed ? (isRight ? "✓" : isSelected ? "✗" : String.fromCharCode(65 + i)) : String.fromCharCode(65 + i)}
                </div>
                {opt}
              </button>
            </Reveal>
          );
        })}
      </div>

      {revealed && (
        <Reveal>
          <div className={cn("rounded-2xl border p-5",
            isCorrect ? "border-lime-400/30 bg-lime-400/8" : "border-yellow-400/25 bg-yellow-400/5")}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">{isCorrect ? "🎯" : "💡"}</span>
              <span className={cn("text-sm font-bold", isCorrect ? "text-lime-400" : "text-yellow-400")}>
                {isCorrect ? "Правильно!" : "Не совсем — но теперь понятно:"}
              </span>
            </div>
            <p className="text-sm text-zinc-300 leading-relaxed">{quiz.explanation}</p>
          </div>
          <button onClick={onNext}
            className="w-full mt-3 flex items-center justify-center gap-2 py-3 rounded-xl bg-lime-400 hover:bg-lime-300 text-zinc-950 font-semibold transition-all">
            {isCorrect ? "🏆 Завершить урок!" : "Понял, завершить"} <ChevronRight size={16} />
          </button>
        </Reveal>
      )}
    </div>
  );
}

// ─── DONE ────────────────────────────────────────────────────────────────────
function DoneStage({ lesson, onNext, isLast }: LessonStageProps) {
  const [xpShown, setXpShown] = useState(false);
  useEffect(() => { const t = setTimeout(() => setXpShown(true), 500); return () => clearTimeout(t); }, []);

  return (
    <div className="flex flex-col h-full items-center justify-center px-8 py-10 text-center">
      <Reveal>
        <div className="text-7xl mb-6">🏆</div>
      </Reveal>
      <Reveal delay={180}>
        <h2 className="text-2xl font-bold text-zinc-100 mb-2">Урок завершён!</h2>
        <p className="text-zinc-500 text-sm mb-6">{lesson.title}</p>
      </Reveal>

      <Reveal delay={350}>
        <div className={cn(
          "flex items-center gap-2 px-5 py-3 rounded-xl border border-yellow-400/30 bg-yellow-400/10 transition-all duration-500",
          xpShown ? "opacity-100 scale-100" : "opacity-0 scale-90"
        )}>
          <Zap size={18} className="text-yellow-400" />
          <span className="text-yellow-400 font-bold text-lg">+75 XP</span>
        </div>
      </Reveal>

      <Reveal delay={550}>
        <div className="mt-7 max-w-sm mx-auto rounded-xl border border-zinc-800 bg-zinc-900 p-5 text-left">
          <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-3">Что ты выучил</p>
          <ul className="space-y-2">
            {lesson.keyPoints.slice(0, 4).map((pt, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-zinc-300">
                <span className="text-lime-400 shrink-0 mt-0.5">✓</span>{pt}
              </li>
            ))}
          </ul>
        </div>
      </Reveal>

      <Reveal delay={750} className="mt-7">
        <button onClick={onNext}
          className="flex items-center gap-2 px-7 py-3.5 rounded-xl bg-lime-400 hover:bg-lime-300 text-zinc-950 font-semibold transition-all hover:scale-105">
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
      {stage === "hook"    && <HookStage    {...props} />}
      {stage === "concept" && <ConceptStage {...props} />}
      {stage === "mistake" && <MistakeStage {...props} />}
      {stage === "fix"     && <FixStage     {...props} />}
      {stage === "proof"   && <ProofStage   {...props} />}
      {stage === "drill"   && <DrillStage   {...props} />}
      {stage === "quiz"    && <QuizStage    {...props} />}
      {stage === "done"    && <DoneStage    {...props} />}
    </div>
  );
}
