import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import {
  saveSession, storeFile, updateSession,
  detectTrackFromFilename, detectCarFromFilename,
  type TelemetrySession,
} from "@/lib/storage/sessions";
import { extractToken, validateToken } from "@/lib/auth/tokens";

// ─── POST /api/telemetry/upload ───────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    // ── Auth: optional for MVP (browser uploads work without token) ──
    const token  = extractToken(req.headers);
    const userId = token ? (await validateToken(token)) ?? "anonymous" : "anonymous";

    // ── Parse multipart form ──
    const formData = await req.formData();
    const file     = formData.get("file") as File | null;
    const source   = (formData.get("source") as string | null) ?? "browser";
    const origPath = (formData.get("original_path") as string | null) ?? "";

    if (!file) {
      return NextResponse.json({ error: "Файл не найден" }, { status: 400 });
    }

    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json({ error: "Файл слишком большой (максимум 50 МБ)" }, { status: 413 });
    }

    const ext = file.name.toLowerCase().split(".").pop();
    if (!["csv", "json", "txt"].includes(ext ?? "")) {
      return NextResponse.json(
        { error: "Неподдерживаемый формат. Используйте CSV или JSON." },
        { status: 415 }
      );
    }

    // ── Read and validate content ──
    const text    = await file.text();
    const preview = text.slice(0, 512).toLowerCase();

    const isCSV  = preview.includes("time") && (preview.includes("speed") || preview.includes("spd"));
    const isJSON = preview.trimStart().startsWith("[") || preview.trimStart().startsWith("{");

    if (!isCSV && !isJSON) {
      return NextResponse.json(
        { error: "Файл не содержит данные телеметрии. Нужны колонки: time, speed, throttle, brake." },
        { status: 422 }
      );
    }

    // ── Store raw file ──
    const buffer     = Buffer.from(await file.arrayBuffer());
    const storedPath = await storeFile(buffer, file.name);

    // ── Create session record ──
    const sessionId = randomUUID();
    const session: TelemetrySession = {
      id:            sessionId,
      userId,
      filename:      file.name,
      originalPath:  origPath,
      storedPath,
      sizeBytes:     file.size,
      format:        isCSV ? "csv" : "json",
      source:        source as "desktop" | "browser",
      status:        "pending",
      uploadedAt:    new Date().toISOString(),
      processedAt:   null,
      lapTimeMs:     null,
      totalDeltaMs:  null,
      overallScore:  null,
      insightsCount: null,
      error:         null,
      detectedTrack: detectTrackFromFilename(file.name),
      detectedCar:   detectCarFromFilename(file.name),
    };

    await saveSession(session);

    // ── Trigger async analysis (fire and forget) ──
    processSessionAsync(sessionId, text).catch(console.error);

    return NextResponse.json({
      ok:         true,
      sessionId,
      filename:   file.name,
      sizeBytes:  file.size,
      format:     isCSV ? "csv" : "json",
      status:     "pending",
      dashboardUrl: `/sessions/${sessionId}`,
    });

  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json({ error: "Ошибка обработки файла" }, { status: 500 });
  }
}

// ─── GET /api/telemetry/upload — connection health check ─────────────────────

export async function GET(req: NextRequest) {
  // Validate token if provided
  const token  = extractToken(req.headers);
  const userId = token ? await validateToken(token) : null;

  return NextResponse.json({
    status:  "ready",
    auth:    token ? (userId ? "valid" : "invalid") : "not_provided",
    version: "3.0",
  });
}

// ─── Async analysis ───────────────────────────────────────────────────────────

/**
 * Runs telemetry analysis in the background after a successful upload.
 * Updates the session record with results.
 */
async function processSessionAsync(sessionId: string, text: string): Promise<void> {
  try {
    // Dynamically import to avoid bundling heavy modules into the upload handler
    const { parseFile }              = await import("@/lib/telemetry/parser");
    const { analyseLap }             = await import("@/lib/telemetry/analyzer");
    const { buildSyntheticReference } = await import("@/lib/telemetry/reference");

    // Parse
    const blob   = new Blob([text], { type: "text/csv" });
    const file   = new File([blob], "session.csv");
    const parsed = await parseFile(file);

    // Analyse
    const ref    = buildSyntheticReference(parsed);
    const result = analyseLap(parsed, ref);

    await updateSession(sessionId, {
      status:        "ready",
      processedAt:   new Date().toISOString(),
      lapTimeMs:     parsed.lapTimeMs,
      totalDeltaMs:  result.totalTimeDeltaMs,
      overallScore:  result.overallScore,
      insightsCount: result.insights.filter((i) => i.severity !== "good").length,
    });
  } catch (err) {
    await updateSession(sessionId, {
      status: "error",
      error:  err instanceof Error ? err.message : "Ошибка анализа",
    });
  }
}
