// Direct-DB import of the Endurance Program, run against whatever DATABASE_URL
// is in the environment (set it inline to target prod). Looks the account up by
// email, upserts the program under that userId, and — if NAFAS_NEWPASS is set —
// resets that account's password. No secrets are baked in; pass them as env:
//
//   DATABASE_URL='postgresql://…' NAFAS_EMAIL='you@x.com' NAFAS_NEWPASS='…' \
//     npx tsx server/scripts/db-import-endurance.ts
//
// Idempotent: fixed program id → re-run replaces days instead of duplicating.
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, pool } from "../core/db";
import { users } from "../modules/identity/identity.db";
import { programs } from "../modules/programs/programs.db";
import { programsService } from "../modules/programs/programs.service";
import { enduranceProgram } from "./endurance-program";

async function main() {
  const email = (process.env.NAFAS_EMAIL || "").toLowerCase();
  if (!email) throw new Error("Set NAFAS_EMAIL");

  const [user] = await db.select().from(users).where(eq(users.email, email));
  if (!user) throw new Error(`No account for ${email}`);
  console.log(`account: ${user.email} (${user.id})`);

  const [existing] = await db.select().from(programs).where(eq(programs.id, enduranceProgram.id));
  const saved = existing
    ? await programsService.update(user.id, enduranceProgram.id, enduranceProgram)
    : await programsService.create(user.id, enduranceProgram);
  console.log(`${existing ? "updated" : "created"} "${saved?.name}" — ${saved?.weeks} weeks, ${saved?.days.length} days`);

  const newPass = process.env.NAFAS_NEWPASS;
  if (newPass) {
    const passwordHash = await bcrypt.hash(newPass, 10);
    await db.update(users).set({ passwordHash }).where(eq(users.id, user.id));
    console.log(`password reset for ${user.email}`);
  }
}

main()
  .then(() => pool.end())
  .catch((e) => { console.error(String(e.message || e)); pool.end(); process.exit(1); });
