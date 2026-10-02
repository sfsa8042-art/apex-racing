import { NextRequest, NextResponse } from "next/server";
import { isLang, preferredLanguage, type Lang } from "./locale";
import { translateText } from "./translate";

export function requestLanguage(req: NextRequest): Lang {
  const query = req.nextUrl.searchParams.get("lang");
  if (isLang(query)) return query;
  const cookie = req.cookies.get("apex_lang")?.value;
  if (isLang(cookie)) return cookie;
  return preferredLanguage(req.headers.get("accept-language"));
}

/** Translate response messages, never file contents, tokens or telemetry fields. */
export function localisedJson(req: NextRequest, body: Record<string,unknown>, init?: ResponseInit, lang = requestLanguage(req)) {
  const result = { ...body };
  for (const field of ["error","note","message"] as const) {
    if (typeof result[field] === "string") result[field] = translateText(result[field] as string,lang);
  }
  const headers = new Headers(init?.headers);
  headers.set("Content-Language",lang);
  return NextResponse.json(result, { ...init, headers });
}
