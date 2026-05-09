import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/storage/sessions";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession(params.id);
  if (!session) {
    return NextResponse.json({ error: "Сессия не найдена" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, session });
}
