import { eq } from "drizzle-orm";
import { db, pool } from "../../core/db";
import { events, eventTranslations } from "./events.db";
import { countries } from "../countries/countries.db";

type Seed = {
  name: string; ar: { name: string; description: string; venue: string };
  description: string; type: string; category: string; countryCode: string;
  venue: string; city: string; lat: number; lng: number;
  startsAt: string; endsAt: string; capacity: number; tags: string[];
};

// dates are relative-safe fixed strings (2026) — upcoming for the demo window
const EVENTS: Seed[] = [
  {
    name: "Amman CrossFit Throwdown", type: "tournament", category: "crossfit", countryCode: "JO",
    description: "A one-day CrossFit competition for RX and scaled athletes across Amman boxes.",
    venue: "Al Hussein Youth City", city: "Amman", lat: 31.9515, lng: 35.9239,
    startsAt: "2026-08-15T07:00:00.000Z", endsAt: "2026-08-15T18:00:00.000Z", capacity: 120, tags: ["rx", "scaled", "teams"],
    ar: { name: "بطولة عمّان للكروسفت", description: "منافسة كروسفت ليوم واحد لفئتي RX والمبتدئين من صالات عمّان.", venue: "مدينة الحسين للشباب" },
  },
  {
    name: "Dead Sea Ultra Run", type: "event", category: "running", countryCode: "JO",
    description: "Scenic 50K / 21K / 10K runs along the lowest point on Earth.",
    venue: "Dead Sea Panorama", city: "Dead Sea", lat: 31.5590, lng: 35.4732,
    startsAt: "2026-09-05T05:30:00.000Z", endsAt: "2026-09-05T13:00:00.000Z", capacity: 300, tags: ["50k", "21k", "10k"],
    ar: { name: "سباق البحر الميت الاولترا", description: "سباقات جري خلابة 50 و21 و10 كم عند أخفض نقطة على الأرض.", venue: "بانوراما البحر الميت" },
  },
  {
    name: "Iron Peak Powerlifting Open", type: "tournament", category: "powerlifting", countryCode: "SA",
    description: "Raw powerlifting meet — squat, bench, deadlift across weight classes.",
    venue: "Iron Peak Gym", city: "Riyadh", lat: 24.7136, lng: 46.6753,
    startsAt: "2026-08-28T09:00:00.000Z", endsAt: "2026-08-29T20:00:00.000Z", capacity: 80, tags: ["raw", "squat", "bench", "deadlift"],
    ar: { name: "بطولة آيرون بيك لرفع الأثقال", description: "منافسة رفع أثقال خام — قرفصاء وبنش ورفعة مميتة لجميع الأوزان.", venue: "صالة آيرون بيك" },
  },
  {
    name: "30-Day Ramadan Shred Challenge", type: "challenge", category: "fitness", countryCode: "JO",
    description: "A community fat-loss challenge with weekly check-ins and prizes.",
    venue: "Online + Gold's Gym Amman", city: "Amman", lat: 31.9539, lng: 35.9106,
    startsAt: "2026-10-01T00:00:00.000Z", endsAt: "2026-10-30T23:59:00.000Z", capacity: 0, tags: ["fat-loss", "community", "prizes"],
    ar: { name: "تحدي رمضان للرشاقة 30 يوماً", description: "تحدي مجتمعي لخسارة الدهون مع متابعات أسبوعية وجوائز.", venue: "أونلاين + جولدز جيم عمّان" },
  },
];

async function seedEvents() {
  const cs = await db.select().from(countries);
  const byCode = new Map(cs.map((c) => [c.code, c.id]));
  let inserted = 0, updated = 0;
  for (const e of EVENTS) {
    const cols = {
      countryId: byCode.get(e.countryCode) ?? null, type: e.type, category: e.category,
      name: e.name, description: e.description, venue: e.venue, city: e.city, lat: e.lat, lng: e.lng,
      startsAt: new Date(e.startsAt), endsAt: new Date(e.endsAt), capacity: e.capacity, tags: e.tags,
    };
    let [row] = await db.select().from(events).where(eq(events.name, e.name));
    if (!row) { [row] = await db.insert(events).values(cols as any).returning(); inserted++; }
    else { await db.update(events).set(cols as any).where(eq(events.id, row.id)); updated++; }
    await db.insert(eventTranslations).values({ eventId: row.id, locale: "ar", name: e.ar.name, description: e.ar.description, venue: e.ar.venue })
      .onConflictDoUpdate({ target: [eventTranslations.eventId, eventTranslations.locale], set: { name: e.ar.name, description: e.ar.description, venue: e.ar.venue } });
  }
  console.log(`✓ events seed: ${inserted} new, ${updated} updated (${EVENTS.length} events) + ar translations`);
}

if (process.argv[1]?.includes("events.seed")) {
  seedEvents().then(() => pool.end()).then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
}
