import { supabase } from "./db";

export async function chargerTableauBord(compteId) {
  const { data, error } = await supabase.rpc("tableau_de_bord_banque", {
    p_banque_id: compteId,
  });
  if (error) throw error;
  return data;
}
