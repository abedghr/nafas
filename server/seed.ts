import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, pool } from "./core/db";
import { users } from "./modules/identity/identity.db";
import { countries } from "./modules/countries/countries.db";
import { countriesService } from "./modules/countries/countries.service";

// Seeds reference data: countries (Jordan + KSA) and one admin user.
async function main() {
  await countriesService.seed();
  console.log("✓ countries seeded (Jordan, KSA)");

  const adminEmail = process.env.ADMIN_EMAIL || "admin@nafas.app";
  const adminPass = process.env.ADMIN_PASSWORD || "admin12345";
  const [existing] = await db.select().from(users).where(eq(users.email, adminEmail));
  if (!existing) {
    const [jo] = await db.select().from(countries).where(eq(countries.code, "JO"));
    await db.insert(users).values({
      name: "Nafas Admin",
      username: "admin",
      email: adminEmail,
      passwordHash: await bcrypt.hash(adminPass, 10),
      role: "admin",
      countryId: jo?.id,
      emailVerifiedAt: new Date(),
      profileComplete: true,
    });
    console.log(`✓ admin user created: ${adminEmail} / ${adminPass}`);
  } else {
    console.log(`• admin user already exists: ${adminEmail}`);
  }

  await pool.end();
  process.exit(0);
}

main().catch((e) => {
  console.error("seed failed:", e);
  process.exit(1);
});
