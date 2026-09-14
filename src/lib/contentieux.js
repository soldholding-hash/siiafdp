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

export async function chargerTousContentieux() {
  const { data, error } = await supabase
    .from("contentieux")
    .select("*")
    .order("date_signalement", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function instruireContentieux(contentieuxId, decision, commentaire) {
  const { data, error } = await supabase.rpc("instruire_contentieux", {
    p_contentieux_id: contentieuxId,
    p_decision: decision,
    p_commentaire: commentaire,
  });
  if (error) throw error;
  return data;
}

export async function chargerContentieuxTribunal() {
  const { data, error } = await supabase
    .from("contentieux")
    .select("*")
    .in("statut", ["transmis_tribunal", "juge", "clos"])
    .order("date_transmission_tribunal", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function rendreJugement(contentieuxId, decision, reference, motivation) {
  const { data, error } = await supabase.rpc("rendre_jugement", {
    p_contentieux_id: contentieuxId,
    p_decision: decision,
    p_reference_jugement: reference,
    p_motivation: motivation,
  });
  if (error) throw error;
  return data;
}
