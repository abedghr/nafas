// Minimal Gemini (Google Generative Language) REST client. Server-side only —
// the API key never leaves the backend. Supports multimodal parts (text + inline
// image/PDF) and structured JSON output via responseSchema.
import { env } from "./env";

const BASE = "https://generativelanguage.googleapis.com/v1beta/models";

export type GeminiPart = { text: string } | { inline_data: { mime_type: string; data: string } };

export function geminiConfigured(): boolean {
  return !!env.GEMINI_API_KEY;
}

// Send parts to Gemini and get back parsed JSON matching `schema` (a Gemini/OpenAPI
// subset schema object). Throws on network / non-JSON / blocked responses.
export async function geminiJSON<T = any>(opts: {
  system?: string;
  parts: GeminiPart[];
  schema: Record<string, unknown>;
  model?: string;
  maxOutputTokens?: number;
}): Promise<T> {
  if (!env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not set");
  const model = opts.model || env.GEMINI_MODEL;
  const body: Record<string, unknown> = {
    contents: [{ role: "user", parts: opts.parts }],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: opts.schema,
      maxOutputTokens: opts.maxOutputTokens ?? 8192,
      temperature: 0.4,
    },
  };
  if (opts.system) body.systemInstruction = { parts: [{ text: opts.system }] };

  const res = await fetch(`${BASE}/${model}:generateContent?key=${env.GEMINI_API_KEY}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const json: any = await res.json().catch(() => null);
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${json?.error?.message ?? "request failed"}`);
  const cand = json?.candidates?.[0];
  if (!cand) throw new Error(`Gemini: no candidate (${json?.promptFeedback?.blockReason ?? "unknown"})`);
  const text = (cand.content?.parts ?? []).map((p: any) => p.text).filter(Boolean).join("");
  if (!text) throw new Error("Gemini: empty response");
  try { return JSON.parse(text) as T; } catch { throw new Error("Gemini: response was not valid JSON"); }
}
