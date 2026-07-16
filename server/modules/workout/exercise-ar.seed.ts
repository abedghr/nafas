import { and, eq, isNull } from "drizzle-orm";
import { db, pool } from "../../core/db";
import { exercises, exerciseBodyTargets, exerciseTranslations } from "./workout.db";
import { labels } from "../i18n/i18n.db";

// Arabic names for every system exercise (standard gym terminology).
const NAME_AR: Record<string, string> = {
  "Barbell Bench Press": "ضغط البار المسطح", "Incline Barbell Press": "ضغط البار المائل",
  "Incline Dumbbell Press": "ضغط الدمبل المائل", "Flat Dumbbell Press": "ضغط الدمبل المسطح",
  "Dumbbell Fly": "تفتيح بالدمبل", "Cable Chest Fly": "تفتيح الصدر بالكابل",
  "Overhead Press (Barbell)": "الضغط العلوي بالبار", "Dumbbell Shoulder Press": "ضغط الأكتاف بالدمبل",
  "Dumbbell Lateral Raise": "الرفرفة الجانبية بالدمبل", "Front Raise": "الرفع الأمامي",
  "Triceps Pushdown": "دفع الترايسبس بالكابل", "Skull Crusher": "تمرين الجمجمة (سكل كراشر)",
  Dips: "الغطس (ديبس)", "Push-ups": "تمرين الضغط", "Diamond Push-ups": "ضغط الماسة",
  "Pike Push-up": "ضغط البايك", "Handstand Push-up": "ضغط الوقوف على اليدين",
  "Pull-up": "العقلة", "Chin-up": "العقلة بقبضة عكسية", "Barbell Row": "تجديف البار",
  "Dumbbell Row": "تجديف الدمبل", "Seated Cable Row": "التجديف الجالس بالكابل",
  "Lat Pulldown": "السحب الأمامي (لات)", "Face Pull": "السحب للوجه",
  "Barbell Curl": "مرجحة البار للبايسبس", "Dumbbell Hammer Curl": "مرجحة المطرقة بالدمبل",
  "Inverted Row": "التجديف المقلوب", Deadlift: "الرفعة الميتة", "Romanian Deadlift": "الرفعة الرومانية",
  "Barbell Back Squat": "القرفصاء الخلفية بالبار", "Front Squat": "القرفصاء الأمامية",
  "Leg Press": "دفع الأرجل", "Hack Squat": "قرفصاء الهاك", "Bulgarian Split Squat": "القرفصاء البلغارية",
  "Walking Lunges": "الطعنات المتحركة", "Leg Curl": "ثني الأرجل", "Leg Extension": "تمديد الأرجل",
  "Hip Thrust": "دفع الورك", "Standing Calf Raise": "رفع السمانة وقوفاً", "Goblet Squat": "قرفصاء الكأس",
  "Sumo Deadlift": "الرفعة الميتة سومو", "Pistol Squat": "قرفصاء المسدس", Plank: "البلانك",
  "Side Plank": "البلانك الجانبي", "Hanging Knee Raise": "رفع الركبتين معلقاً",
  "Hanging Leg Raise": "رفع الساقين معلقاً", "Ab Wheel Rollout": "عجلة البطن",
  "Cable Crunch": "كرنش بالكابل", "Russian Twist": "اللف الروسي", "Dead Bug": "الحشرة الميتة",
  "L-Sit": "جلسة L", "Dragon Flag": "علم التنين", "Treadmill Run": "الجري على المشاية",
  "Cycling (Stationary)": "الدراجة الثابتة", "Rowing Machine": "جهاز التجديف", "Jump Rope": "نط الحبل",
  "Stair Climber": "صعود الدرج", "Battle Ropes": "حبال المعركة", Burpee: "البيربي",
  "Box Jump": "القفز على الصندوق", "Mountain Climbers": "متسلق الجبال", "Jumping Jacks": "القفز المتباعد",
  "Kettlebell Swing": "أرجحة الكيتل بِل", "Assault Bike Sprint": "سبرينت دراجة الأسولت",
  "Farmer's Carry": "حمل المزارع", "Turkish Get-Up": "النهوض التركي", "Sled Push": "دفع الزلاجة",
  "Tire Flip": "قلب الإطار", "Power Clean": "البور كلين", "Hang Clean": "الهانغ كلين",
  "Clean & Jerk": "الخطف والنتر", Snatch: "الخطف (سناتش)", "Power Snatch": "البور سناتش",
  "Hip 90/90 Stretch": "إطالة الورك 90/90", "Thoracic Rotation": "تدوير الفقرات الصدرية",
  "World's Greatest Stretch": "أعظم إطالة في العالم", "Couch Stretch": "إطالة الأريكة",
  "Cat-Cow": "وضعية القطة والبقرة", "Deep Squat Hold": "ثبات القرفصاء العميق", "Muscle-up": "المسل أب",
  "Front Lever": "الرافعة الأمامية", "Back Lever": "الرافعة الخلفية", Planche: "البلانش",
  "Human Flag": "العلم البشري", "Handstand Hold": "ثبات الوقوف على اليدين",
  "Australian Pull-up": "العقلة الأسترالية", "Wide Grip Pull-up": "العقلة بقبضة واسعة",
  "Close Grip Pull-up": "العقلة بقبضة ضيقة", "Archer Pull-up": "عقلة الرامي",
  "One-Arm Pull-up": "العقلة بذراع واحدة", "Typewriter Pull-up": "عقلة الآلة الكاتبة",
  "Commando Pull-up": "عقلة الكوماندوز", "Straight Bar Dip": "الغطس على البار المستقيم",
  "Korean Dip": "الغطس الكوري", "Ring Dip": "الغطس على الحلق", "Ring Push-up": "الضغط على الحلق",
  "Ring Pull-up": "العقلة على الحلق", "Dead Hang": "التعلق الميت", "Scapular Pull-up": "عقلة لوح الكتف",
  "Toes to Bar": "الأصابع إلى البار", "Bar Muscle-up": "مسل أب على البار",
  "Ring Muscle-up": "مسل أب على الحلق", "Chest to Bar Pull-up": "العقلة صدر إلى البار",
  "Wall Sit": "الجلوس على الحائط",
};

export async function seedExerciseAr() {
  const arLbls = await db.select().from(labels).where(and(eq(labels.grp, "body_target"), eq(labels.locale, "ar")));
  const arLabel: Record<string, string> = Object.fromEntries(arLbls.map((l) => [l.key, l.value]));

  const exRows = await db.select().from(exercises).where(isNull(exercises.userId));
  let n = 0;
  for (const ex of exRows) {
    const arName = NAME_AR[ex.name] || ex.name;
    const tgts = await db.select().from(exerciseBodyTargets).where(eq(exerciseBodyTargets.exerciseId, ex.id));
    const top = tgts.sort((a, b) => b.percentage - a.percentage).slice(0, 3).map((t) => arLabel[t.bodyTarget] || t.bodyTarget);
    const description = top.length
      ? `تمرين ${arName} يعمل بشكل رئيسي على: ${top.join("، ")}.`
      : `تمرين ${arName}.`;
    await db.insert(exerciseTranslations).values({ exerciseId: ex.id, locale: "ar", name: arName, description })
      .onConflictDoUpdate({ target: [exerciseTranslations.exerciseId, exerciseTranslations.locale], set: { name: arName, description } });
    n++;
  }
  console.log(`✓ ar exercise translations upserted: ${n}`);
}

if (process.argv[1]?.includes("exercise-ar.seed")) {
  seedExerciseAr().then(() => pool.end()).then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
}
