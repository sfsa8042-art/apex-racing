import { NextRequest, NextResponse } from "next/server";
import { localisedJson } from "@/shared/i18n/server";
import { getSession } from "@/lib/storage/sessions";
import { readFile } from "fs/promises";
import { existsSync } from "fs";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession(params.id);
    if (!session) return localisedJson(_req, { error: "Не найдена" }, { status: 404 });
    if (!session.storedPath || !existsSync(session.storedPath)) {
      return localisedJson(_req, { error: "Файл недоступен" }, { status: 404 });
    }
    const buffer = await readFile(session.storedPath);
    return new NextResponse(buffer, {
      headers: {
        "Content-Type":        "text/plain; charset=utf-8",
        "Content-Disposition": `attachment; filename="${session.filename}"`,
      },
    });
  } catch {
    return localisedJson(_req, { error: "Ошибка" }, { status: 500 });
  }
}
