// Parse a photo/PDF of an InBody (body-composition) sheet into structured metrics
// via Gemini multimodal. Returns numbers only — NOTHING is saved; the client shows
// the result for the user to review/edit before committing. Server-side only.
import { geminiJSON } from "../../core/gemini";

const INBODY_SCHEMA = {
  type: "object",
  properties: {
    isInbody: { type: "boolean" },     // false when the file is not a body-composition report
    date: { type: "string" },          // test date as YYYY-MM-DD if printed, else ""
    weight: { type: "number" },        // kg
    skeletalMuscle: { type: "number" },// SMM, kg
    muscleMass: { type: "number" },    // lean/soft muscle mass, kg
    bodyFat: { type: "number" },       // PBF, percent
    bodyWater: { type: "number" },     // TBW, litres
    bmi: { type: "number" },
    bmr: { type: "number" },           // kcal
    visceralFat: { type: "number" },   // level
  },
  required: ["isInbody"],
} as const;

const SYSTEM = `You read InBody / body-composition test sheets (InBody 270/370/570/770/970 and similar, any language). Extract the numeric metrics into the schema. Rules:
- Convert any pounds to kilograms; report weight/muscle in kg, body fat as a percentage (PBF), body water in litres (TBW), BMR in kcal, visceral fat as its level number.
- Use the exact printed values; do NOT estimate or invent. Omit any field that is not clearly present.
- date = the test/measurement date printed on the sheet as YYYY-MM-DD, else "".
- If the file is NOT an InBody / body-composition report, set isInbody=false and omit the metrics.`;

export type InBodyParsed = {
  isInbody: boolean;
  date?: string;
  weight?: number; skeletalMuscle?: number; muscleMass?: number; bodyFat?: number;
  bodyWater?: number; bmi?: number; bmr?: number; visceralFat?: number;
};

export async function parseInBody(file: { mimeType: string; data: string }): Promise<InBodyParsed> {
  return geminiJSON<InBodyParsed>({
    system: SYSTEM,
    parts: [
      { inline_data: { mime_type: file.mimeType, data: file.data } },
      { text: "Extract the InBody metrics from this sheet." },
    ],
    schema: INBODY_SCHEMA as any,
    maxOutputTokens: 1024,
  });
}
