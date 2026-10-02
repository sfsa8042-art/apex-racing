"use client";

import { useCopy } from "../shared/i18n/react";
import { LanguageSwitch } from "@/context/LanguageContext";
import Link from "next/link";
import { ArrowRight, BarChart2, BookOpen, Monitor } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { DownloadSection, DownloadLink } from "@/components/ui/DownloadButton";
import { HeroVisual } from "@/components/landing/HeroVisual";

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
          <a href="#download" className="transition-colors hover:text-white">{copy("ui.143")}</a>
        </nav>

        <div className="flex-1" />
        <div className="flex items-center gap-2 sm:gap-3">
          <LanguageSwitch compact />
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

        <div className="relative z-10 mx-auto flex min-h-[100dvh] max-w-6xl flex-col justify-end px-4 pb-16 pt-28 sm:justify-center sm:px-6 sm:pb-24 sm:pt-20">
          <div className="max-w-xl animate-hero-rise">
            <p className="font-display text-[clamp(4.25rem,14vw,7.5rem)] font-bold leading-[0.86] tracking-[-0.055em] text-white">
              {copy("ui.269")}
            </p>

            <p className="mt-5 max-w-md text-lg leading-snug text-zinc-200 sm:text-xl">
              {copy("ui.308")}
            </p>

            <div className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
              <Link href="/dashboard">
                <Button variant="primary" size="lg" className="w-full sm:w-auto">
                  {copy("ui.310")} <ArrowRight size={16} />
                </Button>
              </Link>
              <Link href="/download">
                <Button variant="outline" size="lg" className="w-full border-white/20 bg-black/25 text-zinc-100 backdrop-blur-sm hover:border-white/35 hover:bg-white/10 hover:text-white sm:w-auto">
                  {copy("ui.143")}
                </Button>
              </Link>
            </div>

            <p className="mt-5 font-mono text-[11px] tracking-wide text-zinc-400/90">
              {copy("ui.311")}
            </p>
          </div>
        </div>
      </section>

      <section id="features" className="border-t border-zinc-800">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <p className="apex-eyebrow">{copy("ui.322")}</p>
          <h2 className="apex-section-title max-w-xl">{copy("ui.323")}</h2>
          <p className="apex-intro">{copy("ui.324")}</p>

          <div className="mt-12 divide-y divide-zinc-800 border-y border-zinc-800">
            {PILLARS.map(({ icon: Icon, title, description }) => (
              <div key={title} className="grid gap-4 py-8 sm:grid-cols-[40px_1fr] sm:gap-6">
                <Icon size={22} className="mt-0.5 text-lime-400" aria-hidden="true" />
                <div>
                  <h3 className="font-display text-lg font-semibold tracking-tight text-zinc-100">{copy(title)}</h3>
                  <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-400 sm:text-base">{copy(description)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

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
