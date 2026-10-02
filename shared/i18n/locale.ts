export type Lang = "en" | "ru";
export const LANGUAGE_KEY = "apex_lang";
export const locales: Record<Lang, string> = { en: "en-GB", ru: "ru-RU" };

export function isLang(value: unknown): value is Lang {
  return value === "en" || value === "ru";
}

/** Read an explicit choice first, then use the browser/request preferences. */
export function preferredLanguage(value?: string | null): Lang {
  const preferences = (value ?? "").split(",").map(part => {
    const [tag, quality] = part.trim().split(";q=");
    return { code: tag.split("-")[0].toLowerCase(), weight: quality === undefined ? 1 : Number(quality) };
  }).filter(item => Number.isFinite(item.weight) && item.weight > 0)
    .sort((a,b) => b.weight - a.weight);
  for (const {code} of preferences) {
    if (isLang(code)) return code;
  }
  return "en";
}
