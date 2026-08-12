# AI Coach (askAi) — parked task

Status: **not started** — logged 2026-08-02, to resume later.
Source plan (heavyweight, enterprise): `~/Downloads/askai-surge-plan.md`.
This file = the agreed lean direction; read it first when we come back.

## What it must do (user's asks)
- Separate module; used by the **Workout / "AI Coach" tab** for now.
- **Step 0 (pre-req):** user sets a **target for this period** (goal + timeframe) → everything keys off it + user's workouts/sets/behaviour.
- Suggest an **AI program** → **replaces** the current fake "AI Weekly Plan".
- **Insights**: real AI recommendations grounded in the user's data (replace hardcoded insight strings).
- **Chatbot** that can **add external workouts** from image/file (user uploads a workout photo/file, tells the coach to save it as a **template or program**) → parse → confirm → write.
- **Reject anything not workout / not our-data related** — treat as very important. Handle **spam users**.
- Help on specific exercise / specific workout / advice questions.

## Plan review verdict
Great bones, wrong weight class. The source plan is a SEC-1, 3-surge, 6-week enterprise build (DPA + threat model + ADR gating). Prototype doesn't need that yet.

**Keep (5 non-negotiables):**
1. Numbers computed in **SQL; model only narrates** (never let it invent figures).
2. **Propose → confirm → commit** for every write.
3. **Grounded context block** (facts, no identity/PII to provider).
4. **Refusal suite** + **spend cap** from commit #1.
5. **Separate module**.

**Cut for now (flag, don't block):** 3-surge/6-week framing, DPA/ADR/threat-model gating, weekly push summaries, 50-image labelled eval set.

**Under-weighted vs asks — fix when building:**
- Off-topic + spam: don't lean on the big model's refusal. Add a **cheap intent gate first** (tiny/fast model, e.g. Haiku, or keyword) → classify `workout / off-topic / abuse` BEFORE the expensive call. Off-topic → canned redirect (zero cost). Abuse → per-user daily cap + cooldown.
- "Set target for this period" = **Step 0**, a plain form (not AI), stored, fed into every context block.
- AI program + insights must **replace** the existing fake data, not sit beside it.

## Lean shape — one core, three surfaces
| | What | Replaces |
|---|---|---|
| Core | context builder + tool layer + safety/intent gate + spend cap | — |
| **v0 (first)** | grounded **Insights + Recommendations + AI Program** (SQL→narrate) + **Step-0 target** | fake insights / weekly plan |
| v1 | **Chat** (grounded, off-topic-gated, spam-capped) | — |
| v2 | **Add-from-image/file** (parse → confirm → save as template/program) | manual entry |

Ship **v0 first** — highest value (kills fake data), lowest risk (read-only, no chat surface).

## Decisions (defaults chosen unless changed)
- **Model:** Anthropic Claude — Haiku for gate+chat, Sonnet for image parsing (vendor-policy clean).
- **KSA later** → data-residency flag (in-Kingdom for regulated KSA work); JO-first consumer is lower stakes — record in an ADR when KSA lands.
- **Start at v0** (grounded insights + target), defer chat/parsing.

## Where the fake data lives now (to replace in v0)
- `lib/i18n-extra.ts` → `workoutTab.*`: `aiWeeklyPlan`, `aiRecommendations`, `rec*`, `insight*` strings (hardcoded).
- `src/features/workout/api.ts` → `workoutApi.insights / recommendations / weeklyPlan` (stub endpoints).

## Resume
Say "resume AI Coach" → brainstorm → plan mode for **v0 only**.
