"use client";
import { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from "react";
import en from "../../messages/en.json";
import ru from "../../messages/ru.json";
import { isLang, LANGUAGE_KEY, locales, preferredLanguage, type Lang } from "./locale";
import { localiseText, translateText } from "./translate";

export type Messages = typeof en;
const dictionaries: Record<Lang, Messages> = { en, ru };
const CHOICE_KEY = "apex_language_chosen";
interface LanguageContextValue { lang: Lang; t: Messages; setLang: (lang: Lang) => void; needsLanguageChoice: boolean }
const LanguageContext = createContext<LanguageContextValue>({lang:"en", t:en, setLang:()=>{}, needsLanguageChoice:false});

export function LanguageProvider({children, initialLang = "en"}: {children: ReactNode; initialLang?: Lang}) {
  const [lang,setLanguage] = useState<Lang>(initialLang);
  const [ready,setReady] = useState(false);
  const [chosen,setChosen] = useState(false);
  useEffect(() => {
    // Existing installations stored the choice only in localStorage.
    try {
      const saved = localStorage.getItem(LANGUAGE_KEY);
      setChosen(localStorage.getItem(CHOICE_KEY) === "true");
      if (isLang(saved)) setLanguage(saved);
      else if (!document.cookie.includes(`${LANGUAGE_KEY}=`)) setLanguage(preferredLanguage(navigator.language));
    } catch { /* Browser storage can be disabled. Switching still works. */ }
    setReady(true);
  },[]);
  useEffect(() => {
    if (!ready) return;
    document.documentElement.lang = lang;
    document.title = lang === "ru" ? "APEX — платформа для симрейсинга" : "APEX — Sim Racing Platform";
    try {
      localStorage.setItem(LANGUAGE_KEY,lang);
      document.cookie = `${LANGUAGE_KEY}=${lang}; Path=/; Max-Age=31536000; SameSite=Lax`;
    } catch { /* In-memory language selection remains available. */ }
  },[lang,ready]);
  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if(event.key===LANGUAGE_KEY && isLang(event.newValue)) setLanguage(event.newValue);
      if(event.key===CHOICE_KEY) setChosen(event.newValue === "true");
    };
    window.addEventListener("storage",sync);
    return ()=>window.removeEventListener("storage",sync);
  },[]);
  const setLang = useCallback((value:Lang)=>{
    if (!isLang(value)) return;
    setLanguage(value);
    setChosen(true);
    try { localStorage.setItem(CHOICE_KEY,"true"); } catch { /* Dismiss for this visit even without storage. */ }
  },[]);
  const value = useMemo(()=>({lang,t:dictionaries[lang],setLang,needsLanguageChoice:ready && !chosen}),[lang,setLang,ready,chosen]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}
export function useLang(){return useContext(LanguageContext)}

export function useCopy() {
  const {lang}=useLang();
  return useCallback(<T,>(value:T):T=>localiseText(value,lang),[lang]);
}

export function LanguageSwitch({ prominent = false, compact = false }: { prominent?: boolean; compact?: boolean }) {
  const {lang,setLang}=useLang();
  return <div role="group" aria-label={lang==="ru"?"Язык интерфейса":"Interface language"}
    className={`inline-flex shrink-0 gap-0.5 border ${
      prominent
        ? "w-full gap-1 rounded-xl border-lime-400/40 bg-zinc-950 p-1 shadow-lg shadow-lime-400/5"
        : compact
          ? "rounded-md border-white/15 bg-black/30 p-0.5 backdrop-blur-sm"
          : "gap-1 rounded-xl border-zinc-700 bg-zinc-900 p-1"
    }`}>
    {(["ru","en"] as const).map(code=><button key={code} type="button" lang={code}
      aria-pressed={lang===code} onClick={()=>setLang(code)}
      title={code==="ru"?"Русский":"English"}
      className={`transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-300 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 ${
        prominent
          ? "min-h-11 flex-1 rounded-lg px-6 py-2.5 text-sm font-semibold"
          : compact
            ? "rounded px-2 py-1 font-mono text-[11px] font-medium tracking-wide"
            : "rounded-lg px-2 py-1 text-xs"
      } ${lang===code?"bg-lime-400 text-zinc-950": compact ? "text-zinc-300 hover:bg-white/10 hover:text-white" : "text-zinc-200 hover:bg-zinc-800"}`}>
      {compact ? (code==="ru"?"RU":"EN") : (code==="ru"?"Русский":"English")}
    </button>)}
  </div>;
}
export { locales, translateText };
export type { Lang };
