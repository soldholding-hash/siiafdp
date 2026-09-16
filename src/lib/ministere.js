import { supabase } from "./db";

export async function validerParcelleMinistere(parcelleId) {
  const { data, error } = await supabase.rpc("valider_parcelle_ministere", {
    p_parcelle_id: parcelleId,
  });
  if (error) throw error;
  return data;
}
