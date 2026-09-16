import { supabase } from "./db";

// ============================================
// ANNUAIRE HUISSIERS (accessible aux banques)
// ============================================

export async function listerHuissiersActifs(filtreDepartement = null) {
  let query = supabase
    .from("huissiers")
    .select("id, code_siiafdp, nom_complet, numero_etude, juridiction_rattachement, departement, telephone, email_pro, numero_agrement, habilitation_sigef, actif")
    .eq("actif", true);
  if (filtreDepartement) query = query.eq("departement", filtreDepartement);
  const { data, error } = await query.order("nom_complet");
  if (error) { console.error(error); return []; }
  return data || [];
}

export async function chercherHuissierParCode(code) {
  if (!code) return null;
  const cleanCode = code.trim().toUpperCase();
  const { data, error } = await supabase
    .from("huissiers")
    .select("*")
    .or(`code_siiafdp.eq.${cleanCode},numero_agrement.eq.${cleanCode},numero_etude.eq.${cleanCode}`)
    .eq("actif", true)
    .maybeSingle();
  if (error) { console.error(error); return null; }
  return data;
}

// ============================================
// CRÉATION DE MANDAT (Banque → Huissier)
// ============================================

export async function creerMandat(payload) {
  const { data, error } = await supabase
    .from("mandats_huissier")
    .insert({
      banque_compte_id: payload.banque_compte_id,
      banque_nom: payload.banque_nom,
      huissier_id: payload.huissier_id,
      huissier_code_siiafdp: payload.huissier_code_siiafdp,
      parcelle_id: payload.parcelle_id,
      debiteur_nom: payload.debiteur_nom,
      debiteur_nin: payload.debiteur_nin || null,
      montant_du: payload.montant_du,
      devise: payload.devise || "XAF",
      motif_dette: payload.motif_dette,
      reference_contrat: payload.reference_contrat || null,
      date_impaye_debut: payload.date_impaye_debut || null,
      contrat_url: payload.contrat_url || null,
      echeancier_url: payload.echeancier_url || null,
      mise_demeure_url: payload.mise_demeure_url || null,
      autres_pieces_url: payload.autres_pieces_url || null,
      statut: "en_attente",
    })
    .select()
    .single();
  if (error) return { ok: false, raison: error.message };
  return { ok: true, mandat: data };
}

// ============================================
// UPLOAD PIÈCES BANQUE
// ============================================

export async function uploaderPieceBanque(file, prefix) {
  if (!file) return { ok: false, raison: "Aucun fichier" };
  const ext = file.name.split(".").pop();
  const path = `${prefix}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage
    .from("huissier-documents")
    .upload(path, file, { upsert: false });
  if (error) return { ok: false, raison: error.message };
  const { data: urlData } = supabase.storage
    .from("huissier-documents")
    .getPublicUrl(path);
  return { ok: true, path, url: urlData?.publicUrl };
}

// ============================================
// CÔTÉ HUISSIER : MES MANDATS
// ============================================

export async function listerMesMandatsHuissier(huissierId, statutFiltre = null) {
  if (!huissierId) return [];
  let query = supabase
    .from("mandats_huissier")
    .select("*")
    .eq("huissier_id", huissierId);
  if (statutFiltre) query = query.eq("statut", statutFiltre);
  const { data, error } = await query.order("created_at", { ascending: false });
  if (error) { console.error(error); return []; }
  return data || [];
}

export async function deciderMandat(mandatId, decision, motif) {
  let update = {};
  if (decision === "accepte") {
    update = { statut: "accepte", accepte_le: new Date().toISOString() };
  } else if (decision === "refuse") {
    update = { statut: "refuse", refuse_le: new Date().toISOString(), motif_refus: motif };
  } else {
    update = { statut: "complement_demande", pieces_complementaires: motif };
  }
  const { data, error } = await supabase
    .from("mandats_huissier")
    .update(update)
    .eq("id", mandatId)
    .select()
    .single();
  if (error) return { ok: false, raison: error.message };
  return { ok: true, mandat: data };
}

// ============================================
// KPI MANDATS pour dashboard huissier
// ============================================

export async function compterMandatsEnAttente(huissierId) {
  if (!huissierId) return 0;
  const { count } = await supabase
    .from("mandats_huissier")
    .select("id", { count: "exact", head: true })
    .eq("huissier_id", huissierId)
    .eq("statut", "en_attente");
  return count || 0;
}
