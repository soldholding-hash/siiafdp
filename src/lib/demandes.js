import { supabase } from "./db";

// ============================================
// CRÉER UNE DEMANDE (Guichet)
// ============================================

export async function creerDemande(payload) {
  const { data, error } = await supabase
    .from("demandes")
    .insert({
      tenant_id: payload.tenant_id || null,
      demandeur_nom: payload.demandeur_nom,
      demandeur_prenom: payload.demandeur_prenom || null,
      demandeur_nin: payload.demandeur_nin || null,
      demandeur_telephone: payload.demandeur_telephone || null,
      demandeur_email: payload.demandeur_email || null,
      demandeur_adresse: payload.demandeur_adresse || null,
      type_demande: payload.type_demande,
      parcelle_id: payload.parcelle_id || null,
      description: payload.description || null,
      statut: "cree",
      montant_frais: payload.montant_frais || null,
      guichet_agent_nom: payload.guichet_agent_nom || null,
    })
    .select()
    .single();
  if (error) return { ok: false, raison: error.message };

  // Log de l'étape
  await supabase.from("etapes_demandes").insert({
    demande_id: data.id,
    etape: "creation",
    acteur_nom: payload.guichet_agent_nom,
    acteur_role: "guichet",
    observation: "Demande enregistrée par le guichet unique",
  });

  return { ok: true, demande: data };
}

// ============================================
// LISTER LES DEMANDES
// ============================================

export async function listerDemandes(filtre = {}) {
  let query = supabase
    .from("demandes")
    .select("*")
    .order("created_at", { ascending: false });

  if (filtre.statut) query = query.eq("statut", filtre.statut);
  if (filtre.type_demande) query = query.eq("type_demande", filtre.type_demande);
  if (filtre.nin) query = query.eq("demandeur_nin", filtre.nin);

  const { data, error } = await query;
  if (error) { console.error(error); return []; }
  return data || [];
}

// ============================================
// TRANSMETTRE AU TRÉSOR
// ============================================

export async function transmettreTresor(demandeId, agentNom, montant) {
  const { error } = await supabase
    .from("demandes")
    .update({
      statut: "en_attente_paiement",
      montant_frais: montant,
      guichet_agent_nom: agentNom,
      updated_at: new Date().toISOString(),
    })
    .eq("id", demandeId);
  if (error) return { ok: false, raison: error.message };

  await supabase.from("etapes_demandes").insert({
    demande_id: demandeId,
    etape: "transmission_tresor",
    acteur_nom: agentNom,
    acteur_role: "guichet",
    observation: `Dossier transmis au Trésor pour encaissement — ${montant} FCFA`,
  });

  return { ok: true };
}

// ============================================
// VALIDER LE PAIEMENT (Trésor)
// ============================================

export async function validerPaiement(demandeId, agentNom, referenceQuittance) {
  // Récupérer la demande pour connaître le montant et les infos
  const { data: demande } = await supabase
    .from("demandes")
    .select("*")
    .eq("id", demandeId)
    .single();
  
  if (!demande) return { ok: false, raison: "Demande introuvable" };

  // Mettre à jour la demande
  const { error } = await supabase
    .from("demandes")
    .update({
      statut: "paye",
      date_paiement: new Date().toISOString(),
      reference_quittance: referenceQuittance,
      tresor_agent_nom: agentNom,
      updated_at: new Date().toISOString(),
    })
    .eq("id", demandeId);
  if (error) return { ok: false, raison: error.message };

  // Créer une ligne dans encaissements (pour les rapports Trésor)
  try {
    await supabase.from("encaissements").insert({
      dossier_id: demande.reference,
      type: "Frais de " + (demande.type_demande || "demande"),
      montant: demande.montant_frais || 0,
      mode: "Espèces / Mobile Money",
      date: new Date().toISOString().slice(0, 10),
    });
  } catch (e) {
    console.error("Erreur création encaissement:", e);
    // On ne bloque pas la validation si l'encaissement échoue
  }

  // Log dans le journal
  await supabase.from("etapes_demandes").insert({
    demande_id: demandeId,
    etape: "paiement",
    acteur_nom: agentNom,
    acteur_role: "tresor",
    observation: `Paiement validé — quittance n° ${referenceQuittance} — ${demande.montant_frais} FCFA`,
  });

  return { ok: true };
}

// ============================================
// CHARGER LE JOURNAL D'UNE DEMANDE
// ============================================

export async function chargerJournalDemande(demandeId) {
  const { data, error } = await supabase
    .from("etapes_demandes")
    .select("*")
    .eq("demande_id", demandeId)
    .order("created_at", { ascending: true });
  if (error) return [];
  return data || [];
}

// ============================================
// RECHERCHER UNE DEMANDE PAR NIN
// ============================================

export async function chercherDemandeParNin(nin) {
  const { data, error } = await supabase
    .from("demandes")
    .select("*")
    .eq("demandeur_nin", nin)
    .order("created_at", { ascending: false });
  if (error) { console.error(error); return []; }
  return data || [];
}


// ============================================
// TRANSMETTRE AU TOPOGRAPHE (Guichet, après paiement)
// ============================================

export async function transmettreTopographe(demandeId, agentNom) {
  const { error } = await supabase
    .from("demandes")
    .update({
      statut: "transmis_topographe",
      updated_at: new Date().toISOString(),
    })
    .eq("id", demandeId);
  if (error) return { ok: false, raison: error.message };

  await supabase.from("etapes_demandes").insert({
    demande_id: demandeId,
    etape: "transmission_topographe",
    acteur_nom: agentNom,
    acteur_role: "guichet",
    observation: "Dossier transmis à la brigade topographique pour levé",
  });

  return { ok: true };
}

// ============================================
// VALIDER LE LEVÉ (Topographe)
// ============================================
export async function validerLeveTopographe(demandeId, agentNom, rapportUrl, observations) {
  const { error } = await supabase
    .from("demandes")
    .update({
      statut: "transmis_conservation",
      rapport_topo_url: rapportUrl,
      date_leve: new Date().toISOString(),
      observations_topo: observations,
      updated_at: new Date().toISOString(),
    })
    .eq("id", demandeId);

  if (error) return { ok: false, raison: error.message };

  await supabase.from("etapes_demandes").insert({
    demande_id: demandeId,
    etape: "leve_topographique",
    acteur_nom: agentNom,
    acteur_role: "topographe",
    observation: "Levé topographique validé et transmis à la conservation",
  });

  return { ok: true };
}
