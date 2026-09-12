import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  // eslint-disable-next-line no-console
  console.error(
    "Variables VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY manquantes. " +
    "L'application fonctionnera mais rien ne sera persisté."
  );
}

export const supabase = url && key ? createClient(url, key) : null;

const TABLES = ["parcelles", "cartes", "dossiers", "baux", "encaissements", "audit"];

// Charge toutes les tables. Si une table est vide (premier lancement),
// on la peuple avec les données de départ fournies, pour ne jamais
// démarrer sur un écran vide.
export async function loadAll(seeds) {
  const result = {};
  for (const table of TABLES) {
    if (!supabase) {
      result[table] = seeds[table];
      continue;
    }
    const { data, error } = await supabase.from(table).select("id, data");
    if (error) {
      console.error(`Erreur de chargement (${table}) :`, error.message);
      result[table] = seeds[table];
      continue;
    }
    if (!data || data.length === 0) {
      const seedRows = seeds[table].map((row) => ({ id: String(row.id), data: row }));
      if (seedRows.length > 0) {
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

// Synchronise l'intégralité d'une collection vers Supabase (upsert de
// chaque ligne). Appelé automatiquement à chaque changement d'état — voir
// les useEffect dans App.jsx. Best-effort : une erreur réseau n'interrompt
// jamais l'interface, elle est seulement journalisée dans la console.
export async function syncTable(table, rows) {
  if (!supabase || rows.length === 0) return;
  const payload = rows.map((row) => ({ id: String(row.id), data: row, updated_at: new Date().toISOString() }));
  const { error } = await supabase.from(table).upsert(payload);
  if (error) console.error(`Erreur de synchronisation (${table}) :`, error.message);
}

export async function chargerMonProfil() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select("role, compte_id, nom_complet, parent_id")
    .eq("id", user.id)
    .single();
  if (error) return null;
  return data;
}
