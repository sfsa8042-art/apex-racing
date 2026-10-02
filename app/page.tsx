"use client";

import { useCopy } from "../shared/i18n/react";
import { LanguageSwitch, useLang } from "@/context/LanguageContext";
import Link from "next/link";
import { ArrowRight, BarChart2, BookOpen, Languages, Monitor } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { DownloadButtonHero, DownloadButtonNavbar, DownloadSection, DownloadLink } from "@/components/ui/DownloadButton";
import { HeroVisual } from "@/components/landing/HeroVisual";

function NavBar() {
  const copy = useCopy();
  return (
    <nav className="sticky top-0 z-40 border-b border-zinc-800/80 bg-zinc-950/70 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-2 px-3 sm:gap-6 sm:px-4">
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-lime-400">
            <span className="text-xs font-bold text-zinc-950">{copy("ui.268")}</span>
          </div>
          <span className="hidden font-display text-sm font-semibold tracking-tight text-zinc-100 sm:inline">
            {copy("ui.269")}
          </span>
        </Link>

        <nav className="ml-4 hidden items-center gap-5 text-sm text-zinc-400 md:flex">
          <a href="#features" className="transition-colors hover:text-zinc-200">{copy("ui.303")}</a>
          <a href="#how-it-works" className="transition-colors hover:text-zinc-200">{copy("ui.304")}</a>
          <a href="#download" className="transition-colors hover:text-zinc-200">{copy("ui.143")}</a>
        </nav>

        <div className="flex-1" />
        <div className="flex items-center gap-2">
          <LanguageSwitch />
          <div className="hidden lg:block"><DownloadButtonNavbar /></div>
          <Link href="/dashboard">
            <Button variant="primary" size="sm">{copy("ui.305")}</Button>
          </Link>
        </div>
      </div>
    </nav>
  );
}

const PILLARS = [
  {
    icon: BarChart2,
    title: "Дельта-время",
    description: "Где теряешь время на каждом метре трассы — по дистанции, не по ощущениям.",
  },
  {
    icon: BookOpen,
    title: "Академия",
    description: "Урок под конкретную ошибку: объяснение, визуализация, упражнение, проверка.",
  },
  {
    icon: Monitor,
    title: "Десктоп-клиент",
    description: "После сессии телеметрия уходит в APEX автоматически. ACC, iRacing, rFactor 2.",
  },
];

