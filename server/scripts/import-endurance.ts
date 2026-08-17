// Import the Endurance Program into a Nafas account via the deployed API.
//
//   NAFAS_API=https://nafas-kxm7.onrender.com \
//   NAFAS_EMAIL=you@example.com NAFAS_PASSWORD='...' \
//   npx tsx server/scripts/import-endurance.ts
//
// Or skip login by passing a token directly:
//   NAFAS_API=... NAFAS_TOKEN='<accessToken>' npx tsx server/scripts/import-endurance.ts
//
// Idempotent: the program has a fixed id, so a re-run PATCHes (replaces days)
// instead of creating a duplicate.
import { enduranceProgram } from "./endurance-program";

const API = (process.env.NAFAS_API || "https://nafas-kxm7.onrender.com").replace(/\/$/, "");

async function j(path: string, init: RequestInit & { token?: string } = {}) {
  const { token, ...rest } = init;
  const res = await fetch(`${API}/api${path}`, {
    ...rest,
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(rest.headers || {}),
    },
  });
  const text = await res.text();
  let body: any = text;
  try { body = JSON.parse(text); } catch {}
  if (!res.ok) throw new Error(`${init.method || "GET"} ${path} → ${res.status} ${typeof body === "string" ? body : JSON.stringify(body)}`);
  return body;
}

async function main() {
  let token = process.env.NAFAS_TOKEN;
  if (!token) {
    const email = process.env.NAFAS_EMAIL;
    const password = process.env.NAFAS_PASSWORD;
    if (!email || !password) throw new Error("Set NAFAS_TOKEN, or NAFAS_EMAIL + NAFAS_PASSWORD");
    const auth = await j("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
    token = auth.accessToken;
    console.log(`logged in as ${auth.user?.email ?? email} (${auth.user?.id})`);
  }

  const existing = await j("/programs", { token });
  const already = (existing.data || []).some((p: any) => p.id === enduranceProgram.id);

  const saved = already
    ? await j(`/programs/${enduranceProgram.id}`, { method: "PATCH", token, body: JSON.stringify(enduranceProgram) })
    : await j("/programs", { method: "POST", token, body: JSON.stringify(enduranceProgram) });

  const days = (saved.days || []).length;
  console.log(`${already ? "updated" : "created"} "${saved.name}" — id ${saved.id}, ${saved.weeks} weeks, ${days} days`);
}

main().catch((e) => { console.error(String(e.message || e)); process.exit(1); });
