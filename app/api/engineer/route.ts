import { NextRequest, NextResponse } from "next/server";
import { buildSystemPrompt } from "@/lib/engineer/personalities";
import type { PersonalityId } from "@/lib/engineer/personalities";

// ─── Google Gemini Flash — полностью бесплатно ─────────────────────────────
// Лимиты бесплатного тарифа:
//   • 15 запросов в минуту
//   • 1 500 000 токенов в день
//   • Без карты
// Получить ключ: aistudio.google.com → Get API Key (1 минута)
const GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? "";
const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

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

// ─── Вызов Gemini API ──────────────────────────────────────────────────────
async function callGemini(
  systemPrompt: string,
  messages:     ChatMessage[],
  maxTokens:    number = 400,
): Promise<string> {
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY не задан — добавь в Environment Variables");
  }

  // Gemini использует "contents" массив, где system — отдельное поле
  const contents = messages.map(m => ({
    role:  m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const res = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents,
      generationConfig: {
        maxOutputTokens:   maxTokens,
        temperature:       0.7,
        topP:              0.9,
        stopSequences:     [],
      },
      safetySettings: [
        // Отключаем блокировку — телеметрия иногда содержит слова типа "crash"
        { category: "HARM_CATEGORY_HARASSMENT",        threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_HATE_SPEECH",       threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    // Читаемые ошибки для самых частых случаев
    if (res.status === 400) throw new Error("Неверный запрос к Gemini — проверь GEMINI_API_KEY");
    if (res.status === 429) throw new Error("Превышен лимит Gemini (15 req/min) — подожди минуту");
    if (res.status === 403) throw new Error("GEMINI_API_KEY неверный или неактивный");
    throw new Error(`Gemini ${res.status}: ${err.slice(0, 200)}`);
  }

  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

// ─── POST — интерактивный чат ──────────────────────────────────────────────
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

    // Последние 6 сообщений + текущий вопрос
    const messages: ChatMessage[] = [
      ...body.history.slice(-6),
      { role: "user", content: body.message },
    ];

    const reply = await callGemini(systemPrompt, messages, 400);
    return NextResponse.json({ reply });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Внутренняя ошибка";
    console.error("[engineer POST]", msg);

    // Дружелюбное сообщение пользователю
    const userMsg = msg.includes("GEMINI_API_KEY не задан")
      ? "AI инженер не настроен. Добавь GEMINI_API_KEY в настройки сайта."
      : msg.includes("Превышен лимит")
      ? "Слишком много запросов — подожди минуту и попробуй снова."
      : "AI инженер временно недоступен.";

    return NextResponse.json({ error: userMsg }, { status: 502 });
  }
}

// ─── GET — авто-брифинг после загрузки круга ──────────────────────────────
export async function GET(req: NextRequest) {
  const url     = new URL(req.url);
  const ctx     = url.searchParams.get("ctx");
  const persona = (url.searchParams.get("personality") ?? "calm") as PersonalityId;
  const lang    = (url.searchParams.get("lang") ?? "en") as "en" | "ru";

  if (!ctx) return NextResponse.json({ error: "Нет ctx" }, { status: 400 });

  if (!GEMINI_API_KEY) {
    // Возвращаем статичный брифинг если ключ не задан — сайт всё равно работает
    const fallback = lang === "ru"
      ? "Данные загружены. Загляни в раздел «Инсайты» — там основные потери. Спроси меня о конкретном повороте."
      : "Data loaded. Check the Insights tab for your main time losses. Ask me about a specific corner.";
    return NextResponse.json({ briefing: fallback });
  }

  try {
    const systemPrompt = buildSystemPrompt(ctx, persona, lang);
    const prompt = lang === "ru"
      ? "Дай краткий брифинг по этой сессии. Главный фокус водителя на сегодня. Максимум 3 предложения."
      : "Give a concise session briefing. Main focus for this session. Max 3 sentences.";

    const briefing = await callGemini(systemPrompt, [{ role: "user", content: prompt }], 150);
    return NextResponse.json({ briefing });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Ошибка";
    console.error("[engineer GET]", msg);
    // Не ломаем UX — возвращаем заглушку
    const fallback = lang === "ru"
      ? "Анализ загружен. Задай вопрос по своему кругу."
      : "Analysis loaded. Ask a question about your lap.";
    return NextResponse.json({ briefing: fallback });
  }
}
