// Parse a photo/PDF of an InBody (body-composition) sheet into structured metrics
// via Gemini multimodal. Returns numbers only — NOTHING is saved; the client shows
// the result for the user to review/edit before committing. Server-side only.
import { geminiJSON } from "../../core/gemini";

// one segment (a limb / the trunk) — lean or fat mass in kg
const SEGMENT = {
  type: "object",
  properties: {
    leftArm: { type: "number" }, rightArm: { type: "number" }, trunk: { type: "number" },
    leftLeg: { type: "number" }, rightLeg: { type: "number" },
  },
} as const;

const INBODY_SCHEMA = {
  type: "object",
  properties: {
    isInbody: { type: "boolean" },     // false when the file is not a body-composition report
    date: { type: "string" },          // test date as YYYY-MM-DD if printed, else ""
    // core (kept as first-class columns + used for trend charts)
    weight: { type: "number" },        // kg
    skeletalMuscle: { type: "number" },// SMM, kg
    muscleMass: { type: "number" },    // lean/soft muscle mass, kg
    bodyFat: { type: "number" },       // PBF, percent
    bodyWater: { type: "number" },     // TBW, litres
    bmi: { type: "number" },
    bmr: { type: "number" },           // BMR / basal metabolic rate, kcal
    visceralFat: { type: "number" },   // visceral fat level
    // composition breakdown (kg)
    fatMass: { type: "number" },       // body fat mass, kg
    fatFreeMass: { type: "number" },   // fat-free / lean body mass, kg
    protein: { type: "number" },       // kg
    minerals: { type: "number" },      // kg
    // analysis
    waistHipRatio: { type: "number" }, // WHR
    smi: { type: "number" },           // skeletal muscle index, kg/m^2
    obesityDegree: { type: "number" }, // percent
    recommendedCalories: { type: "number" }, // recommended daily intake, kcal
    inbodyScore: { type: "number" },   // total InBody score / points, if printed
    // segmental analysis (kg per region)
    segmentalLean: SEGMENT,
    segmentalFat: SEGMENT,
    // the sheet's own recommendations (kg)
    targetWeight: { type: "number" },
    fatControl: { type: "number" },    // + gain / - lose, kg
    muscleControl: { type: "number" }, // + gain, kg
  },
  required: ["isInbody"],
} as const;

const SYSTEM = `You are an expert reading InBody / body-composition test sheets (InBody 270/370/570/770/970 and similar, any language). Extract EVERY numeric metric printed on the sheet into the schema — not only the common ones. Read like a technician who knows the layout:
- skeletalMuscle = SMM (Skeletal Muscle Mass) in KILOGRAMS, from the Muscle-Fat Analysis rows (e.g. "SMM 39.7 kg"). It is a mass in kg, NOT a percentage. This is the primary muscle number — always fill it when SMM is printed.
- muscleMass = a SEPARATE soft-lean / muscle-mass figure ONLY if the sheet prints one distinct from SMM. Most sheets do not; if the only muscle figure is SMM, leave muscleMass empty (do NOT copy SMM into it, and do NOT invent a percentage).
- weight, skeletalMuscle, fatMass, fatFreeMass, protein, minerals, and all segmental values are MASSES in kg (convert pounds to kg). bodyFat = PBF percent. bodyWater = TBW in litres. bmr and recommendedCalories = kcal. visceralFat = its level number. obesityDegree = percent. waistHipRatio (WHR) and smi (kg/m^2) as printed. inbodyScore = the total InBody score/points if printed.
- Segmental analysis: segmentalLean/segmentalFat are the MASS in kg for each of the five regions (left arm, right arm, trunk, left leg, right leg). Ignore the "% of ideal" bars — report the kg figure.
- Use the EXACT printed values; do NOT estimate, derive, or invent. Omit any field not clearly present on the sheet.
- date = the test/measurement date printed on the sheet as YYYY-MM-DD, else "".
- If the file is NOT an InBody / body-composition report, set isInbody=false and omit the metrics.`;

type Segment = { leftArm?: number; rightArm?: number; trunk?: number; leftLeg?: number; rightLeg?: number };
export type InBodyParsed = {
  isInbody: boolean;
  date?: string;
  weight?: number; skeletalMuscle?: number; muscleMass?: number; bodyFat?: number;
  bodyWater?: number; bmi?: number; bmr?: number; visceralFat?: number;
  fatMass?: number; fatFreeMass?: number; protein?: number; minerals?: number;
  waistHipRatio?: number; smi?: number; obesityDegree?: number; recommendedCalories?: number; inbodyScore?: number;
  segmentalLean?: Segment; segmentalFat?: Segment;
  targetWeight?: number; fatControl?: number; muscleControl?: number;
};

export async function parseInBody(file: { mimeType: string; data: string }): Promise<InBodyParsed> {
  const run = () => geminiJSON<InBodyParsed>({
    system: SYSTEM,
    parts: [
      { inline_data: { mime_type: file.mimeType, data: file.data } },
      { text: "Extract the InBody metrics from this sheet." },
    ],
    schema: INBODY_SCHEMA as any,
    maxOutputTokens: 8192, // rich schema + low thinking can exceed 2k and truncate the JSON
  });
  try {
    return await run();
  } catch (e: any) {
    // one retry for the transient "not valid JSON" / truncation case
    if (/not valid JSON|token limit|empty response/i.test(String(e?.message))) return await run();
    throw e;
  }
}

// A short coach opinion + suggestions on a new InBody result, using the athlete's
// previous results and target for context. Shown in the review card before saving.
const INSIGHT_SCHEMA = {
  type: "object",
  properties: {
    summary: { type: "string" },
    suggestions: { type: "array", items: { type: "string" } },
  },
  required: ["summary"],
} as const;

const INSIGHT_SYSTEM = `You are a supportive, expert body-composition coach. You are given a new InBody result (with a "details" object holding the full sheet: fat-free mass, protein, minerals, waist-hip ratio, SMI, obesity degree, recommended calories, InBody score, and segmentalLean/segmentalFat in kg per region), the athlete's previous results (newest first) and their target. Write:
- summary: 2-3 short sentences on what changed vs last time and how they're tracking toward their target. Cite specific numbers, be encouraging and plain-spoken.
- suggestions: 2-4 concrete, actionable tips (training and/or nutrition). Use the full data when it helps — e.g. call out a left/right or upper/lower segmental imbalance, a high visceral-fat level or waist-hip ratio, a low SMI, or the sheet's own fat/muscle-control targets.
No medical diagnosis or health claims. If a value looks implausible, note it gently. Reply in the athlete's language if evident from context, else English.`;

export type InBodyInsight = { summary: string; suggestions?: string[] };

export async function inbodyInsight(input: { metrics: any; previous: any[]; target: any }): Promise<InBodyInsight> {
  const parts = [{ text: `NEW result: ${JSON.stringify(input.metrics)}\nPREVIOUS results (newest first): ${JSON.stringify((input.previous || []).slice(0, 5))}\nTARGET: ${JSON.stringify(input.target || {})}` }];
  return geminiJSON<InBodyInsight>({ system: INSIGHT_SYSTEM, parts, schema: INSIGHT_SCHEMA as any, maxOutputTokens: 900 });
}
