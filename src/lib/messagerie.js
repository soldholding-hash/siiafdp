import { supabase } from "./db";

// ============================================
// ENVOYER UN MESSAGE
// ============================================

export async function envoyerMessage({
  sujet, corps, type = "message", priorite = "normale",
  destinataires = [],  // array de { user_id?, role?, compte_id? }
  reference_dossier = null,
  reference_parcelle = null,
  reference_entite = null,
}) {
  const { data, error } = await supabase.rpc("envoyer_message", {
    p_sujet: sujet,
    p_corps: corps,
    p_type: type,
    p_priorite: priorite,
    p_destinataires: destinataires,
    p_reference_dossier: reference_dossier,
    p_reference_parcelle: reference_parcelle,
    p_reference_entite: reference_entite,
  });
  if (error) return { ok: false, raison: error.message };
  return data;
}

// ============================================
// LIRE LA BOÎTE DE RÉCEPTION
// ============================================

export async function listerMessagesRecus(filtre = "tous", roleForce = null) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  // Rôle : priorité au rôle passé en paramètre (depuis USERS en dur)
  let role = roleForce;
  if (!role) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    role = profile?.role;
  }

  // Récupérer TOUS les destinataires visibles, on filtrera en JS
  let query = supabase
    .from("message_destinataires")
    .select(`
      id, lu, lu_le, supprime, created_at,
      destinataire_id, destinataire_role,
      messages (
        id, expediteur_nom, expediteur_role, sujet, corps,
        type, priorite, reference_dossier, reference_parcelle,
        reference_entite, created_at
      )
    `)
    .eq("supprime", false);

  if (filtre === "non_lus") query = query.eq("lu", false);

  const { data, error } = await query.order("created_at", { ascending: false });
  if (error) { console.error(error); return []; }

  // ✅ Filtrer en JS : role OU user_id correspond
  const filtres = (data || []).filter((d) => {
    if (!d.messages) return false;
    if (d.destinataire_id === user.id) return true;
    if (role && d.destinataire_role === role) return true;
    return false;
  });

  return filtres.map((d) => ({ ...d.messages, _dest_id: d.id, lu: d.lu }));
}

export async function listerMessagesEnvoyes() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("expediteur_id", user.id)
    .order("created_at", { ascending: false });
  if (error) { console.error(error); return []; }
  return data || [];
}

// ============================================
// MARQUER COMME LU
// ============================================

export async function marquerMessageLu(destinataireId) {
  const { error } = await supabase
    .from("message_destinataires")
    .update({ lu: true, lu_le: new Date().toISOString() })
    .eq("id", destinataireId);
  if (error) return { ok: false, raison: error.message };
  return { ok: true };
}

export async function supprimerMessage(destinataireId) {
  const { error } = await supabase
    .from("message_destinataires")
    .update({ supprime: true })
    .eq("id", destinataireId);
  if (error) return { ok: false, raison: error.message };
  return { ok: true };
}

// ============================================
// COMPTER LES NON LUS
// ============================================

export async function compterMessagesNonLus() {
  const { data, error } = await supabase.rpc("compter_messages_non_lus");
  if (error) { console.error(error); return 0; }
  return data || 0;
}

// ============================================
// ANNEXES : upload de pièce jointe
// ============================================

export async function uploaderPieceJointe(file, messageId) {
  if (!file) return { ok: false, raison: "Aucun fichier" };
  const ext = file.name.split(".").pop();
  const path = `messages/${messageId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage
    .from("huissier-documents")
    .upload(path, file, { upsert: false });
  if (error) return { ok: false, raison: error.message };
  const { data: urlData } = supabase.storage
    .from("huissier-documents")
    .getPublicUrl(path);

  // Enregistrer en base
  await supabase.from("pieces_jointes_messages").insert({
    message_id: messageId,
    nom_fichier: file.name,
    url: urlData?.publicUrl,
    taille_octets: file.size,
    type_mime: file.type,
  });

  return { ok: true, url: urlData?.publicUrl };
}
