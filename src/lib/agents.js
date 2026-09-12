import { supabase } from "./db";

export async function chargerMesAgents(parentId) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, role, nom_complet, compte_id, created_at")
    .eq("parent_id", parentId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function creerAgent(email, password, nom, role) {
  const { data, error } = await supabase.rpc("creer_agent_banque", {
    p_email: email,
    p_password: password,
    p_nom: nom,
    p_role: role,
  });
  if (error) throw error;
  return data;
}
