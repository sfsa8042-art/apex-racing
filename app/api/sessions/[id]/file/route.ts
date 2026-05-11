import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/storage/sessions";
import { readFile } from "fs/promises";
import { existsSync } from "fs";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession(params.id);
    if (!session) return NextResponse.json({ error: "Не найдена" }, { status: 404 });
    if (!session.storedPath || !existsSync(session.storedPath)) {
      return NextResponse.json({ error: "Файл недоступен" }, { status: 404 });
    }
    const buffer = await readFile(session.storedPath);
    return new NextResponse(buffer, {
      headers: {
        "Content-Type":        "text/plain; charset=utf-8",
        "Content-Disposition": `attachment; filename="${session.filename}"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "Ошибка" }, { status: 500 });
  }
}
