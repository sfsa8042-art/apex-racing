"use client";

import { useCopy } from "../shared/i18n/react";
import { LanguageSwitch } from "@/context/LanguageContext";
import Link from "next/link";
import { ArrowRight, BarChart2, BookOpen, Monitor } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { DownloadSection } from "@/components/ui/DownloadButton";
import { HeroVisual } from "@/components/landing/HeroVisual";
import { AnalysisPreview } from "@/components/landing/AnalysisPreview";
import { Reveal } from "@/components/landing/Reveal";

function NavBar() {
  const copy = useCopy();
  return (
    <nav className="absolute inset-x-0 top-0 z-40">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-lime-400">
            <span className="text-xs font-bold tracking-tight text-zinc-950">{copy("ui.268")}</span>
          </div>
          <span className="font-display text-sm font-semibold tracking-wide text-zinc-50">
            {copy("ui.269")}
          </span>
        </Link>

        <nav className="ml-6 hidden items-center gap-6 text-sm text-zinc-300/90 md:flex">
          <a href="#features" className="transition-colors hover:text-white">{copy("ui.303")}</a>
          <a href="#how-it-works" className="transition-colors hover:text-white">{copy("ui.304")}</a>
          <a href="#download" className="transition-colors hover:text-white">{copy("Desktop app")}</a>
        </nav>

        <div className="flex-1" />
        <div className="flex items-center gap-2 sm:gap-3">
          <LanguageSwitch compact />
          <Link href="/telemetry">
            <Button variant="primary" size="sm">{copy("Analyse a lap")}</Button>
          </Link>
        </div>
      </div>
    </nav>
  );
}

const PILLARS = [
  {
    icon: BarChart2,
    title: "ui.292",
    description: "ui.293",
  },
  {
    icon: BookOpen,
    title: "ui.013",
    description: "ui.296",
  },
  {
    icon: Monitor,
    title: "ui.301",
    description: "ui.302",
  },
];

export default function LandingPage() {
  const copy = useCopy();

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <NavBar />

      {/* Hero — one composition: photo + brand + one line + CTAs */}
      <section className="relative min-h-[100dvh] overflow-hidden">
        <HeroVisual />

        <div className="relative z-10 mx-auto flex min-h-[100dvh] max-w-6xl flex-col justify-center px-4 pb-12 pt-28 sm:justify-center sm:px-6 sm:pb-24 sm:pt-20">
          <div className="max-w-lg">
            <p
              className="animate-hero-rise font-display text-[clamp(3.5rem,12vw,6.5rem)] font-bold leading-[0.86] tracking-[-0.055em] text-white"
              style={{ animationDelay: "40ms" }}
            >
              {copy("ui.269")}
            </p>

            <p className="mt-6 text-sm font-semibold tracking-wide text-lime-300 sm:text-base">{copy("Telemetry analysis for sim racing")}</p>
            <h1
              className="animate-hero-rise mt-5 max-w-lg text-3xl font-semibold tracking-tight leading-tight text-zinc-100 sm:text-4xl"
              style={{ animationDelay: "140ms" }}
            >
              {copy("ui.308")}
            </h1>

            <div
              className="animate-hero-rise mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center"
              style={{ animationDelay: "240ms" }}
            >
              <Link href="/telemetry">
                <Button variant="primary" size="lg" className="w-full sm:w-auto">
                  {copy("Analyse my lap")} <ArrowRight size={16} />
                </Button>
              </Link>
              <a href="#analysis-preview">
                <Button variant="outline" size="lg" className="w-full border-white/20 bg-black/30 text-zinc-100 backdrop-blur-sm hover:border-white/35 hover:bg-white/10 hover:text-white sm:w-auto">
                  {copy("See an example")}
                </Button>
              </a>
            </div>

            <p
              className="animate-hero-rise mt-5 font-mono text-xs tracking-wide text-zinc-300"
              style={{ animationDelay: "320ms" }}
            >
              {copy("Free, no registration. Have a telemetry file ready to get started.")}
            </p>
          </div>
        </div>
      </section>

      <section id="features" className="border-t border-zinc-800">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <p className="apex-eyebrow">{copy("ui.322")}</p>
          <h2 className="apex-section-title max-w-xl">{copy("ui.323")}</h2>
          <p className="apex-intro">{copy("ui.324")}</p>

          <AnalysisPreview />
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {PILLARS.map(({ icon: Icon, title, description }, i) => (
              <Reveal key={title} delay={i * 80} className="grid content-start gap-4 border-t border-zinc-700 py-6">
                <Icon size={22} className="mt-0.5 text-lime-400" aria-hidden="true" />
                <div>
                  <h3 className="font-display text-lg font-semibold tracking-tight text-zinc-100">{copy(title)}</h3>
                  <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-400 sm:text-base">{copy(description)}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="border-t border-zinc-800">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <p className="apex-eyebrow text-center">{copy("ui.325")}</p>
          <h2 className="apex-section-title text-center">{copy("ui.326")}</h2>

          <div className="mt-10 grid gap-8 md:grid-cols-3">
            {[
              { n: "01", t: "ui.327", d: "ui.328" },
              { n: "02", t: "ui.329", d: "ui.330" },
              { n: "03", t: "ui.333", d: "ui.334" },
            ].map(({ n, t, d }, i) => (
              <Reveal key={n} delay={i * 70} className="flex flex-col items-start gap-4">
                <span className="w-10 shrink-0 font-mono text-sm font-bold text-lime-400">{copy(n)}</span>
                <div>
                  <p className="text-sm font-semibold text-zinc-200">{copy(t)}</p>
                  <p className="mt-1 text-sm leading-relaxed text-zinc-400">{copy(d)}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <div id="download">
        <DownloadSection />
      </div>

      <section className="border-t border-zinc-800 py-16">
        <div className="mx-auto max-w-xl px-4 text-center">
          <h2 className="font-display text-3xl font-bold tracking-tight text-zinc-100 md:text-4xl">
            {copy("ui.337")}
          </h2>
          <p className="mt-3 text-zinc-400">{copy("Bring your telemetry file. Get a breakdown and choose what to practise next.")}</p>
          <Link href="/telemetry" className="mt-8 inline-flex">
            <Button variant="primary" size="lg">
              {copy("Analyse my lap")} <ArrowRight size={16} />
            </Button>
          </Link>
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
          <p className="text-xs text-zinc-400">{`© ${new Date().getFullYear()} APEX Racing`}</p>
          <div className="flex items-center gap-4 text-sm text-zinc-400">
            <Link href="/telemetry" className="transition-colors hover:text-white">{copy("Explore telemetry")}</Link>
            <Link href="/academy" className="transition-colors hover:text-zinc-400">{copy("ui.013")}</Link>
            <Link href="/download" className="transition-colors hover:text-zinc-400">{copy("ui.143")}</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
