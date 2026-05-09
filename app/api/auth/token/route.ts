import { NextRequest, NextResponse } from "next/server";
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
      return NextResponse.json(
        { error: "userId обязателен" },
        { status: 400 }
      );
    }

    const token = await createToken(userId, label ?? "desktop");

    return NextResponse.json({
      ok:    true,
      token,
      note:  "Сохраните токен — он отображается только один раз",
    });
  } catch (err) {
    return NextResponse.json(
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
    return NextResponse.json({ ok: false, error: "Токен не предоставлен" }, { status: 401 });
  }

  const userId = await validateToken(token);
  if (!userId) {
    return NextResponse.json({ ok: false, error: "Недействительный токен" }, { status: 401 });
  }

  return NextResponse.json({ ok: true, userId });
}
