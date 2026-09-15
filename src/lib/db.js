import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error(
    "Variables VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY manquantes. " +
    "L'application fonctionnera mais rien ne sera persisté."
  );
}

export const supabase = url && key ? createClient(url, key) : null;

const TABLES = ["parcelles", "cartes", "dossiers", "baux", "encaissements", "audit"];

export async function loadAll(seeds, tenantId) {
  const result = {};
  for (const table of TABLES) {
    if (!supabase) {
      result[table] = seeds[table];
      continue;
    }
    let query = supabase.from(table).select("id, data");
    if (tenantId) query = query.eq("tenant_id", tenantId);
    const { data, error } = await query;
    if (error) {
      console.error(`Erreur de chargement (${table}) :`, error.message);
      result[table] = seeds[table];
      continue;
    }
    if (!data || data.length === 0) {
      // Amorce uniquement si on a un tenant
      if (tenantId && seeds[table] && seeds[table].length > 0) {
        const seedRows = seeds[table].map((row) => ({
          id: String(row.id),
          tenant_id: tenantId,
          data: row,
        }));
        const { error: seedError } = await supabase.from(table).insert(seedRows);
        if (seedError) console.error(`Erreur d'amorçage (${table}) :`, seedError.message);
      }
      result[table] = seeds[table];
    } else {
      result[table] = data.map((row) => row.data);
    }
  }
  return result;
}

export async function syncTable(table, rows, tenantId) {
  if (!supabase || rows.length === 0) return;
  if (!tenantId) {
    console.warn(`syncTable(${table}) ignoré : tenantId manquant`);
    return;
  }
  const payload = rows.map((row) => ({
    id: String(row.id),
    tenant_id: tenantId,
    data: row,
    updated_at: new Date().toISOString(),
  }));
  const { error } = await supabase.from(table).upsert(payload);
  if (error) console.error(`Erreur de synchronisation (${table}) :`, error.message);
}

export async function chargerMonProfil() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select("role, compte_id, nom_complet, parent_id, tenant_id")
    .eq("id", user.id)
    .single();
  if (error) return null;
  return data;
}

export async function chargerMonProfilParId(userId) {
  if (!userId) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select("role, compte_id, nom_complet, parent_id, tenant_id")
    .eq("id", userId)
    .single();
  if (error) { console.error("Erreur profil :", error.message); return null; }
  return data;
}
