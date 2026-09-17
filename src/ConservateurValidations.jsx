import { useState, useEffect } from "react";
import {
  ShieldCheck, Loader2, X, CheckCircle, XCircle, AlertTriangle,
  FileText, Eye, Send, Clock, Building2, Gavel, Award, User,
  Paperclip, Calendar, MessageSquare
} from "lucide-react";
import { supabase } from "./lib/db";
import { getSignedUrl } from "./lib/huissier";

const fmt = (n) => new Intl.NumberFormat("fr-FR").format(n || 0) + " FCFA";

const STATUT_INFO = {
  transmis_ministere: { label: "Transmis au Ministère", couleur: "bg-indigo-100 text-indigo-800" },
  en_attente_conservateur: { label: "En attente Conservateur", couleur: "bg-amber-100 text-amber-800" },
  refuse_conservateur: { label: "Refusé (complément)", couleur: "bg-red-100 text-red-800" },
  en_attente_dg: { label: "En attente DG", couleur: "bg-blue-100 text-blue-800" },
  inscrite: { label: "Inscrite au registre", couleur: "bg-emerald-100 text-emerald-800" },
  executee: { label: "Exécutée", couleur: "bg-emerald-200 text-emerald-900" },
};

const STATUTS_A_TRAITER = ["transmis_ministere", "en_attente_conservateur"];

// ============================================
// Charger les dossiers transmis au Ministère
// ============================================
async function chargerDossiersMinistere(filtre) {
  let query = supabase
    .from("commandements")
    .select("*")
    .in("statut", filtre === "tous"
      ? ["transmis_ministere", "en_attente_conservateur", "refuse_conservateur", "en_attente_dg", "inscrite", "executee"]
      : [filtre])
    .order("transmis_ministere_le", { ascending: false });
  const { data, error } = await query;
  if (error) { console.error(error); return []; }
  return data || [];
}

// ============================================
// Charger les infos SIGEF d'une parcelle
// ============================================
async function chargerInfosParcelle(parcelleId) {
  const { data: parcelle } = await supabase
    .from("parcelles")
    .select("*")
    .eq("id", parcelleId)
    .maybeSingle();

  const { data: gages } = await supabase
    .from("gages")
    .select("*")
    .eq("parcelle_id", parcelleId)
    .eq("statut", "actif");

  const { data: gels } = await supabase
    .from("gels")
    .select("*")
    .eq("parcelle_id", parcelleId)
    .eq("statut", "actif");

  return {
    parcelle,
    gages: gages || [],
    gels: gels || [],
  };
}

// ============================================
// Charger le journal d'un dossier
// ============================================
async function chargerJournal(commandementId) {
  const { data, error } = await supabase
    .from("journal_dossier")
    .select("*")
    .eq("commandement_id", commandementId)
    .order("created_at", { ascending: true });
  if (error) return [];
  return data || [];
}

