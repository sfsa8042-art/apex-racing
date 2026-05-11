"use client";
import { useState, useEffect } from "react";
import {
  User, Edit3, Save, X, Zap, Trophy, Activity,
  TrendingUp, TrendingDown, Minus, Calendar, CheckCircle,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { loadProfile, saveProfile, clearProfile, getInitials, avatarColor } from "@/lib/profile/store";
import type { UserProfile } from "@/lib/profile/store";
import { computeLevelProgress } from "@/lib/ranking/system";
import { computeStreak }        from "@/lib/progress/streak";
import { loadHistory }          from "@/lib/progress/tracker";
import { analysePatterns }      from "@/lib/patterns/detector";
import { useTelemetry }         from "@/context/TelemetryContext";
import type { LapHistoryEntry } from "@/types/extended";

const SIMULATORS = ["iRacing","Assetto Corsa Competizione","rFactor 2","Automobilista 2","Le Mans Ultimate","Другой"];

// ─── Avatar ────────────────────────────────────────────────────────────────────
function Avatar({ profile, size = "lg" }: { profile: UserProfile; size?: "sm"|"md"|"lg" }) {
  const sz  = size === "lg" ? "w-20 h-20 text-2xl" : size === "md" ? "w-12 h-12 text-base" : "w-8 h-8 text-xs";
  const col = avatarColor(profile.name);
  return (
    <div className={cn("rounded-2xl flex items-center justify-center font-bold shrink-0", sz)}
      style={{ background: `${col}20`, border: `2px solid ${col}40`, color: col }}>
      {getInitials(profile.name)}
    </div>
  );
}

// ─── Profile create / edit form ────────────────────────────────────────────────
function ProfileForm({ existing, onSave, onCancel }: {
  existing: UserProfile | null;
  onSave: (p: UserProfile) => void;
  onCancel?: () => void;
}) {
  const [name,      setName]      = useState(existing?.name      ?? "");
  const [email,     setEmail]     = useState(existing?.email     ?? "");
  const [simulator, setSimulator] = useState(existing?.simulator ?? "iRacing");
  const [bio,       setBio]       = useState(existing?.bio       ?? "");
  const [error,     setError]     = useState("");
  const [saved,     setSaved]     = useState(false);

  const handleSubmit = () => {
    if (!name.trim()) { setError("Введи имя"); return; }
    const profile: UserProfile = {
      name: name.trim(),
      email: email.trim(),
      simulator,
      bio: bio.trim(),
      createdAt: existing?.createdAt ?? new Date().toISOString(),
    };
    saveProfile(profile);
    setSaved(true);
    setTimeout(() => { setSaved(false); onSave(profile); }, 800);
  };

  const isNew = !existing;

  return (
    <div className={cn("rounded-2xl border border-zinc-800 bg-zinc-900 overflow-hidden",
      !isNew && "")}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-zinc-100">
            {isNew ? "Создать профиль" : "Редактировать профиль"}
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            {isNew ? "Данные хранятся в браузере — без регистрации" : "Изменения сохраняются локально"}
          </p>
        </div>
        {!isNew && onCancel && (
          <button onClick={onCancel} className="w-8 h-8 rounded-lg hover:bg-zinc-800 flex items-center justify-center text-zinc-500 hover:text-zinc-300 transition-colors">
            <X size={15}/>
          </button>
        )}
      </div>

      <div className="p-6 space-y-4">
        {/* Name */}
        <div>
          <label className="text-xs font-mono uppercase tracking-widest text-zinc-500 block mb-1.5">
            Имя / никнейм *
          </label>
          <input value={name} onChange={e => { setName(e.target.value); setError(""); }}
            placeholder="Например: Иван Петров или SliceMaster99"
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-zinc-200 placeholder-zinc-600 outline-none focus:border-zinc-500 transition-colors"/>
          {error && <p className="text-xs text-red-400 mt-1 flex items-center gap-1"><AlertCircle size={11}/>{error}</p>}
        </div>

        {/* Email */}
        <div>
          <label className="text-xs font-mono uppercase tracking-widest text-zinc-500 block mb-1.5">
            Email <span className="text-zinc-700">(необязательно)</span>
          </label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="ivan@example.com"
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-zinc-200 placeholder-zinc-600 outline-none focus:border-zinc-500 transition-colors"/>
        </div>

        {/* Simulator */}
        <div>
          <label className="text-xs font-mono uppercase tracking-widest text-zinc-500 block mb-1.5">
            Основной симулятор
          </label>
          <div className="flex flex-wrap gap-2">
            {SIMULATORS.map(sim => (
              <button key={sim} onClick={() => setSimulator(sim)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium transition-all border",
                  simulator === sim
                    ? "bg-lime-400/15 border-lime-400/30 text-lime-400"
                    : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-600 hover:text-zinc-300"
                )}>
                {sim}
              </button>
            ))}
          </div>
        </div>

        {/* Bio */}
        <div>
          <label className="text-xs font-mono uppercase tracking-widest text-zinc-500 block mb-1.5">
            О себе <span className="text-zinc-700">(необязательно)</span>
          </label>
          <textarea value={bio} onChange={e => setBio(e.target.value)}
            placeholder="Любимые трассы, цели, опыт..."
            rows={3}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-zinc-200 placeholder-zinc-600 outline-none focus:border-zinc-500 transition-colors resize-none"/>
        </div>

        {/* Preview */}
        {name.trim() && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-800/50 p-3 flex items-center gap-3">
            <Avatar profile={{ name, email, simulator, bio, createdAt: "" }} size="md"/>
            <div>
              <p className="text-sm font-semibold text-zinc-200">{name}</p>
              <p className="text-xs text-zinc-500">{simulator}</p>
            </div>
          </div>
        )}

        {/* Submit */}
        <button onClick={handleSubmit}
          className={cn(
            "w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all",
            saved
              ? "bg-lime-400/15 border border-lime-400/30 text-lime-400"
              : "bg-lime-400 hover:bg-lime-300 text-zinc-950 shadow-lg shadow-lime-400/20"
          )}>
          {saved ? <><CheckCircle size={15}/>Сохранено!</> : <><Save size={15}/>{isNew ? "Создать профиль" : "Сохранить изменения"}</>}
        </button>
      </div>
    </div>
  );
}

