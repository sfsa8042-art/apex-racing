import { NextRequest, NextResponse } from "next/server";
import { buildSystemPrompt } from "@/lib/engineer/personalities";
import type { PersonalityId } from "@/lib/engineer/personalities";

const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY ?? "";
const MISTRAL_URL     = "https://api.mistral.ai/v1/chat/completions";
const MODEL           = "mistral-small-latest";

export interface ChatMessage {
  role:    "user" | "assistant";
  content: string;
}

interface EngineerRequest {
  contextSummary: string;
  message:        string;
  personality:    PersonalityId;
  history:        ChatMessage[];
  lang:           "en" | "ru";
}

async function callMistral(
  systemPrompt: string,
  messages:     ChatMessage[],
  maxTokens:    number = 400,
): Promise<string> {
  if (!MISTRAL_API_KEY) throw new Error("MISTRAL_API_KEY не задан");

  const res = await fetch(MISTRAL_URL, {
    method:  "POST",
    headers: {
      "Content-Type":  "application/json",
      "Authorization": `Bearer ${MISTRAL_API_KEY}`,
    },
    body: JSON.stringify({
      model:       MODEL,
      max_tokens:  maxTokens,
      temperature: 0.7,
      messages: [
        { role: "system", content: systemPrompt },
        ...messages.map(m => ({ role: m.role, content: m.content })),
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    if (res.status === 429) throw new Error("Превышен лимит — подожди минуту");
    if (res.status === 401) throw new Error("MISTRAL_API_KEY неверный");
    throw new Error(`Mistral ${res.status}: ${err.slice(0, 200)}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as EngineerRequest;
    if (!body.contextSummary || !body.message) {
      return NextResponse.json({ error: "Не хватает параметров" }, { status: 400 });
    }

    const systemPrompt = buildSystemPrompt(
      body.contextSummary,
      body.personality ?? "calm",
      body.lang ?? "en",
    );

    const messages: ChatMessage[] = [
      ...body.history.slice(-6),
      { role: "user", content: body.message },
    ];

    const reply = await callMistral(systemPrompt, messages, 400);
    return NextResponse.json({ reply });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Ошибка";
    console.error("[engineer POST]", msg);
    const userMsg = msg.includes("не задан")
      ? "AI инженер не настроен. Добавь MISTRAL_API_KEY в Vercel."
      : msg.includes("лимит")
      ? "Слишком много запросов — подожди минуту."
      : "AI инженер временно недоступен.";
    return NextResponse.json({ error: userMsg }, { status: 502 });
  }
}

export async function GET(req: NextRequest) {
  const url     = new URL(req.url);
  const ctx     = url.searchParams.get("ctx");
  const persona = (url.searchParams.get("personality") ?? "calm") as PersonalityId;
  const lang    = (url.searchParams.get("lang") ?? "en") as "en" | "ru";

  if (!ctx) return NextResponse.json({ error: "Нет ctx" }, { status: 400 });

  if (!MISTRAL_API_KEY) {
    const fallback = lang === "ru"
      ? "Данные загружены. Задай вопрос по своему кругу."
      : "Data loaded. Ask me about your lap.";
    return NextResponse.json({ briefing: fallback });
  }

  try {
    const systemPrompt = buildSystemPrompt(ctx, persona, lang);
    const prompt = lang === "ru"
      ? "Дай краткий брифинг по сессии. Главный фокус. Максимум 3 предложения."
      : "Give a concise session briefing. Main focus. Max 3 sentences.";

    const briefing = await callMistral(systemPrompt, [{ role: "user", content: prompt }], 150);
    return NextResponse.json({ briefing });
  } catch {
    const fallback = lang === "ru"
      ? "Анализ загружен. Задай вопрос по своему кругу."
      : "Analysis loaded. Ask a question about your lap.";
    return NextResponse.json({ briefing: fallback });
  }
}
