import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, pool } from "../../core/db";
import { users, coachProfiles } from "../identity/identity.db";
import { countries } from "../countries/countries.db";

type Seed = {
  name: string; username: string; email: string; bio: string;
  countryCode: string; avatarUrl: string;
  headline: string; specialty: string[]; certifications: string[]; yearsExperience: number;
  rating: number; reviewsCount: number; clientsCount: number;
  price: { amount: number; currency: string }; verified: boolean; featured: boolean;
  socialLinks: Record<string, string>;
};

const COACHES: Seed[] = [
  {
    name: "Khalid Mansour", username: "khalid_coach", email: "khalid@nafas.app",
    bio: "10 years coaching calisthenics & CrossFit. Helped 200+ athletes hit their movement goals.",
    countryCode: "JO", avatarUrl: "https://i.pravatar.cc/150?img=11",
    headline: "Calisthenics & CrossFit Coach", specialty: ["calisthenics", "crossfit"],
    certifications: ["ACE Certified Personal Trainer", "CrossFit Level 2"], yearsExperience: 10,
    rating: 4.8, reviewsCount: 94, clientsCount: 48, price: { amount: 25, currency: "JOD" },
    verified: true, featured: true, socialLinks: { instagram: "@khalid_cali" },
  },
  {
    name: "Fatima Al-Zahra", username: "fatima_coach", email: "fatima@nafas.app",
    bio: "Strength & nutrition coach focused on sustainable body recomposition for women and men.",
    countryCode: "JO", avatarUrl: "https://i.pravatar.cc/150?img=45",
    headline: "Strength & Nutrition Coach", specialty: ["strength", "nutrition"],
    certifications: ["NASM-CPT", "Precision Nutrition L1"], yearsExperience: 7,
    rating: 4.7, reviewsCount: 61, clientsCount: 33, price: { amount: 30, currency: "JOD" },
    verified: true, featured: false, socialLinks: { instagram: "@coach_fatima" },
  },
  {
    name: "Omar Haddad", username: "omar_coach", email: "omar@nafas.app",
    bio: "Olympic weightlifting and powerlifting specialist. Technique-first programming.",
    countryCode: "JO", avatarUrl: "https://i.pravatar.cc/150?img=12",
    headline: "Weightlifting Coach", specialty: ["powerlifting", "olympic"],
    certifications: ["IWF Level 1", "Strength & Conditioning BSc"], yearsExperience: 8,
    rating: 4.6, reviewsCount: 40, clientsCount: 21, price: { amount: 28, currency: "JOD" },
    verified: true, featured: false, socialLinks: {},
  },
];

export async function seedCoaches() {
  const cs = await db.select().from(countries);
  const byCode = new Map(cs.map((c) => [c.code, c.id]));
  const passwordHash = await bcrypt.hash("pass1234", 10);
  let users_n = 0, profiles_n = 0;
  for (const c of COACHES) {
    let [u] = await db.select().from(users).where(eq(users.email, c.email));
    if (!u) {
      [u] = await db.insert(users).values({
        name: c.name, username: c.username, email: c.email, passwordHash, role: "coach",
        countryId: byCode.get(c.countryCode) ?? null, avatarUrl: c.avatarUrl, bio: c.bio,
        emailVerifiedAt: new Date(), profileComplete: true,
      }).returning();
      users_n++;
    } else {
      await db.update(users).set({ role: "coach", bio: c.bio, avatarUrl: c.avatarUrl, countryId: byCode.get(c.countryCode) ?? null }).where(eq(users.id, u.id));
    }
    const prof = {
      userId: u.id, headline: c.headline, specialty: c.specialty, certifications: c.certifications,
      yearsExperience: c.yearsExperience, rating: c.rating, reviewsCount: c.reviewsCount, clientsCount: c.clientsCount,
      pricePerSession: c.price, verificationStatus: (c.verified ? "verified" : "pending") as any, isFeatured: c.featured, socialLinks: c.socialLinks,
    };
    const [exists] = await db.select().from(coachProfiles).where(eq(coachProfiles.userId, u.id));
    if (exists) await db.update(coachProfiles).set(prof as any).where(eq(coachProfiles.userId, u.id));
    else { await db.insert(coachProfiles).values(prof as any); profiles_n++; }
  }
  console.log(`✓ coaches seed: ${users_n} new coach users, ${profiles_n} new profiles (${COACHES.length} total)`);
}

if (process.argv[1]?.includes("coaches.seed")) {
  seedCoaches().then(() => pool.end()).then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
}