// ============================================
// MODAL : Détail du dossier
// ============================================
function ModalDetail({ dossier, onClose, onAction }) {
  const [infos, setInfos] = useState(null);
  const [journal, setJournal] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modeAction, setModeAction] = useState(null); // null | "valider" | "refuser"
  const [motif, setMotif] = useState("");
  const [documentsManquants, setDocumentsManquants] = useState([]);
  const [loadingAction, setLoadingAction] = useState(false);
  const [err, setErr] = useState(null);

  useEffect(() => {
    (async () => {
      const i = await chargerInfosParcelle(dossier.parcelle_id);
      setInfos(i);
      const j = await chargerJournal(dossier.id);
      setJournal(j);
      setLoading(false);
    })();
  }, [dossier.id]);

  async function voirDocument(url) {
    if (!url) return;
    const signed = await getSignedUrl(url, 3600);
    if (signed) window.open(signed, "_blank");
    else alert("Impossible d'ouvrir le document");
  }

  async function validerDossier() {
    setLoadingAction(true);
    const res = await onAction("valider", { motif });
    setLoadingAction(false);
    if (res.ok) onClose();
    else setErr(res.raison);
  }

  async function refuserDossier() {
    if (!motif.trim()) { setErr("Motif obligatoire"); return; }
    if (documentsManquants.length === 0) { setErr("Cochez au moins un document manquant"); return; }
    setLoadingAction(true);
    const res = await onAction("refuser", { motif, documentsManquants });
    setLoadingAction(false);
    if (res.ok) onClose();
    else setErr(res.raison);
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-stone-900/70 flex items-center justify-center z-50">
        <Loader2 className="animate-spin text-white" size={32} />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-stone-900/70 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-sm w-full max-w-4xl my-4">
        <div className="bg-indigo-900 text-white px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} />
            <div className="text-sm font-semibold">
              Validation — {dossier.parcelle_id}
            </div>
          </div>
          <button onClick={onClose} className="text-indigo-200 hover:text-white"><X size={18} /></button>
        </div>

        <div className="p-5 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* En-tête dossier */}
          <div className="bg-stone-50 border border-stone-200 rounded-sm p-4">
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <div className="text-stone-500">Parcelle</div>
                <div className="font-mono font-semibold text-stone-800">{dossier.parcelle_id}</div>
              </div>
              <div>
                <div className="text-stone-500">Statut</div>
                <span className={"inline-block text-xs px-2 py-0.5 rounded-sm font-medium " + (STATUT_INFO[dossier.statut]?.couleur || "bg-stone-100")}>
                  {STATUT_INFO[dossier.statut]?.label || dossier.statut}
                </span>
              </div>
              <div>
                <div className="text-stone-500">Créancier</div>
                <div className="font-semibold">{dossier.creancier_nom}</div>
              </div>
              <div>
                <div className="text-stone-500">Débiteur</div>
                <div className="font-semibold">{dossier.debiteur_nom}</div>
              </div>
              <div>
                <div className="text-stone-500">Montant</div>
                <div className="font-mono font-bold text-red-700">{fmt(dossier.montant_pretendu)}</div>
              </div>
              <div>
                <div className="text-stone-500">Magistrat TGI</div>
                <div className="font-semibold">{dossier.magistrat_tgi || "—"}</div>
              </div>
            </div>
          </div>

          {/* Bloc 1 : Documents SIGEF */}
          <div>
            <div className="text-sm font-semibold text-stone-800 mb-3 flex items-center gap-2">
              📁 Documents SIGEF (accès direct)
            </div>
            <div className="bg-emerald-50 border border-emerald-200 rounded-sm p-3 space-y-2 text-xs">
              {infos?.parcelle ? (
                <>
                  <div className="flex justify-between">
                    <span className="text-stone-600">Surface</span>
                    <span className="font-mono">{infos.parcelle.surface_m2 || "—"} m²</span>
                  </div>
                  {infos.parcelle.data?.proprietaire && (
                    <div className="flex justify-between">
                      <span className="text-stone-600">Propriétaire enregistré</span>
                      <span className="font-semibold">{infos.parcelle.data.proprietaire}</span>
                    </div>
                  )}
                  {infos.parcelle.data?.commune && (
                    <div className="flex justify-between">
                      <span className="text-stone-600">Commune</span>
                      <span>{infos.parcelle.data.commune}</span>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-stone-500">Parcelle introuvable</div>
              )}

              {/* Gages actifs */}
              <div className="pt-2 border-t border-emerald-200">
                <div className="font-semibold text-emerald-800 mb-1">
                  Charges actives ({infos?.gages?.length || 0})
                </div>
                {infos?.gages?.length > 0 ? (
                  infos.gages.map((g) => (
                    <div key={g.id} className="flex justify-between">
                      <span>🏦 {g.banque_nom} — {g.dossier_credit}</span>
                      <span className="font-mono">{fmt(g.montant)}</span>
                    </div>
                  ))
                ) : (
                  <div className="text-emerald-700">✅ Aucun gage actif</div>
                )}
              </div>

              {/* Gels judiciaires */}
              <div className="pt-2 border-t border-emerald-200">
                <div className="font-semibold text-emerald-800 mb-1">
                  Gels judiciaires ({infos?.gels?.length || 0})
                </div>
                {infos?.gels?.length > 0 ? (
                  infos.gels.map((g) => (
                    <div key={g.id} className="text-amber-700">
                      ⚖️ {g.motif || "Gel"} — {g.tribunal_id || "TGI"}
                    </div>
                  ))
                ) : (
                  <div className="text-emerald-700">✅ Aucun gel actif</div>
                )}
              </div>
            </div>
          </div>

          {/* Bloc 2 : Documents judiciaires */}
          <div>
            <div className="text-sm font-semibold text-stone-800 mb-3 flex items-center gap-2">
              ⚖️ Documents judiciaires (fournis par l'huissier)
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-sm p-3 space-y-2">
              {dossier.document_pdf_url && (
                <div className="flex items-center justify-between">
                  <span className="text-xs">📄 Acte de commandement</span>
                  <button onClick={() => voirDocument(dossier.document_pdf_url)}
                    className="text-xs px-2 py-1 bg-indigo-600 text-white rounded-sm inline-flex items-center gap-1">
                    <Eye size={11} /> Voir
                  </button>
                </div>
              )}
              {dossier.document_notification_url && (
                <div className="flex items-center justify-between">
                  <span className="text-xs">📄 Preuve de notification</span>
                  <button onClick={() => voirDocument(dossier.document_notification_url)}
                    className="text-xs px-2 py-1 bg-indigo-600 text-white rounded-sm inline-flex items-center gap-1">
                    <Eye size={11} /> Voir
                  </button>
                </div>
              )}
              {dossier.ordonnance_tgi_url && (
                <div className="flex items-center justify-between">
                  <span className="text-xs">📄 Ordonnance TGI</span>
                  <button onClick={() => voirDocument(dossier.ordonnance_tgi_url)}
                    className="text-xs px-2 py-1 bg-indigo-600 text-white rounded-sm inline-flex items-center gap-1">
                    <Eye size={11} /> Voir
                  </button>
                </div>
              )}
              {!dossier.document_pdf_url && !dossier.document_notification_url && !dossier.ordonnance_tgi_url && (
                <div className="text-xs text-amber-800">
                  ⚠️ Aucun document judiciaire visible
                </div>
              )}
            </div>
          </div>

          {/* Journal */}
          {journal.length > 0 && (
            <div>
              <div className="text-sm font-semibold text-stone-800 mb-3">
                📋 Historique du dossier
              </div>
              <div className="bg-stone-50 border border-stone-200 rounded-sm p-3 space-y-2 max-h-60 overflow-y-auto">
                {journal.map((j) => (
                  <div key={j.id} className="text-xs flex gap-2">
                    <div className="text-stone-400 shrink-0">
                      {new Date(j.created_at).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}
                    </div>
                    <div>
                      <span className="font-semibold">{j.acteur_nom}</span>
                      <span className="text-stone-500"> — {j.description}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Erreur */}
          {err && (
            <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-sm p-2 flex items-center gap-2">
              <AlertTriangle size={14} /> {err}
            </div>
          )}

          {/* Zone de décision */}
          {modeAction === "valider" && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-sm p-4">
              <div className="text-sm font-semibold text-emerald-900 mb-2">
                ✅ Valider le dossier
              </div>
              <textarea value={motif} onChange={(e) => setMotif(e.target.value)}
                rows={2} placeholder="Observations (optionnel)"
                className="w-full border border-stone-300 rounded-sm px-3 py-2 text-sm mb-2" />
              <div className="flex gap-2">
                <button onClick={() => setModeAction(null)}
                  className="text-xs px-3 py-2 bg-stone-200 hover:bg-stone-300 text-stone-700 rounded-sm">
                  Annuler
                </button>
                <button onClick={validerDossier} disabled={loadingAction}
                  className="text-xs px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-sm inline-flex items-center gap-1">
                  {loadingAction ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={12} />}
                  Confirmer la validation
                </button>
              </div>
            </div>
          )}

          {modeAction === "refuser" && (
            <div className="bg-red-50 border border-red-200 rounded-sm p-4">
              <div className="text-sm font-semibold text-red-900 mb-2">
                ⏸️ Refuser pour complément
              </div>
              <div className="text-xs text-red-800 mb-3">
                Sélectionnez les documents judiciaires manquants :
              </div>
              <div className="space-y-1 mb-3">
                {[
                  { id: "jugement", label: "Copie intégrale du jugement" },
                  { id: "ordonnance", label: "Ordonnance d'exécution signée" },
                  { id: "notification", label: "Preuve de notification au débiteur" },
                  { id: "pv", label: "PV de signification de l'huissier" },
                  { id: "non_recours", label: "Attestation de non-recours" },
                ].map((d) => (
                  <label key={d.id} className="flex items-center gap-2 text-xs cursor-pointer">
                    <input type="checkbox"
                      checked={documentsManquants.includes(d.id)}
                      onChange={(e) => {
                        if (e.target.checked) setDocumentsManquants([...documentsManquants, d.id]);
                        else setDocumentsManquants(documentsManquants.filter((x) => x !== d.id));
                      }}
                    />
                    {d.label}
                  </label>
                ))}
              </div>
              <textarea value={motif} onChange={(e) => setMotif(e.target.value)}
                rows={2} placeholder="Motif détaillé (obligatoire)"
                className="w-full border border-stone-300 rounded-sm px-3 py-2 text-sm mb-2" />
              <div className="flex gap-2">
                <button onClick={() => setModeAction(null)}
                  className="text-xs px-3 py-2 bg-stone-200 hover:bg-stone-300 text-stone-700 rounded-sm">
                  Annuler
                </button>
                <button onClick={refuserDossier} disabled={loadingAction}
                  className="text-xs px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-sm inline-flex items-center gap-1">
                  {loadingAction ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                  Envoyer la demande à l'huissier
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Pied avec boutons */}
        {!modeAction && (
          <div className="flex justify-end gap-2 px-5 pb-5 pt-3 border-t border-stone-200">
            <button onClick={onClose}
              className="text-xs px-4 py-2 text-stone-600 hover:bg-stone-100 rounded-sm">
              Fermer
            </button>
            <button onClick={() => setModeAction("refuser")}
              className="text-xs px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-sm inline-flex items-center gap-1">
              <XCircle size={14} /> Refuser (complément)
            </button>
            <button onClick={() => setModeAction("valider")}
              className="text-xs px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-sm inline-flex items-center gap-1">
              <CheckCircle size={14} /> Valider et transmettre au DG
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// COMPOSANT PRINCIPAL
// ============================================
export default function ConservateurValidations({ currentUser }) {
  const [dossiers, setDossiers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtre, setFiltre] = useState("transmis_ministere");
  const [selected, setSelected] = useState(null);
  const [msg, setMsg] = useState(null);

  async function charger() {
    setLoading(true);
    const data = await chargerDossiersMinistere(filtre);
    setDossiers(data);
    setLoading(false);
  }

  useEffect(() => { charger(); }, [filtre]);

  async function traiterAction(type, data) {
    try {
      const nouveauStatut = type === "valider" ? "en_attente_dg" : "refuse_conservateur";
      const update = {
        statut: nouveauStatut,
        conservateur_nom: currentUser?.nom || currentUser?.username || "Conservateur",
        conservateur_decision: type,
        conservateur_decision_le: new Date().toISOString(),
        conservateur_motif: data.motif || null,
      };

      const { error } = await supabase
        .from("commandements")
        .update(update)
        .eq("id", selected.id);
      if (error) return { ok: false, raison: error.message };

      // Log dans le journal
      await supabase.rpc("log_dossier", {
        p_dossier_id: selected.id,
        p_parcelle_id: selected.parcelle_id,
        p_commandement_id: selected.id,
        p_type_action: type === "valider" ? "validation_conservateur" : "refus_conservateur",
        p_description: type === "valider"
          ? "Dossier validé par le Conservateur, transmis au DG"
          : "Dossier refusé pour complément par le Conservateur",
        p_motif: data.motif,
        p_metadata: {
          documents_manquants: data.documentsManquants || [],
        },
      });

      setMsg({ ok: true, text: type === "valider" ? "Dossier validé et transmis au DG" : "Demande de complément envoyée à l'huissier" });
      await charger();
      setTimeout(() => setMsg(null), 4000);
      return { ok: true };
    } catch (e) {
      return { ok: false, raison: e.message };
    }
  }

  const filtres = [
    { id: "transmis_ministere", label: "À traiter", icone: Clock },
    { id: "refuse_conservateur", label: "Refusés", icone: XCircle },
    { id: "en_attente_dg", label: "Au DG", icone: Send },
    { id: "inscrite", label: "Inscrits", icone: CheckCircle },
    { id: "tous", label: "Tous", icone: FileText },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <ShieldCheck className="text-indigo-700" size={26} />
            <div className="text-2xl font-semibold text-stone-900">Validations Conservateur</div>
          </div>
          <div className="text-sm text-stone-500 mt-1">
            Dossiers transmis par les huissiers après décision du TGI
          </div>
        </div>
      </div>

      {msg && (
        <div className={"text-xs p-2 rounded-sm border " + (msg.ok ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-red-50 border-red-200 text-red-800")}>
          {msg.text}
        </div>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        {filtres.map((f) => {
          const Icone = f.icone;
          return (
            <button key={f.id} onClick={() => setFiltre(f.id)}
              className={"text-xs px-3 py-2 rounded-sm border inline-flex items-center gap-1.5 " + (
                filtre === f.id
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : "bg-white text-stone-600 border-stone-200 hover:border-indigo-400"
              )}>
              <Icone size={12} /> {f.label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-stone-500 text-sm p-6">
          <Loader2 className="animate-spin" size={16} /> Chargement...
        </div>
      ) : dossiers.length === 0 ? (
        <div className="bg-white border border-stone-200 rounded-sm p-8 text-center">
          <ShieldCheck size={32} className="text-stone-300 mx-auto mb-3" />
          <div className="text-sm text-stone-500">Aucun dossier dans cette catégorie</div>
        </div>
      ) : (
        <div className="bg-white border border-stone-200 rounded-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="text-xs font-mono text-stone-500 bg-stone-50 border-b border-stone-200">
              <tr>
                <th className="text-left py-3 px-4">Parcelle</th>
                <th className="text-left py-3 px-4">Créancier → Débiteur</th>
                <th className="text-right py-3 px-4">Montant</th>
                <th className="text-left py-3 px-4">Magistrat</th>
                <th className="text-left py-3 px-4">Reçu le</th>
                <th className="text-left py-3 px-4">Statut</th>
                <th className="text-right py-3 px-4">Action</th>
              </tr>
            </thead>
            <tbody>
              {dossiers.map((d) => (
                <tr key={d.id} className="border-b border-stone-100 hover:bg-stone-50">
                  <td className="py-3 px-4 font-mono text-xs font-semibold">{d.parcelle_id}</td>
                  <td className="py-3 px-4 text-xs">
                    <div>{d.creancier_nom}</div>
                    <div className="text-stone-400">→ {d.debiteur_nom}</div>
                  </td>
                  <td className="py-3 px-4 text-xs font-mono text-right">{fmt(d.montant_pretendu)}</td>
                  <td className="py-3 px-4 text-xs">{d.magistrat_tgi || "—"}</td>
                  <td className="py-3 px-4 text-xs text-stone-500">
                    {d.transmis_ministere_le
                      ? new Date(d.transmis_ministere_le).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })
                      : "—"}
                  </td>
                  <td className="py-3 px-4">
                    <span className={"text-xs px-2 py-0.5 rounded-sm font-medium " + (STATUT_INFO[d.statut]?.couleur || "bg-stone-100 text-stone-700")}>
                      {STATUT_INFO[d.statut]?.label || d.statut}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button onClick={() => setSelected(d)}
                      className="text-xs px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-sm inline-flex items-center gap-1">
                      <Eye size={11} /> Examiner
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="bg-indigo-50 border border-indigo-200 rounded-sm p-4 text-xs text-indigo-900">
        <strong>Procédure :</strong> examinez chaque dossier transmis par l'huissier. Vérifiez les documents judiciaires.
        Si le dossier est complet, validez-le pour transmission au DG. Sinon, refusez pour demander un complément à l'huissier.
      </div>

      {selected && (
        <ModalDetail
          dossier={selected}
          onClose={() => setSelected(null)}
          onAction={traiterAction}
        />
      )}
    </div>
  );
}
