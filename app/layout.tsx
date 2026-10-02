import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { Manrope, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import { LanguageProvider } from "@/context/LanguageContext";
import { isLang, preferredLanguage } from "@/shared/i18n/locale";
import "./globals.css";

const display = Manrope({
  subsets: ["latin", "latin-ext", "cyrillic"],
  variable: "--font-display",
  display: "swap",
});

const sans = IBM_Plex_Sans({
  subsets: ["latin", "latin-ext", "cyrillic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin", "latin-ext", "cyrillic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-mono",
  display: "swap",
});

function getLanguage() {
  const saved = cookies().get("apex_lang")?.value;
  return isLang(saved) ? saved : preferredLanguage(headers().get("accept-language"));
}

export function generateMetadata(): Metadata {
  const lang = getLanguage();
  return {
    title: lang === "ru" ? "APEX — платформа для симрейсинга" : "APEX — Sim Racing Platform",
    description: lang === "ru"
      ? "Улучшай темп с помощью последовательного обучения и анализа телеметрии."
      : "Build your pace with structured learning and telemetry-based insights.",
    keywords: ["sim racing", "telemetry", "iRacing", "ACC"],
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const lang = getLanguage();
  return (
    <html lang={lang} className={`dark ${display.variable} ${sans.variable} ${mono.variable}`}>
      <body className="min-h-screen bg-zinc-950 font-sans antialiased">
        <LanguageProvider initialLang={lang}>{children}</LanguageProvider>
      </body>
    </html>
  );
}
