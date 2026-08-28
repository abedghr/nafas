// AI narrative for the end-of-program report. The client computes all the
// numbers (lib/program-report.ts) and sends a compact context; here we only
// turn it into a short, honest, encouraging analysis. No numbers are invented.
import { geminiJSON, geminiConfigured } from "../../core/gemini";

const SYSTEM = `You are the Nafas training coach analysing an athlete's finished training program. You are given a JSON summary of their journey: completion and adherence rates, per-week and per-weekday consistency, streaks, total volume and minutes, which days they skipped or swapped for a different workout, and (if present) a comparison with their previous run of the same program.

Write a personal analysis with three parts:
- summary: 2-3 sentences. Honest and encouraging. Name the single most important pattern (e.g. strong first weeks then a drop, or very consistent on weekends). If they ended early, acknowledge it without judgement.
- highlights: 2-4 short bullet strings — concrete things that went well, using the actual numbers you were given.
- suggestions: 2-4 short bullet strings — specific, actionable touches for next time, tied to their real weak spots (a weak week, a weekday they kept missing, low on-time rate, many skips).

Rules: use ONLY the numbers provided; never invent figures, PRs, or dates. No medical claims. Keep each bullet under ~16 words. Reply in the athlete's language (field "language": "ar" = Modern Standard Arabic, else English). Plain, specific, neutral wording.`;

const SCHEMA = {
  type: "object",
  properties: {
    summary: { type: "string" },
    highlights: { type: "array", items: { type: "string" } },
    suggestions: { type: "array", items: { type: "string" } },
  },
  required: ["summary", "highlights", "suggestions"],
} as const;

export interface EndReportAI { generatedAt: string; summary: string; highlights: string[]; suggestions: string[] }

export async function generateEndReport(ctx: Record<string, unknown>): Promise<EndReportAI> {
  if (!geminiConfigured()) throw new Error("GEMINI_API_KEY not set");
  const r = await geminiJSON<{ summary: string; highlights: string[]; suggestions: string[] }>({
    system: SYSTEM,
    parts: [{ text: JSON.stringify(ctx) }],
    schema: SCHEMA as any,
    maxOutputTokens: 700,
  });
  return {
    generatedAt: new Date().toISOString(),
    summary: r.summary || "",
    highlights: Array.isArray(r.highlights) ? r.highlights.slice(0, 4) : [],
    suggestions: Array.isArray(r.suggestions) ? r.suggestions.slice(0, 4) : [],
  };
}
