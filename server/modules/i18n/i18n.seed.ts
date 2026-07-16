import { eq } from "drizzle-orm";
import { db, pool } from "../../core/db";
import { languages, labels } from "./i18n.db";

const LANGS = [
  { code: "en", name: "English", nativeName: "English", isActive: true, isDefault: true },
  { code: "ar", name: "Arabic", nativeName: "العربية", isActive: true, isDefault: false },
];

const EN: Record<string, Record<string, string>> = {
  measurement_type: { reps: "Reps", time_hold: "Time Hold", distance_duration: "Distance / Duration" },
  set_type: { reps: "Reps", hold: "Hold", emom: "EMOM" },
  meal_type: {
    breakfast: "Breakfast", lunch: "Lunch", dinner: "Dinner", snack: "Snack",
    drink: "Drink", dessert: "Dessert", pre_workout: "Pre-Workout", post_workout: "Post-Workout",
  },
  body_target: {
    chest: "Chest", shoulders_anterior: "Front Delts", shoulders_lateral: "Side Delts", shoulders_posterior: "Rear Delts",
    triceps: "Triceps", biceps: "Biceps", forearms: "Forearms", lats: "Lats", upper_back: "Upper Back", mid_back: "Mid Back",
    lower_back: "Lower Back", traps: "Traps", erector_spinae: "Erector Spinae", core_abs: "Abs", core_deep: "Deep Core",
    obliques: "Obliques", hip_flexors: "Hip Flexors", glutes: "Glutes", hamstrings: "Hamstrings", quadriceps: "Quadriceps",
    adductors: "Adductors", calves: "Calves", cardiovascular: "Cardiovascular", flexibility: "Flexibility", balance: "Balance", endurance: "Endurance",
  },
};

const AR: Record<string, Record<string, string>> = {
  measurement_type: { reps: "تكرارات", time_hold: "ثبات زمني", distance_duration: "مسافة / مدة" },
  set_type: { reps: "تكرارات", hold: "ثبات", emom: "إيموم" },
  meal_type: {
    breakfast: "فطور", lunch: "غداء", dinner: "عشاء", snack: "وجبة خفيفة",
    drink: "مشروب", dessert: "حلويات", pre_workout: "قبل التمرين", post_workout: "بعد التمرين",
  },
  body_target: {
    chest: "الصدر", shoulders_anterior: "الكتف الأمامي", shoulders_lateral: "الكتف الجانبي", shoulders_posterior: "الكتف الخلفي",
    triceps: "ثلاثية الرؤوس", biceps: "ذات الرأسين", forearms: "الساعد", lats: "العضلة الظهرية العريضة", upper_back: "أعلى الظهر", mid_back: "وسط الظهر",
    lower_back: "أسفل الظهر", traps: "شبه المنحرفة", erector_spinae: "الناصبة للفقرات", core_abs: "عضلات البطن", core_deep: "العضلات العميقة",
    obliques: "العضلات المائلة", hip_flexors: "ثنيات الورك", glutes: "المؤخرة", hamstrings: "أوتار الركبة", quadriceps: "الفخذ الأمامية",
    adductors: "العضلات المقرّبة", calves: "السمانة", cardiovascular: "القلب والأوعية", flexibility: "المرونة", balance: "التوازن", endurance: "التحمّل",
  },
};

export async function seedI18n() {
  for (const l of LANGS) {
    const [exists] = await db.select().from(languages).where(eq(languages.code, l.code));
    if (!exists) await db.insert(languages).values(l);
  }
  let n = 0;
  for (const [locale, sets] of [["en", EN], ["ar", AR]] as const) {
    for (const grp of Object.keys(sets)) {
      for (const [key, value] of Object.entries(sets[grp])) {
        await db.insert(labels).values({ grp, key, locale, value })
          .onConflictDoUpdate({ target: [labels.grp, labels.key, labels.locale], set: { value } });
        n++;
      }
    }
  }
  console.log(`✓ i18n seed: ${LANGS.length} languages, ${n} label rows`);
}

if (process.argv[1]?.includes("i18n.seed")) {
  seedI18n().then(() => pool.end()).then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
}
