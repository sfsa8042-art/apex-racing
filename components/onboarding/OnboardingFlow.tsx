"use client";
import { useState, useEffect } from "react";
import { ArrowRight, X, Activity, BarChart2, BookOpen, Upload, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLang } from "@/context/LanguageContext";

const ONBOARDING_KEY = "apex_onboarded_v2";

export function OnboardingFlow() {
  const { t } = useLang();
  const [visible,    setVisible]    = useState(false);
  const [dismissed,  setDismissed]  = useState(true);
  const [stepIdx,    setStepIdx]    = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const done = localStorage.getItem(ONBOARDING_KEY);
    if (!done) { setDismissed(false); setVisible(true); }
  }, []);

  const finish = () => {
    if (typeof window !== "undefined") localStorage.setItem(ONBOARDING_KEY, "1");
    setVisible(false);
    setTimeout(() => setDismissed(true), 400);
  };

  if (dismissed || !visible) return null;

  const STEPS = [
    { icon: Activity,  title: t.onboarding.step1.title, body: t.onboarding.step1.body, color: "text-lime-400"   },
    { icon: BarChart2, title: t.onboarding.step2.title, body: t.onboarding.step2.body, color: "text-blue-400",
      visual: (
        <div className="relative rounded-lg overflow-hidden bg-zinc-800 border border-zinc-700 h-16 mt-3">
          <svg viewBox="0 0 400 64" className="w-full h-full">
            <defs>
              <linearGradient id="dg" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%"   stopColor="#4ade80" stopOpacity="0.8" />
                <stop offset="55%"  stopColor="#4ade80" stopOpacity="0.3" />
                <stop offset="65%"  stopColor="#f87171" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#f87171" stopOpacity="0.8" />
              </linearGradient>
            </defs>
            <line x1="0" y1="32" x2="400" y2="32" stroke="#3f3f46" strokeWidth="1" />
            <polyline points="0,28 60,26 120,32 180,38 240,42 300,38 400,36"
              fill="none" stroke="url(#dg)" strokeWidth="3" strokeLinejoin="round" />
            <text x="8"   y="18" fontSize="9" fill="#4ade80" fontFamily="monospace">+gaining</text>
            <text x="260" y="54" fontSize="9" fill="#f87171" fontFamily="monospace">–losing</text>
          </svg>
        </div>
      ),
    },
    { icon: BookOpen, title: t.onboarding.step3.title, body: t.onboarding.step3.body, color: "text-yellow-400" },
    { icon: Upload,   title: t.onboarding.step4.title, body: t.onboarding.step4.body, color: "text-purple-400" },
  ];

  const step   = STEPS[stepIdx];
  const Icon   = step.icon;
  const isLast = stepIdx === STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/85 backdrop-blur-sm p-4 animate-fade-in">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl overflow-hidden">
        {/* Progress */}
        <div className="flex">
          {STEPS.map((_, i) => (
            <div key={i} className={cn("h-0.5 flex-1 transition-all duration-300", i <= stepIdx ? "bg-lime-400" : "bg-zinc-700")} />
          ))}
        </div>

        <div className="flex items-center justify-between px-5 pt-5 pb-2">
          <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">{stepIdx + 1} / {STEPS.length}</span>
          <button onClick={finish} className="w-7 h-7 rounded-lg hover:bg-zinc-800 flex items-center justify-center text-zinc-500 transition-colors">
            <X size={14} />
          </button>
        </div>

        <div className="px-5 pb-6">
          <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center mb-4">
            <Icon size={20} className={step.color} />
          </div>
          <h2 className="text-xl font-semibold text-zinc-100 mb-2">{step.title}</h2>
          <p className="text-sm text-zinc-400 leading-relaxed">{step.body}</p>
          {(step as any).visual}

          <div className="flex items-center justify-between mt-6">
            <button onClick={finish} className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors">
              {t.onboarding.skip}
            </button>
            <button onClick={() => isLast ? finish() : setStepIdx((i) => i + 1)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-lime-400 hover:bg-lime-300 text-zinc-950 text-sm font-semibold transition-colors">
              {isLast ? t.onboarding.start : t.onboarding.next}
              {isLast ? <ArrowRight size={14} /> : <ChevronRight size={14} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