export default function LandingPage() {
  const copy = useCopy();
  const { needsLanguageChoice, setLang } = useLang();

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <NavBar />

      {needsLanguageChoice && (
        <section aria-label="Язык / Language" className="relative z-20 mx-auto max-w-3xl px-4 pt-5 sm:pt-7">
          <div className="relative overflow-hidden rounded-2xl border border-zinc-700/70 bg-gradient-to-br from-zinc-900 to-zinc-950 p-4 sm:p-5">
            <div aria-hidden="true" className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-lime-400/60 to-transparent" />
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-lime-400/15 bg-lime-400/5 text-lime-400">
                  <Languages size={20} aria-hidden="true" />
                </div>
                <div>
                  <p lang="ru" className="text-sm font-medium text-zinc-100">На каком языке продолжим?</p>
                  <p lang="en" className="mt-1 text-xs text-zinc-400">Choose your language to get started</p>
                </div>
              </div>
              <div className="grid shrink-0 grid-cols-2 gap-2 sm:w-64">
                {(["ru", "en"] as const).map((code) => (
                  <button
                    key={code}
                    type="button"
                    lang={code}
                    onClick={() => setLang(code)}
                    className="group flex min-h-12 items-center justify-between gap-3 rounded-xl border border-zinc-700 bg-zinc-800/50 px-4 py-3 text-sm font-medium text-zinc-100 transition-colors hover:border-lime-400/50 hover:bg-lime-400/10 hover:text-lime-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-400"
                  >
                    {code === "ru" ? "Русский" : "English"}
                    <ArrowRight size={14} aria-hidden="true" className="text-zinc-500 transition-colors group-hover:text-lime-400" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Hero — brand first, one composition */}
      <section className="relative min-h-[calc(100dvh-3.5rem)] overflow-hidden">
        <HeroVisual />

        <div className="relative z-10 mx-auto flex min-h-[calc(100dvh-3.5rem)] max-w-6xl flex-col justify-center px-4 pb-16 pt-16 sm:px-6 sm:pb-20 sm:pt-20">
          <div className="max-w-xl animate-hero-rise">
            <p className="font-display text-[clamp(3.5rem,12vw,6.5rem)] font-bold leading-[0.9] tracking-[-0.06em] text-zinc-50">
              {copy("ui.269")}
            </p>
            <p className="mt-4 max-w-md font-display text-xl font-medium tracking-tight text-lime-400 sm:text-2xl">
              {copy("ui.307")}
            </p>
            <p className="mt-4 max-w-md text-base leading-relaxed text-zinc-400 sm:text-lg">
              {copy("ui.309")}
            </p>

            <div className="mt-9 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
              <Link href="/dashboard">
                <Button variant="primary" size="lg" className="w-full sm:w-auto">
                  {copy("ui.310")} <ArrowRight size={16} />
                </Button>
              </Link>
              <DownloadButtonHero />
            </div>

            <p className="mt-5 font-mono text-xs text-zinc-600">
              {copy("ui.311")}
            </p>
          </div>
        </div>
      </section>

      {/* Pillars — three jobs, no rainbow cards */}
      <section id="features" className="border-t border-zinc-800">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <p className="apex-eyebrow">{copy("ui.322")}</p>
          <h2 className="apex-section-title max-w-xl">{copy("ui.323")}</h2>
          <p className="apex-intro">{copy("ui.324")}</p>

          <div className="mt-12 divide-y divide-zinc-800 border-y border-zinc-800">
            {PILLARS.map(({ icon: Icon, title, description }) => (
              <div key={title} className="grid gap-4 py-8 sm:grid-cols-[48px_1fr] sm:gap-8">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-lime-400/20 bg-lime-400/5">
                  <Icon size={20} className="text-lime-400" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="font-display text-lg font-semibold tracking-tight text-zinc-100">{copy(title)}</h3>
                  <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-400 sm:text-base">{copy(description)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="border-t border-zinc-800">
        <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
          <p className="apex-eyebrow text-center">{copy("ui.325")}</p>
          <h2 className="apex-section-title text-center">{copy("ui.326")}</h2>

          <div className="mt-12 space-y-8">
            {[
              { n: "01", t: "ui.327", d: "ui.328" },
              { n: "02", t: "ui.329", d: "ui.330" },
              { n: "03", t: "ui.331", d: "ui.332" },
              { n: "04", t: "ui.333", d: "ui.334" },
              { n: "05", t: "ui.335", d: "ui.336" },
            ].map(({ n, t, d }) => (
              <div key={n} className="flex items-start gap-5">
                <span className="w-10 shrink-0 font-mono text-sm font-bold text-lime-400">{copy(n)}</span>
                <div>
                  <p className="text-sm font-semibold text-zinc-200">{copy(t)}</p>
                  <p className="mt-1 text-sm leading-relaxed text-zinc-500">{copy(d)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div id="download">
        <DownloadSection />
      </div>

      <section className="border-t border-zinc-800 bg-zinc-900/40 py-20">
        <div className="mx-auto max-w-2xl px-4 text-center">
          <h2 className="font-display text-3xl font-bold tracking-tight text-zinc-100 md:text-4xl">
            {copy("ui.337")}
          </h2>
          <p className="mt-4 leading-relaxed text-zinc-400">{copy("ui.338")}</p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/dashboard">
              <Button variant="primary" size="lg">
                {copy("ui.339")} <ArrowRight size={16} />
              </Button>
            </Link>
            <DownloadLink className="text-sm" />
          </div>
          <p className="mt-4 font-mono text-xs text-zinc-600">{copy("ui.340")}</p>
        </div>
      </section>

      <footer className="border-t border-zinc-800 py-8">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-lime-400">
              <span className="text-[10px] font-bold text-zinc-950">{copy("ui.268")}</span>
            </div>
            <span className="font-display text-sm font-semibold text-zinc-400">{copy("ui.269")}</span>
          </div>
          <p className="text-xs text-zinc-700">{copy("ui.342")}</p>
          <div className="flex items-center gap-4 text-xs text-zinc-600">
            <Link href="/dashboard" className="transition-colors hover:text-zinc-400">{copy("ui.343")}</Link>
            <Link href="/academy" className="transition-colors hover:text-zinc-400">{copy("ui.013")}</Link>
            <Link href="/download" className="transition-colors hover:text-zinc-400">{copy("ui.143")}</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
