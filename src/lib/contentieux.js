import { supabase } from "./db";

export async function signalerImpaye(parcelleId, motif, description) {
  const { data, error } = await supabase.rpc("signaler_impaye", {
    p_parcelle_id: parcelleId,
    p_motif: motif,
    p_description: description,
  });
  if (error) throw error;
  return data;
}

export async function chargerMesContentieux(banqueId) {
  const { data, error } = await supabase
    .from("contentieux")
    .select("*")
    .eq("banque_id", banqueId)
    .order("date_signalement", { ascending: false });
  if (error) throw error;
  return data || [];
}
