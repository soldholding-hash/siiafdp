import { supabase } from "./db";

// ============================================
// PROFIL HUISSIER
// ============================================

export async function chargerMonProfilHuissier() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from("huissiers")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) { console.error(error); return null; }
  return data;
}

// ============================================
// MESURES CONSERVATOIRES (table existante)
// ============================================

export async function listerMesuresConservatoires(huissierId) {
  if (!huissierId) return [];
  const { data, error } = await supabase
    .from("mesures_conservatoires")
    .select("*")
    .eq("huissier_id", huissierId)
    .order("date_pose", { ascending: false });
  if (error) { console.error(error); return []; }
  return data || [];
}

export async function poserMesureConservatoire(payload) {
  const { data, error } = await supabase
    .from("mesures_conservatoires")
    .insert(payload)
    .select()
    .single();
  if (error) return { ok: false, raison: error.message };
  return { ok: true, mesure: data };
}

export async function leverMesureConservatoire(id, motifLevee) {
  const { error } = await supabase
    .from("mesures_conservatoires")
    .update({ statut: "levee", date_levee: new Date().toISOString() })
    .eq("id", id);
  if (error) return { ok: false, raison: error.message };
  return { ok: true };
}

// ============================================
// COMMANDEMENTS
// ============================================

export async function listerMesCommandements(huissierId) {
  if (!huissierId) return [];
  const { data, error } = await supabase
    .from("commandements")
    .select("*")
    .eq("huissier_id", huissierId)
    .order("date_commandement", { ascending: false });
  if (error) { console.error(error); return []; }
  return data || [];
}

export async function creerCommandement(payload) {
  const { data, error } = await supabase
    .from("commandements")
    .insert(payload)
    .select()
    .single();
  if (error) return { ok: false, raison: error.message };
  return { ok: true, commandement: data };
}

// ============================================
// SÉQUESTRES
// ============================================

export async function chargerMonCompteSequestre(huissierId) {
  if (!huissierId) return null;
  const { data, error } = await supabase
    .from("compte_sequestre")
    .select("*")
    .eq("huissier_id", huissierId)
    .maybeSingle();
  if (error) { console.error(error); return null; }
  return data;
}

export async function listerMouvementsSequestre(compteId) {
  if (!compteId) return [];
  const { data, error } = await supabase
    .from("transactions_sequestre")
    .select("*")
    .eq("compte_id", compteId)
    .order("id", { ascending: false });
  if (error) { console.error(error); return []; }
  return data || [];
}

export async function enregistrerMouvementSequestre(payload) {
  const { data, error } = await supabase
    .from("transactions_sequestre")
    .insert(payload)
    .select()
    .single();
  if (error) return { ok: false, raison: error.message };
  return { ok: true, mouvement: data };
}

// ============================================
// VENTES AUX ENCHÈRES
// ============================================

export async function listerMesVentes(huissierId) {
  if (!huissierId) return [];
  const { data, error } = await supabase
    .from("ventes_encheres")
    .select("*")
    .eq("huissier_id", huissierId)
    .order("date_criee", { ascending: false });
  if (error) { console.error(error); return []; }
  return data || [];
}

export async function publierVenteEncheres(payload) {
  const { data, error } = await supabase
    .from("ventes_encheres")
    .insert(payload)
    .select()
    .single();
  if (error) return { ok: false, raison: error.message };
  return { ok: true, vente: data };
}

export async function enregistrerAdjudication(payload) {
  const { data, error } = await supabase
    .from("adjudications")
    .insert(payload)
    .select()
    .single();
  if (error) return { ok: false, raison: error.message };
  return { ok: true, adjudication: data };
}

// ============================================
// CONSTATS
// ============================================

export async function listerMesConstats(huissierId) {
  if (!huissierId) return [];
  const { data, error } = await supabase
    .from("constats_huissier")
    .select("*")
    .eq("huissier_id", huissierId)
    .order("date_constat", { ascending: false });
  if (error) { console.error(error); return []; }
  return data || [];
}

export async function deposerConstat(payload) {
  const { data, error } = await supabase
    .from("constats_huissier")
    .insert(payload)
    .select()
    .single();
  if (error) return { ok: false, raison: error.message };
  return { ok: true, constat: data };
}

// ============================================
// KPI DASHBOARD
// ============================================

export async function chargerKpiHuissier(huissierId) {
  if (!huissierId) return { mesures: 0, commandements: 0, ventes: 0, constats: 0, sequestre: 0 };
  const [m, c, v, co, s] = await Promise.all([
    supabase.from("mesures_conservatoires").select("id", { count: "exact", head: true }).eq("huissier_id", huissierId),
    supabase.from("commandements").select("id", { count: "exact", head: true }).eq("huissier_id", huissierId),
    supabase.from("ventes_encheres").select("id", { count: "exact", head: true }).eq("huissier_id", huissierId),
    supabase.from("constats_huissier").select("id", { count: "exact", head: true }).eq("huissier_id", huissierId),
    supabase.from("compte_sequestre").select("solde_disponible").eq("huissier_id", huissierId).maybeSingle(),
  ]);
  return {
    mesures: m.count || 0,
    commandements: c.count || 0,
    ventes: v.count || 0,
    constats: co.count || 0,
    sequestre: s.data?.solde_disponible || 0,
  };
}

// ============================================
// NOTIFICATION & DOCUMENTS
// ============================================

