import { NextRequest, NextResponse } from "next/server";
import { localisedJson } from "@/shared/i18n/server";
import { getSession } from "@/lib/storage/sessions";
import { readFile } from "fs/promises";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession(params.id);
    if (!session) {
      return localisedJson(_req, { error: "Сессия не найдена" }, { status: 404 });
    }

    // Return session metadata
    return localisedJson(_req, { ok: true, session });
  } catch {
    return localisedJson(_req, { error: "Ошибка" }, { status: 500 });
  }
}
