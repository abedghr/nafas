import { drizzle } from "drizzle-orm/node-postgres";
import { Pool, types } from "pg";
import { env } from "./env";
import * as schema from "./schema";

// Postgres NUMERIC (OID 1700) comes back as a string by default → client code
// that sums with `+` string-concatenates. Parse to float at the driver level so
// the API contract always returns real numbers. (Money/volumes here fit in f64.)
types.setTypeParser(1700, (v: string) => (v === null ? null : parseFloat(v)));

export const pool = new Pool({ connectionString: env.DATABASE_URL });
export const db = drizzle(pool, { schema });
