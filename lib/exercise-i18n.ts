// Arabic labels for muscle groups, equipment, and body-target enums. The canonical
// English value is kept everywhere for matching/filtering; these only localize the
// DISPLAY. Call the helpers with `ar` = (language === 'ar').

// Primary-muscle labels (the 17 from PRIMARY_MUSCLES / MUSCLE_CATEGORIES).
export const MUSCLE_AR: Record<string, string> = {
  Abdominals: 'البطن', Biceps: 'البايسبس', Chest: 'الصدر', Forearms: 'الساعد',
  Lats: 'الظهر (لاتس)', 'Lower Back': 'أسفل الظهر', Shoulders: 'الأكتاف', Traps: 'الترابيس',
  Triceps: 'الترايسبس', 'Upper Back': 'أعلى الظهر', Adductors: 'المقرِّبات', Calves: 'السمانة',
  Glutes: 'المؤخرة', Hamstrings: 'أوتار الركبة', Quadriceps: 'الفخذ الأمامي', Cardio: 'كارديو',
  'Full Body': 'الجسم كامل',
  // coarse muscleGroup fallbacks that can appear as a subtitle
  Back: 'الظهر', Arms: 'الذراعان', Legs: 'الأرجل', Core: 'الجذع',
};

// Equipment labels (EQUIPMENT_OPTIONS).
export const EQUIP_AR: Record<string, string> = {
  None: 'بدون معدات', Barbell: 'بار', Dumbbell: 'دمبل', Kettlebell: 'كيتل بِل', Machine: 'جهاز',
  Plate: 'وزن حديد', 'Resistance Band': 'حبل مقاومة', 'Suspension Band': 'حبل تعليق', Other: 'أخرى',
};

// Body-target enums (the 26) — used by the exercise-detail muscle bars.
export const BODY_TARGET_AR: Record<string, string> = {
  chest: 'الصدر', shoulders_anterior: 'الكتف الأمامي', shoulders_lateral: 'الكتف الجانبي',
  shoulders_posterior: 'الكتف الخلفي', triceps: 'الترايسبس', biceps: 'البايسبس', forearms: 'الساعد',
  lats: 'الظهر (لاتس)', upper_back: 'أعلى الظهر', mid_back: 'وسط الظهر', lower_back: 'أسفل الظهر',
  traps: 'الترابيس', erector_spinae: 'الناصبة الشوكية', core_abs: 'البطن', core_deep: 'البطن العميق',
  obliques: 'العضلات الجانبية', hip_flexors: 'مثنيات الورك', glutes: 'المؤخرة', hamstrings: 'أوتار الركبة',
  quadriceps: 'الفخذ الأمامي', adductors: 'المقرِّبات', calves: 'السمانة', cardiovascular: 'القلب والأوعية',
  flexibility: 'المرونة', balance: 'التوازن', endurance: 'التحمل',
};

const titleCase = (s: string) => s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

export const muscleLabel = (name: string, ar: boolean) => (ar ? MUSCLE_AR[name] || name : name);
export const equipLabel = (name: string, ar: boolean) => (ar ? EQUIP_AR[name] || name : name);
export const bodyTargetLabel = (enumName: string, ar: boolean) =>
  ar ? BODY_TARGET_AR[enumName] || titleCase(enumName) : titleCase(enumName);
