// Test de aislamiento multi-tenant (RLS).
//
// Crea fixtures descartables (2 gyms, 1 usuario por gym, contenido en las
// tablas gym-scoped y custom) y verifica con clientes reales que:
//   1. Cada usuario VE el contenido de su gym (sanidad: la policy no es
//      tan estricta que rompa la app).
//   2. Un usuario NO ve ni puede escribir contenido del otro gym.
//   3. Un usuario NO ve el contenido custom de otro usuario.
//   4. Un cliente anónimo no lee nada (vacío o permission denied: tras el
//      hardening, los helpers de RLS no son ejecutables por anon → fail closed).
//
// Uso:  SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... SUPABASE_ANON_KEY=... \
//         node scripts/test-rls-isolation.mjs
//
// Requiere el provider email/password habilitado en Auth (los usuarios de
// prueba se crean con password vía admin API). Limpia todo al final con
// delete_gym_cascade + borrado de los usuarios auth.

import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

const URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!URL || !SERVICE_KEY || !ANON_KEY) {
  console.error(
    "Faltan env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY"
  );
  process.exit(2);
}

const noSession = { auth: { autoRefreshToken: false, persistSession: false } };
const admin = createClient(URL, SERVICE_KEY, noSession);

const RUN = randomUUID().slice(0, 8);
const PASSWORD = `rls-test-${randomUUID()}`;
const nowIso = new Date().toISOString();

// Tablas gym-scoped a verificar (las que sincroniza el cliente).
const GYM_TABLES = ["exercises_base", "equipment", "sessions", "training_plans"];

let failures = 0;
let passes = 0;

