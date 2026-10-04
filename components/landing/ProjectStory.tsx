"use client";

import Link from "next/link";
import { ArrowUpRight, BookOpen, Code2 } from "lucide-react";
import { useCopy } from "@/context/LanguageContext";

export function ProjectStory() {
  const copy = useCopy();
  return <>
    <section className="border-t border-zinc-800 py-16">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 sm:px-6 md:grid-cols-[.8fr_1.2fr] md:items-center">
        <div><p className="apex-eyebrow">{copy("landing.lesson")}</p><h2 className="apex-section-title">{copy("landing.lessonPractice")}</h2><p className="apex-intro">{copy("landing.lessonBody")}</p></div>
        <Link href="/academy" className="group rounded-2xl border border-lime-400/20 bg-gradient-to-br from-lime-400/5 to-zinc-900 p-7 transition-colors hover:border-lime-400/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-lime-400">
          <BookOpen size={24} className="text-lime-400" aria-hidden="true" />
          <p className="mt-6 text-xs text-zinc-400">{copy("landing.lessonMeta")}</p>
          <h3 className="mt-3 text-2xl font-semibold tracking-tight">{copy("landing.lessonTitle")}</h3>
          <div className="my-6 h-px bg-gradient-to-r from-lime-400/40 to-transparent" />
          <span className="flex items-center justify-between text-sm font-semibold text-lime-300">{copy("landing.lessonLink")}<ArrowUpRight size={18} aria-hidden="true" /></span>
        </Link>
      </div>
    </section>
    <section id="behind-the-project" className="border-t border-zinc-800 bg-zinc-900/30 py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid gap-8 md:grid-cols-[1.1fr_.9fr]">
          <div><p className="apex-eyebrow">{copy("landing.behind")}</p><h2 className="apex-section-title max-w-xl">{copy("landing.engineering")}</h2><p className="apex-intro">{copy("landing.problem")}</p></div>
          <div className="border-l-2 border-lime-400/50 pl-6"><p className="text-xl font-semibold">Artemiy Fomkin</p><p className="mt-2 text-sm leading-relaxed text-zinc-300">{copy("landing.author")}</p><p className="mt-4 text-sm leading-relaxed text-zinc-400">{copy("landing.research")}</p></div>
        </div>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {[["landing.distance","landing.distanceBody"],["landing.rules","landing.rulesBody"],["landing.evidence","landing.evidenceBody"]].map(([title,body],i)=><div key={title} className="border-t border-zinc-700 pt-5"><span className="font-mono text-xs text-lime-400">0{i+1}</span><h3 className="mt-3 text-base font-semibold">{copy(title)}</h3><p className="mt-2 text-sm leading-relaxed text-zinc-400">{copy(body)}</p></div>)}
        </div>
        <a href="https://github.com/sfsa8042-art/apex-racing" className="mt-8 inline-flex items-center gap-3 rounded-lg border border-zinc-600 px-5 py-3 text-sm font-semibold transition-colors hover:border-lime-400 hover:text-lime-300"><Code2 size={18} aria-hidden="true" />{copy("landing.source")}<ArrowUpRight size={16} aria-hidden="true" /></a>
      </div>
    </section>
  </>;
}
