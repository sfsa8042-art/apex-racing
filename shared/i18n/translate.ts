import sources from "../../messages/catalog/sources.json";
import en from "../../messages/catalog/en.json";
import ru from "../../messages/catalog/ru.json";
import baseEn from "../../messages/en.json";
import baseRu from "../../messages/ru.json";
import type { Lang } from "./locale";

type Entry = { source: string; en: string; ru: string };
type Pattern = Entry & { regex: RegExp; slots: string[]; specificity: number };
const normalise = (s: string) => s.replace(/&nbsp;/g," ").replace(/\s+/g, " ").trim();
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const exact: Record<Lang, Map<string, string>> = { en: new Map(), ru: new Map() };
const patterns: Record<Lang, Pattern[]> = { en: [], ru: [] };
const entries: Entry[] = Object.keys(sources).map(key => {
  const id = key as keyof typeof sources;
  return { source: sources[id], en: en[id], ru: ru[id] };
});

function addBase(a: unknown, b: unknown) {
  if (typeof a === "string" && typeof b === "string") entries.push({ source: a, en: a, ru: b });
  else if (a && b && typeof a === "object" && typeof b === "object") {
    for (const key of Object.keys(a)) addBase((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key]);
  }
}
addBase(baseEn, baseRu);

for (const entry of entries) {
  for (const lang of ["en", "ru"] as const) {
    // Prefer direct translations over reverse aliases where several labels coincide.
    for (const source of [entry.source, entry.en, entry.ru]) {
      const key = normalise(source);
      if (!/\{\d+\}/.test(key)) {
        if (!exact[lang].has(key)) exact[lang].set(key, entry[lang]);
        continue;
      }
      const slots: string[] = [];
      let pos = 0, body = "";
      const shortUnit = /^\{\d+\}\s*(?:s|ms|m|h|d|km|km\/h|hp|kg|с|мс|м|ч|д|км|км\/ч|кг|%|×)$/.test(key);
      for (const match of Array.from(key.matchAll(/\{(\d+)\}/g))) {
        const after = key.slice(match.index! + match[0].length);
        const before = key.slice(0, match.index);
        const numeric = shortUnit || /^(?:\s*(?:км\/ч|km\/h|мс|ms|[smhсдмч%×]|секунд|метр|раз|times)(?![A-Za-zА-Яа-я])|%)/.test(after)
          || /^(?:Поворот|Turn) $/.test(before)
          || /^\s*(?:повторных|серьёзных|замечаний|коррекций|brake reapplications|technique observations)/i.test(after);
        const capture = numeric ? "([-+−]?\\d[\\d.,: ]*)" : key.startsWith("{0}") ? "([^,;!?]*?)" : "(.*?)";
        const prefix = escape(key.slice(pos, match.index));
        body += !after && prefix.endsWith(" ") ? prefix.slice(0,-1) + `(?: ${capture})?` : prefix + capture;
        slots.push(match[1]); pos = match.index! + match[0].length;
      }
      body += escape(key.slice(pos));
      patterns[lang].push({ ...entry, regex: new RegExp(`^${body}$`, "u"), slots,
        specificity: key.replace(/\{\d+\}/g, "").length });
    }
  }
}
for (const lang of ["en", "ru"] as const) patterns[lang].sort((a,b) => b.specificity - a.specificity);

/** Pure presentation adapter. Never changes telemetry, saved IDs or API payloads.
 * Source aliases also cover historical diagnostics saved before localisation.
 * Locale is explicit: concurrent requests never share mutable language state.
 */
export function translateText(value: string, lang: Lang, depth = 0): string {
  if (!value || depth > 6) return value;
  const key = normalise(value);
  const catalog = lang === "ru" ? ru : en;
  if (Object.prototype.hasOwnProperty.call(catalog,key)) return catalog[key as keyof typeof catalog];
  const direct = exact[lang].get(key);
  if (direct !== undefined) return (value.match(/^ +/)?.[0] ?? "") + direct + (value.match(/ +$/)?.[0] ?? "");
  if (value.includes("\n")) return value.split("\n").map(line => translateText(line,lang,depth+1)).join("\n");
  for (const pattern of patterns[lang]) {
    const match = pattern.regex.exec(key);
    if (!match) continue;
    const params: Record<string,string> = {};
    pattern.slots.forEach((slot,i) => { params[slot] = translateText(match[i+1] ?? "", lang, depth+1); });
    return (value.match(/^ +/)?.[0] ?? "")
      + pattern[lang].replace(/\{(\d+)\}/g, (_, slot: string) => params[slot] ?? "")
      + (value.match(/ +$/)?.[0] ?? "");
  }
  // Several legacy diagnostics are assembled from complete sentences.
  const parts = value.split(/(?<=[.!?])\s+(?=[A-ZА-ЯЁ0-9])/);
  if (parts.length > 1) return parts.map(part => translateText(part,lang,depth+1)).join(" ");
  const wrapped = value.match(/^(\s*\()(.*)(\)\s*)$/);
  if (wrapped) return wrapped[1] + translateText(wrapped[2],lang,depth+1) + wrapped[3];
  const colon = value.indexOf(": ");
  if (colon >= 0) return translateText(value.slice(0,colon),lang,depth+1) + ": " + translateText(value.slice(colon+2),lang,depth+1);
  const list = value.split(/,\s+(?=[A-Za-zА-Яа-яЁё])/);
  if (list.length > 1) return list.map(part=>translateText(part,lang,depth+1)).join(", ");
  return value;
}

/** Translate text nodes only; React elements, numbers and user data stay intact. */
export function localiseText<T>(value: T, lang: Lang): T {
  if (typeof value === "string") return translateText(value,lang) as T;
  if (Array.isArray(value)) return value.map(item => localiseText(item,lang)) as T;
  return value;
}
