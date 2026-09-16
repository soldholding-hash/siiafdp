import { supabase } from "./db";

export async function poserGelSQL(parcelleId, tribunalId, magistrat, motif, reference) {
  const { data, error } = await supabase.rpc("poser_gel", {
    p_parcelle_id: parcelleId,
    p_tribunal_id: tribunalId,
    p_magistrat: magistrat,
    p_motif: motif,
    p_reference: reference,
  });
  if (error) throw error;
  return data;
}

export async function leverGelSQL(parcelleId, tribunalId) {
  const { data, error } = await supabase.rpc("lever_gel", {
    p_parcelle_id: parcelleId,
    p_tribunal_id: tribunalId,
  });
  if (error) throw error;
  return data;
}

export async function listerGelsActifs() {
  const { data, error } = await supabase.rpc("lister_gels_actifs");
  if (error) throw error;
  return data || [];
}
