import { supabase } from "./db";

export async function poserGageSQL(parcelleId, banqueId, banqueNom, montant, dossierCredit) {
  const { data, error } = await supabase.rpc("poser_gage", {
    p_parcelle_id: parcelleId,
    p_banque_id: banqueId,
    p_banque_nom: banqueNom,
    p_montant: Number(montant),
    p_dossier: dossierCredit,
  });
  if (error) throw error;
  return data;
}

export async function leverGageSQL(parcelleId, banqueId) {
  const { data, error } = await supabase.rpc("lever_gage", {
    p_parcelle_id: parcelleId,
    p_banque_id: banqueId,
  });
  if (error) throw error;
  return data;
}

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

export async function enregistrerConsultation(banqueId, parcelleId, carteId, resultat) {
  const { error } = await supabase.from("consultations").insert({
    banque_id: banqueId,
    parcelle_id: parcelleId || null,
    carte_id: carteId || null,
    resultat: resultat || null,
  });
  if (error) throw error;
}

export async function chargerGagesActifs(banqueId) {
  const { data, error } = await supabase
    .from("gages")
    .select("*")
    .eq("banque_id", banqueId)
    .eq("statut", "actif")
    .order("date_pose", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function prolongerGageSQL(parcelleId, banqueId, moisSup) {
  const { data, error } = await supabase.rpc("prolonger_gage", {
    p_parcelle_id: parcelleId,
    p_banque_id: banqueId,
    p_mois_sup: Number(moisSup),
  });
  if (error) throw error;
  return data;
}

export async function realiserGageSQL(parcelleId, banqueId, motif) {
  const { data, error } = await supabase.rpc("realiser_gage", {
    p_parcelle_id: parcelleId,
    p_banque_id: banqueId,
    p_motif: motif,
  });
  if (error) throw error;
  return data;
}

export async function chargerAlertesEcheance() {
  const { data, error } = await supabase.rpc("notifier_echeances");
  if (error) throw error;
  return data || [];
}
