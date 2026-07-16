import { eq } from "drizzle-orm";
import { db, pool } from "../../core/db";
import { gyms, gymTranslations, facilities, facilityTranslations } from "./gyms.db";
import { countries } from "../countries/countries.db";

// ── Predefined facility catalog (icon = Ionicon name; logo optional, added in admin) ──
const FACILITIES: { title: string; icon: string; description: string; ar: { title: string; description: string } }[] = [
  { title: "Sauna", icon: "flame-outline", description: "Relax and recover in the dry sauna.", ar: { title: "ساونا", description: "استرخِ وتعافَ في الساونا الجافة." } },
  { title: "Parking", icon: "car-outline", description: "Free on-site parking for members.", ar: { title: "موقف سيارات", description: "موقف مجاني للأعضاء داخل الموقع." } },
  { title: "Showers", icon: "water-outline", description: "Clean showers and changing rooms.", ar: { title: "حمّامات", description: "حمّامات وغرف تبديل نظيفة." } },
  { title: "Cafe", icon: "cafe-outline", description: "Healthy snacks and protein bar.", ar: { title: "مقهى", description: "وجبات صحية وبار بروتين." } },
  { title: "Swimming Pool", icon: "water-outline", description: "Indoor heated swimming pool.", ar: { title: "مسبح", description: "مسبح داخلي مُدفأ." } },
  { title: "Boxing Ring", icon: "fitness-outline", description: "Full boxing ring and bags.", ar: { title: "حلبة ملاكمة", description: "حلبة ملاكمة كاملة وأكياس لكم." } },
  { title: "Lockers", icon: "lock-closed-outline", description: "Secure personal lockers.", ar: { title: "خزائن", description: "خزائن شخصية آمنة." } },
  { title: "Group Classes", icon: "people-outline", description: "Daily group fitness classes.", ar: { title: "حصص جماعية", description: "حصص لياقة جماعية يومية." } },
  { title: "Free Weights", icon: "barbell-outline", description: "Full free-weights and dumbbell area.", ar: { title: "أوزان حرة", description: "منطقة أوزان حرة ودمبل كاملة." } },
  { title: "Supplements Shop", icon: "flask-outline", description: "On-site supplements store.", ar: { title: "متجر مكملات", description: "متجر مكملات داخل الموقع." } },
];

type Seed = {
  name: string; ar: { name: string; description: string }; description: string;
  countryCode: string; address: string; city: string; lat: number; lng: number;
  rating: number; phone: string; workingHours: string; memberCount: number;
  types: string[]; facilities: string[];
  subscriptions: { name: string; price: { amount: number; currency: string } }[];
  schedule: { day: string; open?: string; close?: string; closed?: boolean; classes: { name: string; time: string; duration: string; coach?: string }[] }[];
};

type Cls = { name: string; time: string; duration: string; coach?: string };
// build a Sun–Sat week with the given open/close; weekday classes vs a lighter weekend
const WEEK = (open: string, close: string, weekday: Cls[], weekend: Cls[] = []) =>
  ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map((day) => ({
    day, open, close,
    classes: day === "Friday" || day === "Saturday" ? weekend : weekday,
  }));

