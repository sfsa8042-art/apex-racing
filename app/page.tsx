import Link from "next/link";
import {
  Activity, BookOpen, MapPin, TrendingUp, ChevronRight, Check,
  ArrowRight, Zap, BarChart2, Monitor,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { DownloadButtonHero, DownloadButtonNavbar, DownloadSection, DownloadLink } from "@/components/ui/DownloadButton";

const FEATURES = [
  {
    icon: BarChart2, title: "Дельта-время", accent: "text-lime-400", bg: "bg-lime-400/10",
    description: "Видишь где теряешь время на каждом метре трассы. Красный — теряешь, зелёный — выигрываешь. По дистанции, не по времени.",
  },
  {
    icon: MapPin, title: "Карта трассы", accent: "text-blue-400", bg: "bg-blue-400/10",
    description: "Тепловая карта прямо на схеме трассы — плавный градиент показывает где именно уходят секунды.",
  },
  {
    icon: BookOpen, title: "Академия", accent: "text-yellow-400", bg: "bg-yellow-400/10",
    description: "11 модулей, 29+ уроков. Каждый урок — анализ ошибки, визуализация, практика, проверка. Всё связано с твоей телеметрией.",
  },
  {
    icon: Activity, title: "AI Инженер", accent: "text-purple-400", bg: "bg-purple-400/10",
    description: "Задаёшь вопросы по своему кругу — получаешь ответы основанные на реальных данных. Не общие советы, а конкретика по твоим поворотам.",
  },
  {
    icon: TrendingUp, title: "Прогресс", accent: "text-orange-400", bg: "bg-orange-400/10",
    description: "XP, уровни, серия дней. Система отслеживает паттерны — если ты всегда поздно тормозишь в одном повороте, она это найдёт.",
  },
  {
    icon: Monitor, title: "Десктоп-клиент", accent: "text-lime-400", bg: "bg-lime-400/10",
    description: "Установи раз — телеметрия загружается автоматически после каждой сессии. Поддерживает iRacing, ACC, rFactor 2.",
  },
];

function NavBar() {
  return (
    <nav className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-sm sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-6">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <div className="w-7 h-7 rounded-md bg-lime-400 flex items-center justify-center">
            <span className="text-zinc-950 text-xs font-bold">AP</span>
          </div>
          <span className="text-sm font-semibold text-zinc-100 tracking-tight">APEX</span>
        </Link>

        <nav className="hidden md:flex items-center gap-5 text-sm text-zinc-400 ml-4">
          <a href="#features" className="hover:text-zinc-200 transition-colors">Возможности</a>
          <a href="#how-it-works" className="hover:text-zinc-200 transition-colors">Как работает</a>
          <a href="#download" className="hover:text-zinc-200 transition-colors">Скачать</a>
        </nav>

        <div className="flex-1" />
        <div className="flex items-center gap-2">
          <DownloadButtonNavbar />
          <Link href="/dashboard">
            <Button variant="primary" size="sm">Открыть →</Button>
          </Link>
        </div>
      </div>
    </nav>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <NavBar />

      {/* ── Hero ── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#18181b_1px,transparent_1px),linear-gradient(to_bottom,#18181b_1px,transparent_1px)] bg-[size:60px_60px] opacity-30" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-zinc-950" />
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full bg-lime-400/4 blur-3xl pointer-events-none" />

        <div className="relative max-w-5xl mx-auto px-4 pt-24 pb-16 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-lime-400/30 bg-lime-400/8 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-lime-400 animate-pulse" />
            <span className="text-xs font-mono text-lime-400">Бета · Бесплатный доступ</span>
          </div>

          <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-zinc-100 leading-[1.05] mb-6">
            Перестань угадывать.
            <br />
            <span className="text-lime-400">Начни улучшаться.</span>
          </h1>

          <p className="text-lg text-zinc-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Загружаешь телеметрию — APEX находит где ты теряешь время, объясняет почему
            и даёт конкретный план. Работает с iRacing, ACC и rFactor 2.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-4">
            <Link href="/dashboard">
              <Button variant="primary" size="lg">
                Попробовать бесплатно <ArrowRight size={16} />
              </Button>
            </Link>
            <DownloadButtonHero />
          </div>

          <p className="text-xs text-zinc-600 font-mono">
            Без регистрации · Без оплаты · Загрузи первый круг за 30 секунд
          </p>
        </div>

        {/* Telemetry preview mock */}
        <div className="max-w-4xl mx-auto px-4 pb-16 relative">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 overflow-hidden shadow-2xl shadow-black/60">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-800 bg-zinc-950">
              <div className="w-3 h-3 rounded-full bg-red-500/70" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
              <div className="w-3 h-3 rounded-full bg-lime-500/70" />
              <span className="text-xs font-mono text-zinc-600 ml-2">APEX — Telemetry · Monza · Porsche 992 GT3 R</span>
            </div>
            <div className="p-4">
              <div className="flex items-center gap-5 mb-4 text-xs font-mono">
                <span className="text-zinc-500">Твой круг: <span className="text-lime-400">1:44.832</span></span>
                <span className="text-zinc-500">Референс: <span className="text-zinc-300">1:43.591</span></span>
                <span className="text-zinc-500">Разрыв: <span className="text-red-400">−1.241s</span></span>
              </div>
              <div className="rounded-xl bg-zinc-950 border border-zinc-800 p-3 mb-4 overflow-hidden">
                <svg viewBox="0 0 800 100" className="w-full h-24">
                  <defs>
                    <linearGradient id="dg" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%"   stopColor="#22c55e" stopOpacity="0.3" />
                      <stop offset="45%"  stopColor="#22c55e" stopOpacity="0.05" />
                      <stop offset="55%"  stopColor="#ef4444" stopOpacity="0.05" />
                      <stop offset="100%" stopColor="#ef4444" stopOpacity="0.3" />
                    </linearGradient>
                  </defs>
                  {[200, 400, 600].map(x => (
                    <line key={x} x1={x} y1="0" x2={x} y2="100" stroke="#27272a" strokeWidth="1" />
                  ))}
                  <line x1="0" y1="50" x2="800" y2="50" stroke="#3f3f46" strokeWidth="1" strokeDasharray="4,4" />
                  <path d="M 0,50 Q 100,42 200,36 Q 300,30 360,50 Q 440,72 520,78 Q 640,84 800,72"
                    fill="url(#dg)" />
                  <path d="M 0,50 Q 100,42 200,36 Q 300,30 360,50 Q 440,72 520,78 Q 640,84 800,72"
                    fill="none" stroke="#a3e635" strokeWidth="2.5" strokeLinecap="round" />
                  <text x="60"  y="30" fontSize="10" fill="#22c55e" fontFamily="monospace">↑ выигрываю</text>
                  <text x="480" y="94" fontSize="10" fill="#ef4444" fontFamily="monospace">↓ теряю</text>
                </svg>
              </div>
              <div className="space-y-2">
                {[
                  { sev: "critical", text: "Раннее торможение в Variante del Rettifilo. Потеря: −0.312s" },
                  { sev: "warning",  text: "Поздний газ на выходе из Lesmo 2. Потеря: −0.208s" },
                  { sev: "good",     text: "Хорошо: стабильное торможение в Curva Grande. Разброс < 2м" },
                ].map(item => (
                  <div key={item.text} className={`flex items-start gap-2.5 rounded-lg px-3 py-2 text-xs font-mono ${
                    item.sev === "critical" ? "bg-red-400/8 border border-red-400/20 text-red-300"
                    : item.sev === "warning" ? "bg-yellow-400/8 border border-yellow-400/20 text-yellow-300"
                    : "bg-lime-400/8 border border-lime-400/20 text-lime-300"
                  }`}>
                    <div className={`w-1.5 h-1.5 rounded-full shrink-0 mt-0.5 ${
                      item.sev === "critical" ? "bg-red-400" : item.sev === "warning" ? "bg-yellow-400" : "bg-lime-400"
                    }`} />
                    {item.text}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="max-w-6xl mx-auto px-4 py-20 border-t border-zinc-800">
        <div className="text-center mb-12">
          <p className="text-xs font-mono uppercase tracking-widest text-zinc-500 mb-3">Платформа</p>
          <h2 className="text-3xl md:text-4xl font-bold text-zinc-100 mb-4">Всё что нужно, чтобы ехать быстрее</h2>
          <p className="text-zinc-400 max-w-xl mx-auto">Не видео-курс. Не форум. Система где твои данные управляют каждым улучшением.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          {FEATURES.map(f => (
            <div key={f.title} className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 hover:border-zinc-700 transition-colors">
              <div className={`w-10 h-10 rounded-xl ${f.bg} flex items-center justify-center mb-4`}>
                <f.icon size={18} className={f.accent} />
              </div>
              <h3 className="text-base font-semibold text-zinc-100 mb-2">{f.title}</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how-it-works" className="max-w-3xl mx-auto px-4 py-20 border-t border-zinc-800">
        <div className="text-center mb-10">
          <p className="text-xs font-mono uppercase tracking-widest text-zinc-500 mb-3">Процесс</p>
          <h2 className="text-3xl font-bold text-zinc-100">Загрузил → получил анализ → стал быстрее</h2>
        </div>
        <div className="space-y-5">
          {[
            { n: "01", t: "Загрузи файл телеметрии",    d: "CSV или JSON с любого симулятора. Просто перетащи файл — больше ничего не нужно." },
            { n: "02", t: "Получи полный разбор",        d: "Дельта по каждому повороту, тепловая карта, анализ торможений и точки выхода газа." },
            { n: "03", t: "Спроси AI инженера",          d: "«Почему я медленный в повороте 5?» — конкретный ответ на основе твоих данных, не общие советы." },
            { n: "04", t: "Пройди урок в Академии",      d: "Система находит урок точно под твою ошибку. Визуальное объяснение + практическое задание." },
            { n: "05", t: "Возвращайся с новым кругом",  d: "Каждая сессия строит твой профиль. Система видит паттерны и отслеживает улучшения." },
          ].map(({ n, t, d }) => (
            <div key={n} className="flex items-start gap-5">
              <div className="w-10 h-10 rounded-xl bg-lime-400/10 border border-lime-400/20 flex items-center justify-center shrink-0">
                <span className="text-xs font-mono font-bold text-lime-400">{n}</span>
              </div>
              <div className="pt-1">
                <p className="text-sm font-semibold text-zinc-200 mb-1">{t}</p>
                <p className="text-sm text-zinc-500 leading-relaxed">{d}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Download section ── */}
      <div id="download">
        <DownloadSection />
      </div>

      {/* ── Final CTA ── */}
      <section className="border-t border-zinc-800 bg-zinc-900/50 py-20">
        <div className="max-w-2xl mx-auto text-center px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-zinc-100 mb-4">
            Готов найти потерянные секунды?
          </h2>
          <p className="text-zinc-400 mb-8 leading-relaxed">
            Загрузи первый круг за 30 секунд. Бесплатно, без регистрации.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/dashboard">
              <Button variant="primary" size="lg">
                Начать бесплатно <ArrowRight size={16} />
              </Button>
            </Link>
            <DownloadLink className="text-sm" />
          </div>
          <p className="text-xs text-zinc-600 mt-4 font-mono">
            iRacing · Assetto Corsa Competizione · rFactor 2
          </p>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-zinc-800 py-8">
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-lime-400 flex items-center justify-center">
              <span className="text-zinc-950 text-[10px] font-bold">AP</span>
            </div>
            <span className="text-sm font-semibold text-zinc-400">APEX</span>
            <span className="text-xs text-zinc-700 ml-2 font-mono">beta</span>
          </div>
          <p className="text-xs text-zinc-700">© 2025 APEX Racing Technologies</p>
          <div className="flex items-center gap-4 text-xs text-zinc-600">
            <Link href="/dashboard" className="hover:text-zinc-400 transition-colors">Дашборд</Link>
            <Link href="/academy"   className="hover:text-zinc-400 transition-colors">Академия</Link>
            <Link href="/download"  className="hover:text-zinc-400 transition-colors">Скачать</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
