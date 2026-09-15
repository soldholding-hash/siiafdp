import { supabase } from "./db";

export async function creerParcelleTerrain(bornes, distances, surfaceM2, arrondissement) {
  const { data, error } = await supabase.rpc("creer_parcelle_terrain", {
    p_bornes: bornes,
    p_distances: distances,
    p_surface_m2: Number(surfaceM2),
    p_arrondissement: arrondissement || "Non défini",
  });
  if (error) throw error;
  return data;
}