const GYMS: Seed[] = [
  {
    name: "Gold's Gym Amman", ar: { name: "غولدز جيم عمّان", description: "نادٍ متكامل في عبدون مع أحدث المعدات ومنطقة كروسفت ومسبح." },
    description: "Full-service club in Abdoun with modern equipment, a CrossFit box, and a pool.",
    countryCode: "JO", address: "Abdoun, Amman", city: "Amman", lat: 31.9454, lng: 35.8866,
    rating: 4.7, phone: "+962 6 592 1000", workingHours: "6:00 AM - 12:00 AM", memberCount: 520,
    types: ["bodybuilding", "crossfit"], facilities: ["Sauna", "Parking", "Showers", "Cafe", "Swimming Pool"],
    subscriptions: [
      { name: "Monthly", price: { amount: 35, currency: "JOD" } },
      { name: "Quarterly", price: { amount: 90, currency: "JOD" } },
      { name: "Yearly", price: { amount: 300, currency: "JOD" } },
    ],
    schedule: WEEK("6:00 AM", "12:00 AM",
      [
        { name: "CrossFit", time: "6:00 AM", duration: "60 min", coach: "Coach Khalid" },
        { name: "Bodybuilding", time: "8:00 AM", duration: "75 min", coach: "Coach Omar" },
        { name: "HIIT", time: "5:00 PM", duration: "45 min", coach: "Coach Lina" },
      ],
      [{ name: "Open Gym", time: "8:00 AM", duration: "240 min" }]),
  },
  {
    name: "Fitness First Abdali", ar: { name: "فيتنس فيرست العبدلي", description: "نادٍ عصري في بوليفارد العبدلي مع حصص جماعية ومدرّبين معتمدين." },
    description: "Modern club at Abdali Boulevard with group classes and certified trainers.",
    countryCode: "JO", address: "Abdali Boulevard, Amman", city: "Amman", lat: 31.9626, lng: 35.9097,
    rating: 4.5, phone: "+962 6 520 3000", workingHours: "7:00 AM - 11:00 PM", memberCount: 410,
    types: ["fitness", "functional"], facilities: ["Parking", "Showers", "Lockers", "Cafe", "Group Classes"],
    subscriptions: [
      { name: "Monthly", price: { amount: 40, currency: "JOD" } },
      { name: "Quarterly", price: { amount: 105, currency: "JOD" } },
      { name: "Yearly", price: { amount: 360, currency: "JOD" } },
    ],
    schedule: WEEK("7:00 AM", "11:00 PM",
      [
        { name: "Spinning", time: "7:00 AM", duration: "45 min", coach: "Coach Rana" },
        { name: "Yoga", time: "9:00 AM", duration: "60 min", coach: "Coach Dana" },
        { name: "Zumba", time: "5:00 PM", duration: "50 min", coach: "Coach Rana" },
      ],
      [{ name: "Yoga", time: "10:00 AM", duration: "60 min", coach: "Coach Dana" }]),
  },
  {
    name: "Body Master Sweifieh", ar: { name: "بودي ماستر الصويفية", description: "صالة لكمال الأجسام ورفع الأثقال في الصويفية بأسعار مناسبة." },
    description: "Bodybuilding and powerlifting gym in Sweifieh with affordable plans.",
    countryCode: "JO", address: "Sweifieh, Amman", city: "Amman", lat: 31.9515, lng: 35.8612,
    rating: 4.3, phone: "+962 6 581 7700", workingHours: "6:00 AM - 11:00 PM", memberCount: 280,
    types: ["bodybuilding", "powerlifting"], facilities: ["Parking", "Showers", "Free Weights", "Supplements Shop"],
    subscriptions: [
      { name: "Monthly", price: { amount: 25, currency: "JOD" } },
      { name: "Quarterly", price: { amount: 65, currency: "JOD" } },
      { name: "Yearly", price: { amount: 220, currency: "JOD" } },
    ],
    schedule: WEEK("6:00 AM", "11:00 PM",
      [
        { name: "Powerlifting", time: "5:00 PM", duration: "90 min", coach: "Coach Sami" },
      ],
      []),
  },
  {
    name: "Iron Peak Gym Riyadh", ar: { name: "آيرون بيك جيم الرياض", description: "منشأة لياقة متميزة في الرياض مع مناطق مخصصة للكروسفت وكمال الأجسام." },
    description: "Premium facility in Riyadh with dedicated CrossFit and bodybuilding zones.",
    countryCode: "SA", address: "King Fahad Road, Riyadh", city: "Riyadh", lat: 24.7136, lng: 46.6753,
    rating: 4.6, phone: "+966 11 234 5678", workingHours: "6:00 AM - 12:00 AM", memberCount: 450,
    types: ["bodybuilding", "crossfit"], facilities: ["Sauna", "Parking", "Showers", "Cafe", "Boxing Ring", "Swimming Pool"],
    subscriptions: [
      { name: "Monthly", price: { amount: 200, currency: "SAR" } },
      { name: "Quarterly", price: { amount: 500, currency: "SAR" } },
      { name: "Yearly", price: { amount: 1800, currency: "SAR" } },
    ],
    schedule: WEEK("6:00 AM", "12:00 AM",
      [
        { name: "CrossFit", time: "6:00 AM", duration: "60 min", coach: "Coach Faisal" },
        { name: "Bodybuilding", time: "8:00 AM", duration: "75 min", coach: "Coach Majed" },
        { name: "Boxing", time: "5:00 PM", duration: "60 min", coach: "Coach Tariq" },
      ],
      [{ name: "Open Gym", time: "8:00 AM", duration: "240 min" }]),
  },
];

export async function seedGyms() {
  // 1) facility catalog (+ ar) → title→id map
  const facByTitle = new Map<string, string>();
  for (const fac of FACILITIES) {
    let [row] = await db.select().from(facilities).where(eq(facilities.title, fac.title));
    if (!row) [row] = await db.insert(facilities).values({ title: fac.title, icon: fac.icon, description: fac.description }).returning();
    else await db.update(facilities).set({ icon: fac.icon, description: fac.description }).where(eq(facilities.id, row.id));
    await db.insert(facilityTranslations).values({ facilityId: row.id, locale: "ar", title: fac.ar.title, description: fac.ar.description })
      .onConflictDoUpdate({ target: [facilityTranslations.facilityId, facilityTranslations.locale], set: { title: fac.ar.title, description: fac.ar.description } });
    facByTitle.set(fac.title, row.id);
  }

  const countryRows = await db.select().from(countries);
  const byCode = new Map(countryRows.map((c) => [c.code, c.id]));
  let inserted = 0, updated = 0;
  for (const g of GYMS) {
    const countryId = byCode.get(g.countryCode) ?? null;
    const facilityIds = g.facilities.map((title) => facByTitle.get(title)).filter(Boolean) as string[];
    const cols = {
      countryId, name: g.name, description: g.description, address: g.address, city: g.city,
      lat: g.lat, lng: g.lng, rating: g.rating, phone: g.phone, workingHours: g.workingHours,
      memberCount: g.memberCount, types: g.types, facilityIds, subscriptions: g.subscriptions, schedule: g.schedule,
    };
    let [row] = await db.select().from(gyms).where(eq(gyms.name, g.name));
    if (!row) { [row] = await db.insert(gyms).values(cols as any).returning(); inserted++; }
    else { await db.update(gyms).set(cols as any).where(eq(gyms.id, row.id)); updated++; }
    await db.insert(gymTranslations).values({ gymId: row.id, locale: "ar", name: g.ar.name, description: g.ar.description })
      .onConflictDoUpdate({ target: [gymTranslations.gymId, gymTranslations.locale], set: { name: g.ar.name, description: g.ar.description } });
  }
  console.log(`✓ gyms seed: ${FACILITIES.length} facilities, ${inserted} new, ${updated} updated (${GYMS.length} gyms) + ar translations`);
}

if (process.argv[1]?.includes("gyms.seed")) {
  seedGyms().then(() => pool.end()).then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
}