export async function uploaderDocumentHuissier(file, prefix) {
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

export async function notifierCommandement(commandementId, payload) {
  const { data, error } = await supabase
    .from("commandements")
    .update({
      statut: "notifie",
      notifie_le: new Date().toISOString(),
      notifie_a: payload.notifie_a,
      mode_notification: payload.mode_notification,
      document_notification_url: payload.document_pdf_url,
      observation: payload.observation || null,
    })
    .eq("id", commandementId)
    .select()
    .single();
  if (error) return { ok: false, raison: error.message };
  return { ok: true, commandement: data };
}

// ============================================
// CERTIFICATS D'HUISSIER
// ============================================

export async function enregistrerCertificat(commandementId, certificatUrl, hash) {
  const { data, error } = await supabase
    .from("commandements")
    .update({
      certificat_url: certificatUrl,
      certificat_hash: hash,
      certificat_delivre_le: new Date().toISOString(),
    })
    .eq("id", commandementId)
    .select()
    .single();
  if (error) return { ok: false, raison: error.message };
  return { ok: true, commandement: data };
}

export async function uploaderBlobHuissier(blob, prefix) {
  const path = `${prefix}/${Date.now()}-certificat.pdf`;
  const { error } = await supabase.storage
    .from("huissier-documents")
    .upload(path, blob, { upsert: false, contentType: "application/pdf" });
  if (error) return { ok: false, raison: error.message };
  const { data: urlData } = supabase.storage
    .from("huissier-documents")
    .getPublicUrl(path);
  return { ok: true, path, url: urlData?.publicUrl };
}

// ============================================
// CIRCUIT TGI — Soumission & décision
// ============================================

export async function soumettreAuTGI(commandementId, payload) {
  const { data, error } = await supabase
    .from("commandements")
    .update({
      statut: "soumis_tgi",
      soumis_tgi_le: new Date().toISOString(),
    })
    .eq("id", commandementId)
    .select()
    .single();
  if (error) return { ok: false, raison: error.message };

  await supabase.from("circuit_commandements").insert({
    commandement_id: commandementId,
    acteur_id: payload.acteur_id,
    acteur_nom: payload.acteur_nom,
    role_acteur: "huissier",
    action: "soumission_tgi",
    details: payload.observation || null,
  });

  return { ok: true, commandement: data };
}

export async function chargerCircuit(commandementId) {
  const { data, error } = await supabase
    .from("circuit_commandements")
    .select("*")
    .eq("commandement_id", commandementId)
    .order("created_at", { ascending: true });
  if (error) return [];
  return data || [];
}

export async function listerDossiersTGI(statutFiltre = "soumis_tgi") {
  const { data, error } = await supabase
    .from("commandements")
    .select("*")
    .eq("statut", statutFiltre)
    .order("soumis_tgi_le", { ascending: true });
  if (error) { console.error(error); return []; }
  return data || [];
}

export async function deciderTGI(commandementId, payload) {
  const nouveauStatut = 
    payload.decision === "approuve" ? "autorise"
    : payload.decision === "rejete" ? "rejete"
    : "complement_requis";

  const { data, error } = await supabase
    .from("commandements")
    .update({
      statut: nouveauStatut,
      decision_tgi: payload.decision,
      decision_tgi_le: new Date().toISOString(),
      magistrat_tgi: payload.magistrat,
      motif_tgi: payload.motif || null,
    })
    .eq("id", commandementId)
    .select()
    .single();
  if (error) return { ok: false, raison: error.message };

  await supabase.from("circuit_commandements").insert({
    commandement_id: commandementId,
    acteur_id: payload.acteur_id,
    acteur_nom: payload.acteur_nom,
    role_acteur: "tgi",
    action: "decision_tgi",
    details: payload.decision,
    motif: payload.motif || null,
  });

  return { ok: true, commandement: data };
}

// ============================================
// URL SIGNÉES pour ouvrir les documents privés
// ============================================

export async function getSignedUrl(path, expireSecondes = 3600) {
  if (!path) return null;
  // Si on a déjà une URL complète, on extrait juste le chemin interne
  let storagePath = path;
  if (path.includes("/huissier-documents/")) {
    storagePath = path.split("/huissier-documents/")[1];
    // Retirer les query params si présents
    storagePath = storagePath.split("?")[0];
  }
  const { data, error } = await supabase.storage
    .from("huissier-documents")
    .createSignedUrl(storagePath, expireSecondes);
  if (error) { console.error(error); return null; }
  return data?.signedUrl || null;
}

export async function uploaderOrdonnanceTGI(commandementId, file, prefix) {
  if (!file) return { ok: false, raison: "Aucun fichier" };
  const ext = file.name.split(".").pop();
  const path = `${prefix}/${commandementId}-ordonnance-${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from("huissier-documents")
    .upload(path, file, { upsert: false });
  if (error) return { ok: false, raison: error.message };
  const { data: urlData } = supabase.storage
    .from("huissier-documents")
    .getPublicUrl(path);
  return { ok: true, path, url: urlData?.publicUrl };
}

export async function enregistrerOrdonnance(commandementId, ordonnanceUrl) {
  const { data, error } = await supabase
    .from("commandements")
    .update({ ordonnance_tgi_url: ordonnanceUrl })
    .eq("id", commandementId)
    .select()
    .single();
  if (error) return { ok: false, raison: error.message };
  return { ok: true, commandement: data };
}
