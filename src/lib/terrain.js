import { supabase } from "./db";

export async function creerParcelleTerrain(bornes, distances, surfaceM2, arrondissement, quartier, section, lot) {
  const { data, error } = await supabase.rpc("creer_parcelle_terrain", {
    p_bornes: bornes,
    p_distances: distances,
    p_surface_m2: Number(surfaceM2),
    p_arrondissement: arrondissement || "Non défini",
    p_quartier: quartier || null,
    p_section: section || null,
    p_lot: lot || null,
  });
  if (error) throw error;
  return data;
}
