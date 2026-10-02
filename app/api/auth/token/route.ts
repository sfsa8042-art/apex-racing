import { NextRequest, NextResponse } from "next/server";
import { localisedJson } from "@/shared/i18n/server";
import { createToken } from "@/lib/auth/tokens";

/**
 * POST /api/auth/token
 * Body: { userId: string, label?: string }
 *
 * Returns a new API token for the desktop app.
 * In production this would require a valid session cookie.
 *
 * For the MVP: any authenticated user can generate a token for themselves.
 */
export async function POST(req: NextRequest) {
  try {
    const { userId, label } = await req.json();

    if (!userId || typeof userId !== "string") {
      return localisedJson(req,
        { error: "userId обязателен" },
        { status: 400 }
      );
    }

    const token = await createToken(userId, label ?? "desktop");

    return localisedJson(req, {
      ok:    true,
      token,
      note:  "Сохраните токен — он отображается только один раз",
    });
  } catch (err) {
    return localisedJson(req,
      { error: "Не удалось создать токен" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/auth/token
 * Simple endpoint to verify a token works (used by desktop connection test).
 */
export async function GET(req: NextRequest) {
  const { validateToken, extractToken } = await import("@/lib/auth/tokens");
  const token = extractToken(req.headers);

  if (!token) {
    return localisedJson(req, { ok: false, error: "Токен не предоставлен" }, { status: 401 });
  }

  const userId = await validateToken(token);
  if (!userId) {
    return localisedJson(req, { ok: false, error: "Недействительный токен" }, { status: 401 });
  }

  return localisedJson(req, { ok: true, userId });
}
