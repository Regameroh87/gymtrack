import { supabase } from "../../database/supabase.js";

// Usuarios de prueba sembrados en Supabase (auth.users + profiles + memberships
// en "Gym de Prueba"). Solo tienen contraseña en la DB de desarrollo; en builds
// de producción __DEV__ es false y nada de esto se renderiza ni se ejecuta.
export const DEV_PASSWORD = "dev123456";

export const DEV_USERS = [
  { label: "Owner", email: "dev-owner@test.com" },
  { label: "Admin", email: "dev-admin@test.com" },
  { label: "Coach", email: "dev-coach@test.com" },
  { label: "Member", email: "dev-member@test.com" },
];

export async function devSignIn(email) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: DEV_PASSWORD,
  });
  if (error) throw error;
  return data;
}
