// Minimal Gemini (Google Generative Language) REST client. Server-side only —
// the API key never leaves the backend. Supports multimodal parts (text + inline
// image/PDF) and structured JSON output via responseSchema.
import { env } from "./env";

const BASE = "https://generativelanguage.googleapis.com/v1beta/models";

export type GeminiPart = { text: string } | { inline_data: { mime_type: string; data: string } };

export function geminiConfigured(): boolean {
  return !!env.GEMINI_API_KEY;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// POST to Gemini with retry+backoff on transient errors (429 quota, 500, 503 overload).
async function callGemini(model: string, body: any, tries = 4): Promise<any> {
  let lastErr = "";
  for (let i = 0; i < tries; i++) {
    const res = await fetch(`${BASE}/${model}:generateContent?key=${env.GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const json: any = await res.json().catch(() => null);
    if (res.ok) return json;
    const msg = json?.error?.message ?? "request failed";
    lastErr = `Gemini ${res.status}: ${msg}`;
    // some models don't accept thinkingConfig — strip it and retry once rather than failing
    if (res.status === 400 && /think/i.test(msg) && body?.generationConfig?.thinkingConfig) {
      delete body.generationConfig.thinkingConfig;
      continue;
    }
    if (![429, 500, 503].includes(res.status) || i === tries - 1) throw new Error(lastErr);
    await sleep(1500 * Math.pow(2, i)); // 1.5s, 3s, 6s
  }
  throw new Error(lastErr || "Gemini request failed");
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
      // high cap so a multi-week program isn't truncated mid-output
      maxOutputTokens: opts.maxOutputTokens ?? 32768,
      temperature: 0.4,
      // flash "thinking" adds large latency; minimise it (transcription needs recall, not reasoning)
      thinkingConfig: { thinkingBudget: 0 },
    },
  };
  if (opts.system) body.systemInstruction = { parts: [{ text: opts.system }] };

  const json = await callGemini(model, body);
  const cand = json?.candidates?.[0];
  if (!cand) throw new Error(`Gemini: no candidate (${json?.promptFeedback?.blockReason ?? "unknown"})`);
  const text = (cand.content?.parts ?? []).map((p: any) => p.text).filter(Boolean).join("");
  if (!text) throw new Error("Gemini: empty response");
  try { return JSON.parse(text) as T; } catch { throw new Error("Gemini: response was not valid JSON"); }
}

export type ChatContent = { role: "user" | "model"; parts: GeminiPart[] };
export type ToolDecl = { name: string; description: string; parameters: Record<string, unknown> };
export type ChatResult = { text?: string; call?: { name: string; args: any } };

// Multi-turn chat with optional function-calling. Returns assistant text and/or a
// tool call (functionCall) the caller can act on.
export async function geminiChat(opts: {
  system?: string;
  contents: ChatContent[];
  tools?: ToolDecl[];
  model?: string;
}): Promise<ChatResult> {
  if (!env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not set");
  const model = opts.model || env.GEMINI_MODEL;
  const body: Record<string, unknown> = {
    contents: opts.contents,
    // high cap so a proposed multi-week program isn't truncated; thinking off for speed
    generationConfig: { maxOutputTokens: 32768, temperature: 0.6, thinkingConfig: { thinkingBudget: 0 } },
  };
  if (opts.system) body.systemInstruction = { parts: [{ text: opts.system }] };
  if (opts.tools?.length) body.tools = [{ function_declarations: opts.tools }];

  const json = await callGemini(model, body);
  const parts: any[] = json?.candidates?.[0]?.content?.parts ?? [];
  const call = parts.find((p) => p.functionCall)?.functionCall;
  const text = parts.map((p) => p.text).filter(Boolean).join("").trim();
  return { text: text || undefined, call: call ? { name: call.name, args: call.args } : undefined };
}
