import { supabase } from "./db";

export const TARIFS = {
  consultation_banque: 2000,
  gage: 100000,
  mainlevee: 0,
  gel: 100000,
  levee_gel: 0,
  acte_notarie: 5000,
  consultation_notaire: 2000,
};

export async function chargerComptes() {
  const { data, error } = await supabase.from("comptes").select("*").order("nom");
  if (error) throw error;
  return data;
}

export async function chargerMouvements(compteId) {
  const { data, error } = await supabase
    .from("mouvements")
    .select("*")
    .eq("compte_id", compteId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function recharger(compteId, montant, note) {
  const { error } = await supabase.from("mouvements").insert({
    compte_id: compteId,
    type: "recharge",
    libelle: note || "Recharge",
    montant: Math.abs(Number(montant)),
  });
  if (error) throw error;
}

export async function consommer(compteId, service, libelle) {
  const montant = TARIFS[service];
  if (montant === undefined) throw new Error("Service inconnu : " + service);
  const { error } = await supabase.from("mouvements").insert({
    compte_id: compteId,
    type: service,
    libelle: libelle || service,
    montant: -Math.abs(montant),
  });
  if (error) throw error;
  return montant;
}