// ─── Stats from telemetry history ─────────────────────────────────────────────
function StatsSection() {
  const { levelProgress, driverRank } = useTelemetry();
  const [history, setHistory]   = useState<LapHistoryEntry[]>([]);
  const [streak,  setStreak]    = useState<ReturnType<typeof computeStreak> | null>(null);

  useEffect(() => {
    const h = loadHistory();
    setHistory(h);
    setStreak(computeStreak());
  }, []);

  const lp = levelProgress ?? computeLevelProgress(null);
  const trend = history.length >= 2
    ? history[0].overallScore - history[history.length - 1].overallScore
    : 0;

  return (
    <div className="space-y-4">
      {/* XP + Level */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs font-mono uppercase tracking-widest text-zinc-500 mb-1">Уровень</p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-zinc-100">{lp.level}</span>
              <span className="text-sm text-zinc-500 font-mono">{lp.level}</span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-zinc-500 font-mono">{lp.totalXP} XP</p>
            <p className="text-xs text-zinc-700 font-mono">+{lp.xpToNextLevel} до след.</p>
          </div>
        </div>
        {/* XP bar */}
        <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
          <div className="h-full rounded-full bg-lime-400 transition-all duration-700"
            style={{ width: `${lp.progressPct}%` }}/>
        </div>
        <p className="text-xs text-zinc-600 font-mono mt-1.5">
          {lp.xpToNextLevel} XP до следующего уровня
        </p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Кругов загружено", value: history.length, icon: Activity, color: "text-blue-400" },
          { label: "Серия дней",       value: streak?.currentStreak ?? 0, icon: Calendar, color: "text-orange-400", suffix: "д" },
          { label: "Тренд счёта",      value: trend, icon: trend >= 0 ? TrendingUp : TrendingDown,
            color: trend > 0 ? "text-lime-400" : trend < 0 ? "text-red-400" : "text-zinc-500",
            prefix: trend > 0 ? "+" : "" },
        ].map(({ label, value, icon: Icon, color, suffix, prefix }) => (
          <div key={label} className="rounded-xl border border-zinc-800 bg-zinc-900 p-3 text-center">
            <Icon size={16} className={cn("mx-auto mb-1.5", color)}/>
            <p className={cn("text-xl font-bold font-mono", color)}>
              {prefix}{value}{suffix}
            </p>
            <p className="text-[10px] text-zinc-600 mt-0.5 leading-tight">{label}</p>
          </div>
        ))}
      </div>

      {/* Score sparkline */}
      {history.length >= 2 && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
          <p className="text-xs font-mono uppercase tracking-widest text-zinc-500 mb-3">
            Динамика счёта
          </p>
          <div className="rounded-xl bg-zinc-950 border border-zinc-800 overflow-hidden">
            <svg viewBox="0 0 500 80" className="w-full" style={{ height: 70 }}>
              {(() => {
                const scores = [...history].reverse().map(e => e.overallScore);
                const min = Math.max(0, Math.min(...scores) - 5);
                const max = Math.min(100, Math.max(...scores) + 5);
                const toX = (i: number) => 16 + (i / Math.max(1, scores.length - 1)) * 468;
                const toY = (s: number) => 10 + 50 - ((s - min) / (max - min || 1)) * 50;
                const d = scores.map((s, i) => `${i === 0 ? "M" : "L"} ${toX(i).toFixed(1)} ${toY(s).toFixed(1)}`).join(" ");
                const area = `${d} L ${toX(scores.length-1).toFixed(1)} 70 L 16 70 Z`;
                return (
                  <>
                    <path d={area} fill="rgba(163,230,53,0.07)"/>
                    <path d={d} fill="none" stroke="#a3e635" strokeWidth="2.5" strokeLinejoin="round"/>
                    {scores.map((s, i) => <circle key={i} cx={toX(i)} cy={toY(s)} r="3" fill={i===scores.length-1?"#a3e635":"#18181b"} stroke="#a3e635" strokeWidth="1.5"/>)}
                  </>
                );
              })()}
            </svg>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────
export default function ProfilePage() {
  const [profile,  setProfile]  = useState<UserProfile | null>(null);
  const [editing,  setEditing]  = useState(false);
  const [mounted,  setMounted]  = useState(false);

  useEffect(() => {
    setMounted(true);
    setProfile(loadProfile());
  }, []);

  if (!mounted) return null;

  const handleSave = (p: UserProfile) => {
    setProfile(p);
    setEditing(false);
  };

  // ── No profile → creation form ─────────────────────────────────────────────
  if (!profile) {
    return (
      <div className="min-h-full flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-lg">
          {/* Welcome */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-lime-400/10 border border-lime-400/20 flex items-center justify-center mx-auto mb-4">
              <User size={28} className="text-lime-400"/>
            </div>
            <h1 className="text-2xl font-bold text-zinc-100 mb-2">Создай свой профиль</h1>
            <p className="text-sm text-zinc-500 leading-relaxed">
              Профиль хранится в твоём браузере. Никакой регистрации — просто введи имя.
            </p>
          </div>
          <ProfileForm existing={null} onSave={handleSave}/>
        </div>
      </div>
    );
  }

  // ── Has profile → show profile ─────────────────────────────────────────────
  return (
    <div className="p-6 max-w-4xl mx-auto">
      {editing ? (
        <ProfileForm existing={profile} onSave={handleSave} onCancel={() => setEditing(false)}/>
      ) : (
        <div className="space-y-5">
          {/* Profile card */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
            <div className="flex items-start gap-5">
              <Avatar profile={profile} size="lg"/>
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl font-bold text-zinc-100 leading-tight">{profile.name}</h1>
                {profile.email && (
                  <p className="text-sm text-zinc-500 mt-0.5 font-mono">{profile.email}</p>
                )}
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <span className="text-xs px-2.5 py-1 rounded-lg bg-lime-400/10 border border-lime-400/20 text-lime-400 font-mono">
                    {profile.simulator}
                  </span>
                  <span className="text-xs text-zinc-600 font-mono">
                    с {new Date(profile.createdAt).toLocaleDateString("ru", { month: "long", year: "numeric" })}
                  </span>
                </div>
                {profile.bio && (
                  <p className="text-sm text-zinc-400 mt-3 leading-relaxed">{profile.bio}</p>
                )}
              </div>
              <button onClick={() => setEditing(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-700 hover:border-zinc-500 text-zinc-400 hover:text-zinc-200 text-xs transition-all shrink-0">
                <Edit3 size={12}/> Изменить
              </button>
            </div>
          </div>

          {/* Stats */}
          <StatsSection/>

          {/* Danger zone */}
          <div className="rounded-xl border border-zinc-800 p-4">
            <p className="text-xs font-mono uppercase tracking-widest text-zinc-600 mb-3">
              Управление данными
            </p>
            <button onClick={() => { clearProfile(); setProfile(null); }}
              className="text-xs text-red-400/70 hover:text-red-400 transition-colors font-mono">
              Удалить профиль
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
