import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/storage/sessions";
import { readFile } from "fs/promises";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession(params.id);
    if (!session) {
      return NextResponse.json({ error: "Сессия не найдена" }, { status: 404 });
    }

    // Return session metadata
    return NextResponse.json({ ok: true, session });
  } catch {
    return NextResponse.json({ error: "Ошибка" }, { status: 500 });
  }
}
