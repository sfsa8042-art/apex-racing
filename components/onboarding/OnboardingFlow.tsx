"use client";
import { useState, useEffect } from "react";
import { ArrowRight, X, Activity, BarChart2, BookOpen, User, Check, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLang } from "@/context/LanguageContext";
import { saveProfile, loadProfile, getInitials, avatarColor } from "@/lib/profile/store";
import type { UserProfile } from "@/lib/profile/store";

const ONBOARDING_KEY = "apex_onboarded_v3";
const SIMULATORS = ["iRacing", "ACC", "rFactor 2", "Automobilista 2", "Другой"];

export function OnboardingFlow() {
  const { t } = useLang();
  const [visible,   setVisible]   = useState(false);
  const [dismissed, setDismissed] = useState(true);
  const [step,      setStep]      = useState(0); // 0=welcome, 1=profile, 2=done

  // Profile form state
  const [name,      setName]      = useState("");
  const [email,     setEmail]     = useState("");
  const [simulator, setSimulator] = useState("iRacing");
  const [error,     setError]     = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const profile = loadProfile();
    // Only show if no profile yet — once created, never show again
    if (!profile) {
      setDismissed(false);
      setVisible(true);
      setStep(0);
    }
  }, []);

  const finish = () => {
    localStorage.setItem(ONBOARDING_KEY, "1");
    setVisible(false);
    setTimeout(() => setDismissed(true), 300);
  };

  const handleCreateProfile = () => {
    if (!name.trim()) { setError("Введи имя"); return; }
    const profile: UserProfile = {
      name: name.trim(),
      email: email.trim(),
      simulator,
      bio: "",
      apiToken: "",
      createdAt: new Date().toISOString(),
    };
    saveProfile(profile);
    setStep(2);
    setTimeout(finish, 1200);
  };

  if (dismissed || !visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/90 backdrop-blur-sm p-4"
      style={{ animation: "fadeIn 0.2s ease both" }}>
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden"
        style={{ animation: "modalIn 0.35s cubic-bezier(0.34,1.56,0.64,1) both" }}>

        {/* ── Step 0: Welcome ─────────────────────────────────────────────── */}
        {step === 0 && (
          <>
            <div className="p-6 pb-5">
              <div className="flex items-center justify-between mb-5">
                <div className="w-10 h-10 rounded-xl bg-lime-400 flex items-center justify-center">
                  <span className="text-zinc-950 text-sm font-black">AP</span>
                </div>
                <button onClick={finish} className="w-7 h-7 rounded-lg hover:bg-zinc-800 flex items-center justify-center text-zinc-500">
                  <X size={14}/>
                </button>
              </div>

              <h2 className="text-xl font-bold text-zinc-100 mb-1">Добро пожаловать в APEX</h2>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Платформа анализирует твою телеметрию и показывает где именно ты теряешь время.
              </p>

              <div className="mt-5 space-y-3">
                {[
                  { icon: Activity,  color: "text-lime-400", bg: "bg-lime-400/10",
                    title: "Загружай телеметрию", desc: "CSV или JSON из любого симулятора" },
                  { icon: BarChart2, color: "text-blue-400", bg: "bg-blue-400/10",
                    title: "Получай анализ", desc: "Дельта, тепловая карта, AI инженер" },
                  { icon: BookOpen,  color: "text-yellow-400", bg: "bg-yellow-400/10",
                    title: "Учись через Академию", desc: "29+ уроков, привязанных к твоим ошибкам" },
                ].map(({ icon: Icon, color, bg, title, desc }) => (
                  <div key={title} className="flex items-start gap-3 p-3 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
                    <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", bg)}>
                      <Icon size={15} className={color}/>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-zinc-200">{title}</p>
                      <p className="text-xs text-zinc-500">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="px-6 pb-6">
              <button onClick={() => setStep(1)}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-lime-400 hover:bg-lime-300 text-zinc-950 font-semibold text-sm transition-all hover:scale-105">
                Начать — создать профиль <ArrowRight size={16}/>
              </button>
              <button onClick={finish} className="w-full text-center text-xs text-zinc-600 hover:text-zinc-400 mt-2 py-1 transition-colors">
                Пропустить
              </button>
            </div>
          </>
        )}

        {/* ── Step 1: Create profile ──────────────────────────────────────── */}
        {step === 1 && (
          <>
            <div className="px-6 pt-6 pb-4">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-blue-400/10 border border-blue-400/20 flex items-center justify-center">
                  <User size={18} className="text-blue-400"/>
                </div>
                <div>
                  <h2 className="text-base font-bold text-zinc-100">Создай профиль</h2>
                  <p className="text-xs text-zinc-500">Хранится в браузере — без регистрации</p>
                </div>
              </div>

              <div className="space-y-3">
                {/* Name */}
                <div>
                  <label className="text-[11px] font-mono uppercase tracking-widest text-zinc-500 block mb-1">
                    Имя / никнейм *
                  </label>
                  <input value={name} onChange={e => { setName(e.target.value); setError(""); }}
                    placeholder="Иван Петров или SliceMaster99"
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm text-zinc-200 placeholder-zinc-600 outline-none focus:border-zinc-500 transition-colors"/>
                  {error && (
                    <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                      <AlertCircle size={11}/>{error}
                    </p>
                  )}
                </div>

                {/* Email */}
                <div>
                  <label className="text-[11px] font-mono uppercase tracking-widest text-zinc-500 block mb-1">
                    Email <span className="text-zinc-700">(необязательно)</span>
                  </label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="ivan@example.com"
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm text-zinc-200 placeholder-zinc-600 outline-none focus:border-zinc-500 transition-colors"/>
                </div>

                {/* Simulator */}
                <div>
                  <label className="text-[11px] font-mono uppercase tracking-widest text-zinc-500 block mb-1.5">
                    Симулятор
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {SIMULATORS.map(sim => (
                      <button key={sim} onClick={() => setSimulator(sim)}
                        className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-all border",
                          simulator === sim
                            ? "bg-lime-400/15 border-lime-400/30 text-lime-400"
                            : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-600")}>
                        {sim}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Avatar preview */}
                {name.trim() && (
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold shrink-0"
                      style={{ background: `${avatarColor(name)}20`, color: avatarColor(name) }}>
                      {getInitials(name)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-zinc-200">{name}</p>
                      <p className="text-xs text-zinc-500">{simulator}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="px-6 pb-6 flex gap-2">
              <button onClick={() => setStep(0)}
                className="px-4 py-2.5 rounded-xl border border-zinc-700 text-zinc-400 hover:text-zinc-200 text-sm transition-colors">
                Назад
              </button>
              <button onClick={handleCreateProfile}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-lime-400 hover:bg-lime-300 text-zinc-950 font-semibold text-sm transition-all">
                Создать профиль <ArrowRight size={15}/>
              </button>
            </div>
          </>
        )}

        {/* ── Step 2: Done ─────────────────────────────────────────────────── */}
        {step === 2 && (
          <div className="p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-lime-400/15 border border-lime-400/25 flex items-center justify-center mx-auto mb-4"
              style={{ animation: "countUp 0.4s cubic-bezier(0.34,1.56,0.64,1) both" }}>
              <Check size={28} className="text-lime-400"/>
            </div>
            <h2 className="text-xl font-bold text-zinc-100 mb-2">Профиль создан!</h2>
            <p className="text-sm text-zinc-500">
              Загрузи первый круг на странице <span className="text-zinc-300 font-medium">Телеметрия</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
