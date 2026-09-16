import { supabase } from "./db";

export async function creerProprietaire(data) {
  const { data: res, error } = await supabase.rpc("creer_proprietaire", {
    p_type: data.type,
    p_nom: data.nom,
    p_prenom: data.prenom || null,
    p_nin: data.nin || null,
    p_rccm: data.rccm || null,
    p_date_naissance: data.date_naissance || null,
    p_lieu_naissance: data.lieu_naissance || null,
    p_profession: data.profession || null,
    p_situation_matrimoniale: data.situation_matrimoniale || null,
    p_adresse: data.adresse || null,
    p_telephone: data.telephone || null,
  });
  if (error) throw error;
  return res;
}

export async function chargerProprietaires() {
  const { data, error } = await supabase
    .from("proprietaires")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function validerParcelle(parcelleId, proprietaireId) {
  const { data, error } = await supabase.rpc("valider_parcelle_technique", {
    p_parcelle_id: parcelleId,
    p_proprietaire_id: proprietaireId,
  });
  if (error) throw error;
  return data;
}
