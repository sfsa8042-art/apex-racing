import { NextRequest, NextResponse } from "next/server";
import { listSessions } from "@/lib/storage/sessions";
import { extractToken, validateToken } from "@/lib/auth/tokens";

/**
 * GET /api/sessions
 * Returns all sessions for the authenticated user.
 * Falls back to "anonymous" if no token provided (MVP).
 */
export async function GET(req: NextRequest) {
  try {
    const token  = extractToken(req.headers);
    const userId = token ? (await validateToken(token)) ?? "anonymous" : "anonymous";

    const url    = new URL(req.url);
    const all    = url.searchParams.get("all") === "1";

    // In MVP: return all sessions; in production filter by userId
    const sessions = await listSessions(all ? undefined : userId);

    return NextResponse.json({
      ok:       true,
      sessions,
      count:    sessions.length,
    });
  } catch (err) {
    return NextResponse.json({ error: "Не удалось загрузить сессии" }, { status: 500 });
  }
}
