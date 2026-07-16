import { eq } from "drizzle-orm";
import { db, pool } from "../../core/db";
import { restaurants, restaurantTranslations } from "./restaurants.db";
import { countries } from "../countries/countries.db";

type M = { name: string; description?: string; price: { amount: number; currency: string }; calories?: number };
type Seed = {
  name: string; ar: { name: string; description: string }; description: string;
  countryCode: string; address: string; city: string; lat: number; lng: number;
  rating: number; phone: string; workingHours: string; priceRange: string;
  cuisines: string[]; menu: M[];
};

const J = (amount: number) => ({ amount, currency: "JOD" });

const RESTAURANTS: Seed[] = [
  {
    name: "Fit Kitchen Amman", ar: { name: "فيت كيتشن عمّان", description: "وجبات صحية متوازنة الماكروز مع سعرات معلنة، في عبدون." },
    description: "Macro-balanced healthy meals with listed calories, in Abdoun.",
    countryCode: "JO", address: "Abdoun, Amman", city: "Amman", lat: 31.9421, lng: 35.8884,
    rating: 4.6, phone: "+962 6 593 2200", workingHours: "9:00 AM - 11:00 PM", priceRange: "$$",
    cuisines: ["healthy", "salads", "grill"],
    menu: [
      { name: "Grilled Chicken Bowl", description: "Chicken, rice, greens", price: J(6.5), calories: 520 },
      { name: "Salmon & Quinoa", description: "Grilled salmon, quinoa, veg", price: J(9), calories: 610 },
      { name: "Protein Salad", description: "Mixed greens, egg, chicken", price: J(5), calories: 380 },
    ],
  },
  {
    name: "Green Fork", ar: { name: "غرين فورك", description: "مطعم نباتي وصحي في الصويفية مع خيارات نباتية صرفة." },
    description: "Plant-based & healthy spot in Sweifieh with vegan options.",
    countryCode: "JO", address: "Sweifieh, Amman", city: "Amman", lat: 31.9505, lng: 35.8620,
    rating: 4.4, phone: "+962 6 581 9090", workingHours: "10:00 AM - 10:00 PM", priceRange: "$$",
    cuisines: ["healthy", "vegan", "bowls"],
    menu: [
      { name: "Buddha Bowl", description: "Falafel, hummus, greens, grains", price: J(5.5), calories: 480 },
      { name: "Avocado Toast", description: "Sourdough, avocado, egg", price: J(4), calories: 350 },
      { name: "Green Smoothie", description: "Spinach, banana, apple", price: J(3), calories: 180 },
    ],
  },
  {
    name: "Lean House", ar: { name: "لين هاوس", description: "مطعم رياضي في الشميساني يقدّم وجبات عالية البروتين." },
    description: "Athlete-focused eatery in Shmeisani serving high-protein meals.",
    countryCode: "JO", address: "Shmeisani, Amman", city: "Amman", lat: 31.9686, lng: 35.9106,
    rating: 4.5, phone: "+962 6 566 7788", workingHours: "8:00 AM - 11:00 PM", priceRange: "$$$",
    cuisines: ["healthy", "high-protein", "grill"],
    menu: [
      { name: "Steak & Sweet Potato", description: "Lean steak, sweet potato", price: J(11), calories: 640 },
      { name: "Chicken Shawarma Bowl", description: "Healthy shawarma, no bread", price: J(6), calories: 540 },
      { name: "Oats & Berries", description: "Protein oats bowl", price: J(3.5), calories: 320 },
    ],
  },
];

export async function seedRestaurants() {
  const countryRows = await db.select().from(countries);
  const byCode = new Map(countryRows.map((c) => [c.code, c.id]));
  let inserted = 0, updated = 0;
  for (const r of RESTAURANTS) {
    const cols = {
      countryId: byCode.get(r.countryCode) ?? null, name: r.name, description: r.description,
      address: r.address, city: r.city, lat: r.lat, lng: r.lng, rating: r.rating, phone: r.phone,
      workingHours: r.workingHours, priceRange: r.priceRange, cuisines: r.cuisines, menu: r.menu,
    };
    let [row] = await db.select().from(restaurants).where(eq(restaurants.name, r.name));
    if (!row) { [row] = await db.insert(restaurants).values(cols as any).returning(); inserted++; }
    else { await db.update(restaurants).set(cols as any).where(eq(restaurants.id, row.id)); updated++; }
    await db.insert(restaurantTranslations).values({ restaurantId: row.id, locale: "ar", name: r.ar.name, description: r.ar.description })
      .onConflictDoUpdate({ target: [restaurantTranslations.restaurantId, restaurantTranslations.locale], set: { name: r.ar.name, description: r.ar.description } });
  }
  console.log(`✓ restaurants seed: ${inserted} new, ${updated} updated (${RESTAURANTS.length}) + ar`);
}

if (process.argv[1]?.includes("restaurants.seed")) {
  seedRestaurants().then(() => pool.end()).then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
}
