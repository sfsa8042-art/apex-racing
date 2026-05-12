"use client";
import { useEffect, useState } from "react";
import { Download, Monitor, Shield, ChevronRight, ExternalLink, Loader2, AlertCircle, CheckCircle, Github } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface ReleaseInfo {
  version: string;
  exe: { name: string; url: string; size: number } | null;
  msi: { name: string; url: string; size: number } | null;
}

function fmt(bytes: number): string {
  if (bytes < 1_048_576) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1_048_576).toFixed(1)} MB`;
}

const STEPS = [
  { n: "1", title: "Скачай установщик", desc: "Нажми кнопку ниже — скачается .exe файл" },
  { n: "2", title: "Запусти установщик", desc: "Дважды кликни по .exe, следуй инструкциям" },
  { n: "3", title: "Выбери папку телеметрии", desc: "iRacing: Documents\\iRacing\\telemetry" },
  { n: "4", title: "Вставь API-токен", desc: "Из настроек профиля на этом сайте" },
  { n: "5", title: "Нажми «Запустить»", desc: "Новые круги загружаются автоматически" },
];

export default function DownloadPage() {
  const [info,    setInfo]    = useState<ReleaseInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/download?format=info")
      .then(r => r.json())
      .then(d => {
        if (d.error) setError(d.error);
        else setInfo(d);
      })
      .catch(() => setError("Не удалось получить информацию о версии"))
      .finally(() => setLoading(false));
  }, []);

  const exeUrl = info?.exe ? "/api/download?format=exe" : null;
  const msiUrl = info?.msi ? "/api/download?format=msi" : null;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Navbar */}
      <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-lime-400 flex items-center justify-center">
              <span className="text-zinc-950 text-xs font-bold">AP</span>
            </div>
            <span className="text-sm font-semibold tracking-tight">APEX</span>
          </Link>
          <div className="flex-1" />
          <Link href="/dashboard" className="text-sm text-zinc-400 hover:text-zinc-200 transition-colors">
            Войти в дашборд →
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-16">
        {/* Hero */}
        <div className="text-center mb-12">
          <div className="w-20 h-20 rounded-2xl bg-lime-400/10 border border-lime-400/20 flex items-center justify-center mx-auto mb-6">
            <Monitor size={36} className="text-lime-400" />
          </div>
          <h1 className="text-4xl font-bold text-zinc-100 mb-3">APEX Desktop</h1>
          <p className="text-zinc-400 leading-relaxed max-w-md mx-auto">
            Автоматически загружает телеметрию после каждой сессии.
            Поддерживает iRacing, Assetto Corsa Competizione, rFactor 2.
          </p>
        </div>

        {/* Download card */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 overflow-hidden mb-8">
          {/* Header */}
          <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
            <div>
              <p className="text-xs font-mono uppercase tracking-widest text-zinc-500 mb-0.5">Windows 10/11 · 64-bit</p>
              {loading && <div className="h-5 w-24 bg-zinc-800 rounded animate-pulse"/>}
              {info    && <p className="text-sm font-mono text-zinc-300">{info.version}</p>}
              {error   && <p className="text-xs text-zinc-600 font-mono">версия недоступна</p>}
            </div>
            <div className="flex items-center gap-1.5 text-xs font-mono text-zinc-600">
              <Shield size={11} className="text-lime-400/70"/>
              Бесплатно
            </div>
          </div>

          {/* Main CTA */}
          <div className="p-6 space-y-3">
            {/* EXE button */}
            {loading ? (
              <div className="flex items-center justify-center gap-2 w-full py-4 rounded-xl bg-zinc-800 text-zinc-600">
                <Loader2 size={16} className="animate-spin"/>
                <span className="text-sm">Проверяем наличие версии…</span>
              </div>
            ) : error && !exeUrl ? (
              <div className="rounded-xl border border-yellow-400/25 bg-yellow-400/5 p-4 text-center">
                <AlertCircle size={18} className="text-yellow-400 mx-auto mb-2"/>
                <p className="text-sm text-zinc-300 mb-1">Сборка ещё не опубликована</p>
                <p className="text-xs text-zinc-500 leading-relaxed">
                  Разработчик ещё не сделал первый релиз на GitHub.
                  Следи за обновлениями или скачай исходный код.
                </p>
              </div>
            ) : (
              <a
                href={exeUrl ?? "#"}
                className={cn(
                  "group flex items-center gap-3 w-full px-6 py-4 rounded-xl font-semibold text-base transition-all",
                  exeUrl
                    ? "bg-lime-400 hover:bg-lime-300 text-zinc-950 shadow-xl shadow-lime-400/20 hover:shadow-lime-400/30 hover:-translate-y-0.5"
                    : "bg-zinc-800 text-zinc-600 cursor-not-allowed"
                )}
              >
                <Download size={20} className={cn("shrink-0", exeUrl && "group-hover:-translate-y-0.5 transition-transform")}/>
                <span className="flex-1 text-left">
                  Скачать APEX Desktop
                  {info?.exe && (
                    <span className="block text-xs opacity-60 font-mono font-normal mt-0.5">
                      {info.exe.name} · {fmt(info.exe.size)}
                    </span>
                  )}
                </span>
                <ChevronRight size={18} className="shrink-0 opacity-60"/>
              </a>
            )}

            {/* MSI alternative */}
            {msiUrl && info?.msi && (
              <a href={msiUrl}
                className="flex items-center gap-3 w-full px-4 py-3 rounded-xl border border-zinc-700 bg-zinc-800/50 hover:bg-zinc-800 transition-all text-sm">
                <Download size={14} className="text-zinc-400 shrink-0"/>
                <div className="flex-1 text-left">
                  <span className="text-zinc-300">MSI установщик</span>
                  <span className="text-zinc-600 font-mono text-xs block">{info.msi.name} · {fmt(info.msi.size)}</span>
                </div>
                <span className="text-xs text-zinc-600 font-mono">для IT-деплоя</span>
              </a>
            )}

            {/* System requirements */}
            <div className="flex items-center justify-center gap-4 text-xs text-zinc-600 font-mono pt-1">
              <span className="flex items-center gap-1.5"><CheckCircle size={10} className="text-zinc-700"/>Windows 10/11</span>
              <span className="flex items-center gap-1.5"><CheckCircle size={10} className="text-zinc-700"/>64-bit</span>
              <span className="flex items-center gap-1.5"><CheckCircle size={10} className="text-zinc-700"/>~15 MB</span>
              <span className="flex items-center gap-1.5"><CheckCircle size={10} className="text-zinc-700"/>Без прав администратора</span>
            </div>
          </div>
        </div>

        {/* Steps */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 mb-8">
          <p className="text-xs font-mono uppercase tracking-widest text-zinc-500 mb-5">Установка за 2 минуты</p>
          <div className="space-y-4">
            {STEPS.map(step => (
              <div key={step.n} className="flex items-start gap-4">
                <div className="w-7 h-7 rounded-full bg-lime-400/10 border border-lime-400/20 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-lime-400 font-mono">{step.n}</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-200">{step.title}</p>
                  <p className="text-xs text-zinc-500 font-mono mt-0.5">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Supported sims */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 mb-8">
          <p className="text-xs font-mono uppercase tracking-widest text-zinc-500 mb-4">Поддерживаемые симуляторы</p>
          <div className="space-y-3">
            {[
              { sim: "iRacing",                        path: "Documents\\iRacing\\telemetry",                          ext: ".ibt / .csv" },
              { sim: "Assetto Corsa Competizione",      path: "Documents\\Assetto Corsa Competizione\\MoTeC",           ext: ".ld / .csv" },
              { sim: "rFactor 2",                       path: "rFactor2\\UserData\\Log\\Results",                       ext: ".csv"        },
              { sim: "Generic CSV / JSON",              path: "Любая папка",                                            ext: ".csv / .json" },
            ].map(({ sim, path, ext }) => (
              <div key={sim} className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-lime-400/60 shrink-0 mt-2"/>
                <div>
                  <p className="text-sm text-zinc-200 font-medium">{sim}</p>
                  <p className="text-xs text-zinc-600 font-mono">{path}</p>
                  <p className="text-xs text-zinc-700 font-mono">{ext}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer links */}
        <div className="flex items-center justify-center gap-6 text-xs text-zinc-600">
          <a href={`https://github.com/${process.env.NEXT_PUBLIC_GITHUB_REPO ?? "sfsa8042-art/apex-racing"}/releases`}
            target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 hover:text-zinc-400 transition-colors font-mono">
            <Github size={12}/> GitHub Releases
          </a>
          <Link href="/dashboard" className="flex items-center gap-1.5 hover:text-zinc-400 transition-colors font-mono">
            <ExternalLink size={11}/> Открыть дашборд
          </Link>
          <Link href="/" className="hover:text-zinc-400 transition-colors font-mono">← Главная</Link>
        </div>
      </main>
    </div>
  );
}
