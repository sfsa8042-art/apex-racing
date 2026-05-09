"use client";
import {
  createContext, useContext, useState, useCallback,
  useEffect, type ReactNode,
} from "react";
import en from "@/messages/en.json";
import ru from "@/messages/ru.json";

export type Lang = "en" | "ru";
export type Messages = typeof en;

const LANG_KEY = "apex_lang";

interface LangCtx {
  lang:    Lang;
  t:       Messages;
  setLang: (l: Lang) => void;
}

const LanguageContext = createContext<LangCtx>({ lang:"en", t:en, setLang:()=>{} });

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    try {
      const s = localStorage.getItem(LANG_KEY) as Lang|null;
      if (s === "en" || s === "ru") setLangState(s);
    } catch {}
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try { localStorage.setItem(LANG_KEY, l); } catch {}
  }, []);

  const t = lang === "ru" ? (ru as unknown as Messages) : en;

  return (
    <LanguageContext.Provider value={{ lang, t, setLang }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLang(): LangCtx { return useContext(LanguageContext); }
