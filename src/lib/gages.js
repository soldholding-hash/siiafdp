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