function check(ok, label, detail = "") {
  if (ok) {
    passes += 1;
    console.log(`  ✓ ${label}`);
  } else {
    failures += 1;
    console.error(`  ✗ ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

async function createUser(tag) {
  const email = `rls-${tag}-${RUN}@test.gymtrack.invalid`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
  });
  if (error) throw new Error(`createUser ${tag}: ${error.message}`);
  // El perfil puede o no crearse por trigger según el flujo; upsert idempotente.
  const { error: pErr } = await admin
    .from("profiles")
    .upsert(
      { user_id: data.user.id, email, name: `RLS ${tag}` },
      { onConflict: "user_id" }
    );
  if (pErr) throw new Error(`profile ${tag}: ${pErr.message}`);
  return { id: data.user.id, email };
}

async function createGym(tag, ownerId) {
  const { data, error } = await admin
    .from("gyms")
    .insert({
      name: `RLS Test ${tag} ${RUN}`,
      slug: `rls-test-${tag}-${RUN}`,
      owner_id: ownerId,
    })
    .select("id")
    .single();
  if (error) throw new Error(`gym ${tag}: ${error.message}`);
  return data.id;
}

async function seedGymContent(gymId, tag) {
  const rows = {
    exercises_base: {
      id: randomUUID(),
      name: `Ejercicio ${tag}`,
      category: "test",
      muscle_group: "test",
      youtube_video_url: "",
      instructions: "",
      created_at: nowIso,
      gym_id: gymId,
    },
    equipment: {
      id: randomUUID(),
      name: `Equipo ${tag}`,
      created_at: nowIso,
      gym_id: gymId,
    },
    sessions: {
      id: randomUUID(),
      name: `Sesión ${tag}`,
      gym_id: gymId,
    },
    training_plans: {
      id: randomUUID(),
      name: `Plan ${tag}`,
      created_at: nowIso,
      gym_id: gymId,
    },
  };
  const ids = {};
  for (const [table, row] of Object.entries(rows)) {
    const { error } = await admin.from(table).insert(row);
    if (error) throw new Error(`seed ${table} ${tag}: ${error.message}`);
    ids[table] = row.id;
  }
  return ids;
}

async function signIn(email) {
  const client = createClient(URL, ANON_KEY, noSession);
  const { error } = await client.auth.signInWithPassword({
    email,
    password: PASSWORD,
  });
  if (error) {
    throw new Error(
      `signInWithPassword falló (${error.message}). ¿Está habilitado el provider email/password en Auth?`
    );
  }
  return client;
}

async function main() {
  console.log(`RLS isolation test — run ${RUN}\n`);

  const state = { gyms: [], users: [] };
  try {
    // ── Fixtures ────────────────────────────────────────────────────────────
    const userA = await createUser("a");
    const userB = await createUser("b");
    state.users = [userA, userB];

    const gymA = await createGym("a", userA.id);
    const gymB = await createGym("b", userB.id);
    state.gyms = [gymA, gymB];

    for (const [user, gym] of [
      [userA, gymA],
      [userB, gymB],
    ]) {
      const { error } = await admin.from("memberships").insert({
        user_id: user.id,
        gym_id: gym,
        role: "member",
        status: "active",
      });
      if (error) throw new Error(`membership: ${error.message}`);
    }

    const idsA = await seedGymContent(gymA, "A");
    const idsB = await seedGymContent(gymB, "B");

    const customB = {
      id: randomUUID(),
      user_id: userB.id,
      name: "Custom B",
      category: "test",
      muscle_group: "test",
    };
    {
      const { error } = await admin.from("custom_exercises").insert(customB);
      if (error) throw new Error(`custom_exercises: ${error.message}`);
    }

    // ── Assertions como usuario A ──────────────────────────────────────────
    console.log("Como usuario A (miembro solo de gym A):");
    const a = await signIn(userA.email);

    for (const table of GYM_TABLES) {
      const own = await a.from(table).select("id").eq("gym_id", gymA);
      check(
        !own.error && own.data?.length === 1,
        `ve su propio ${table}`,
        own.error?.message ?? `rows=${own.data?.length}`
      );

      const foreign = await a.from(table).select("id").eq("gym_id", gymB);
      check(
        !foreign.error && foreign.data?.length === 0,
        `NO ve ${table} del gym B`,
        foreign.error?.message ?? `rows=${foreign.data?.length}`
      );

      const byId = await a.from(table).select("id").eq("id", idsB[table]);
      check(
        !byId.error && byId.data?.length === 0,
        `NO ve ${table} del gym B por id exacto`,
        byId.error?.message ?? `rows=${byId.data?.length}`
      );
    }

    // Escritura cruzada: insertar contenido en el gym B debe fallar.
    const crossInsert = await a.from("exercises_base").insert({
      id: randomUUID(),
      name: "Intruso",
      category: "test",
      muscle_group: "test",
      youtube_video_url: "",
      instructions: "",
      created_at: nowIso,
      gym_id: gymB,
    });
    check(
      Boolean(crossInsert.error),
      "NO puede insertar contenido en el gym B",
      crossInsert.error ? "" : "el insert fue aceptado"
    );

    // Update cruzado: renombrar contenido del gym B no debe afectar filas.
    const crossUpdate = await a
      .from("exercises_base")
      .update({ name: "Hackeado" })
      .eq("id", idsB.exercises_base)
      .select("id");
    check(
      Boolean(crossUpdate.error) || crossUpdate.data?.length === 0,
      "NO puede modificar contenido del gym B",
      `rows afectadas=${crossUpdate.data?.length ?? 0}`
    );

    // Custom de otro usuario.
    const foreignCustom = await a
      .from("custom_exercises")
      .select("id")
      .eq("id", customB.id);
    check(
      !foreignCustom.error && foreignCustom.data?.length === 0,
      "NO ve custom_exercises de otro usuario",
      foreignCustom.error?.message ?? `rows=${foreignCustom.data?.length}`
    );

    await a.auth.signOut();

    // ── Assertions como anónimo ────────────────────────────────────────────
    console.log("\nComo anónimo:");
    const anon = createClient(URL, ANON_KEY, noSession);
    for (const table of [...GYM_TABLES, "custom_exercises", "memberships", "profiles"]) {
      const res = await anon.from(table).select("*").limit(5);
      // Vacío o error (permission denied por el hardening): ambos son fail-closed.
      check(
        Boolean(res.error) || res.data?.length === 0,
        `anon no lee ${table}`,
        `rows=${res.data?.length ?? 0}`
      );
    }
  } finally {
    // ── Cleanup ─────────────────────────────────────────────────────────────
    console.log("\nLimpieza de fixtures…");
    for (const gymId of state.gyms) {
      const { error } = await admin.rpc("delete_gym_cascade", {
        p_gym_id: gymId,
      });
      if (error) console.error(`  cleanup gym ${gymId}: ${error.message}`);
    }
    for (const user of state.users) {
      await admin.from("custom_exercises").delete().eq("user_id", user.id);
      const { error } = await admin.auth.admin.deleteUser(user.id);
      if (error) console.error(`  cleanup user ${user.email}: ${error.message}`);
    }
  }

  console.log(`\nResultado: ${passes} OK, ${failures} fallas`);
  process.exit(failures > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(`\nError fatal: ${err.message}`);
  process.exit(1);
});
