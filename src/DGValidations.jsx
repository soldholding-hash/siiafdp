import { useState, useEffect } from "react";
import {
  Award, Loader2, X, CheckCircle, XCircle, AlertTriangle, Eye,
  Send, Clock, FileText, PenTool, Building2
} from "lucide-react";
import { supabase } from "./lib/db";
import { getSignedUrl } from "./lib/huissier";

const fmt = (n) => new Intl.NumberFormat("fr-FR").format(n || 0) + " FCFA";

const STATUT_INFO = {
  en_attente_dg: { label: "En attente signature", couleur: "bg-blue-100 text-blue-800" },
  inscrite: { label: "Saisie inscrite", couleur: "bg-emerald-100 text-emerald-800" },
  executee: { label: "Exécutée", couleur: "bg-emerald-200 text-emerald-900" },
};

async function chargerDossiersDG(filtre) {
  let query = supabase
    .from("commandements")
    .select("*")
    .in("statut", filtre === "tous"
      ? ["en_attente_dg", "inscrite", "executee"]
      : [filtre])
    .order("conservateur_decision_le", { ascending: false });
  const { data, error } = await query;
  if (error) { console.error(error); return []; }
  return data || [];
}

// ============================================
// MODAL : Signer l'inscription
// ============================================
function ModalSignature({ dossier, onClose, onDone, currentUser }) {
  const [observations, setObservations] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);
  const [journal, setJournal] = useState([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("journal_dossier")
        .select("*")
        .eq("commandement_id", dossier.id)
        .order("created_at", { ascending: true });
      setJournal(data || []);
    })();
  }, [dossier.id]);

  async function signer() {
    setLoading(true);
    try {
      // Générer un numéro d'arrêté
      const annee = new Date().getFullYear();
      const { count } = await supabase
        .from("commandements")
        .select("id", { count: "exact", head: true })
        .not("arrete_numero", "is", null);
      const numero = `ARR-${annee}-${String((count || 0) + 1).padStart(4, "0")}`;

      const { error } = await supabase
        .from("commandements")
        .update({
          statut: "inscrite",
          dg_nom: currentUser?.nom || currentUser?.username || "Directeur Général",
          dg_decision: "signe",
          dg_decision_le: new Date().toISOString(),
          arrete_numero: numero,
          dg_observations: observations.trim() || null,
          saisie_inscrite_le: new Date().toISOString(),
        })
        .eq("id", dossier.id);
      if (error) { setErr(error.message); setLoading(false); return; }

      // Log dans le journal
      await supabase.rpc("log_dossier", {
        p_dossier_id: dossier.id,
        p_parcelle_id: dossier.parcelle_id,
        p_commandement_id: dossier.id,
        p_type_action: "signature_dg",
        p_description: `Arrêté ${numero} signé par le DG — saisie inscrite au registre foncier`,
        p_motif: observations.trim() || null,
        p_metadata: { arrete_numero: numero },
      });

      setLoading(false);
      onDone({ ok: true, numero });
    } catch (e) {
      setErr(e.message);
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-stone-900/70 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-sm w-full max-w-3xl my-4">
        <div className="bg-emerald-900 text-white px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PenTool size={18} />
            <div className="text-sm font-semibold">Signature de l'inscription — {dossier.parcelle_id}</div>
          </div>
          <button onClick={onClose} className="text-emerald-200 hover:text-white"><X size={18} /></button>
        </div>

        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* En-tête dossier */}
          <div className="bg-stone-50 border border-stone-200 rounded-sm p-4">
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <div className="text-stone-500">Parcelle</div>
                <div className="font-mono font-semibold">{dossier.parcelle_id}</div>
              </div>
              <div>
                <div className="text-stone-500">Statut</div>
                <span className="inline-block text-xs px-2 py-0.5 rounded-sm font-medium bg-blue-100 text-blue-800">
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
                <div className="text-stone-500">Conservateur</div>
                <div className="font-semibold">{dossier.conservateur_nom || "—"}</div>
              </div>
            </div>
          </div>

          {/* Historique */}
          {journal.length > 0 && (
            <div>
              <div className="text-sm font-semibold text-stone-800 mb-2">
                📋 Parcours du dossier
              </div>
              <div className="bg-stone-50 border border-stone-200 rounded-sm p-3 space-y-2 max-h-48 overflow-y-auto">
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

          {/* Observations */}
          <div>
            <label className="text-xs font-mono text-stone-500 block mb-1">
              Observations (optionnel)
            </label>
            <textarea
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              rows={3}
              placeholder="Ex: Vérification effectuée. Saisie conforme à la décision du TGI."
              className="w-full border border-stone-300 rounded-sm px-3 py-2 text-sm"
            />
          </div>

          <div className="bg-emerald-50 border border-emerald-200 rounded-sm p-3 text-xs text-emerald-900">
            <strong>En signant</strong>, vous rendez la saisie exécutoire au registre foncier.
            Un numéro d'arrêté sera généré automatiquement (ARR-2026-XXXX).
          </div>

          {err && (
            <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-sm p-2 flex items-center gap-2">
              <AlertTriangle size={14} /> {err}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 px-5 pb-5 pt-3 border-t border-stone-200">
          <button onClick={onClose} className="text-xs px-4 py-2 text-stone-600 hover:bg-stone-100 rounded-sm">
            Annuler
          </button>
          <button
            onClick={signer}
            disabled={loading}
            className="text-xs px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-sm flex items-center gap-1"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <PenTool size={14} />}
            {loading ? "Signature..." : "Signer l'inscription"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// COMPOSANT PRINCIPAL
// ============================================
export default function DGValidations({ currentUser }) {
  const [dossiers, setDossiers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtre, setFiltre] = useState("en_attente_dg");
  const [selected, setSelected] = useState(null);
  const [msg, setMsg] = useState(null);

  async function charger() {
    setLoading(true);
    const data = await chargerDossiersDG(filtre);
    setDossiers(data);
    setLoading(false);
  }

  useEffect(() => { charger(); }, [filtre]);

  function apresSignature() {
    setSelected(null);
    setMsg({ ok: true, text: "Arrêté signé. La saisie est maintenant exécutoire." });
    charger();
    setTimeout(() => setMsg(null), 5000);
  }

  const filtres = [
    { id: "en_attente_dg", label: "À signer", icone: Clock },
    { id: "inscrite", label: "Inscrites", icone: CheckCircle },
    { id: "executee", label: "Exécutées", icone: Award },
    { id: "tous", label: "Tous", icone: FileText },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Award className="text-emerald-700" size={26} />
            <div className="text-2xl font-semibold text-stone-900">Signature DG</div>
          </div>
          <div className="text-sm text-stone-500 mt-1">
            Dossiers validés par le Conservateur, en attente de signature du Directeur Général
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
                  ? "bg-emerald-600 text-white border-emerald-600"
                  : "bg-white text-stone-600 border-stone-200 hover:border-emerald-400"
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
          <Award size={32} className="text-stone-300 mx-auto mb-3" />
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
                <th className="text-left py-3 px-4">Conservateur</th>
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
                  <td className="py-3 px-4 text-xs">{d.conservateur_nom || "—"}</td>
                  <td className="py-3 px-4 text-xs text-stone-500">
                    {d.conservateur_decision_le
                      ? new Date(d.conservateur_decision_le).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })
                      : "—"}
                  </td>
                  <td className="py-3 px-4">
                    <span className={"text-xs px-2 py-0.5 rounded-sm font-medium " + (STATUT_INFO[d.statut]?.couleur || "bg-stone-100 text-stone-700")}>
                      {STATUT_INFO[d.statut]?.label || d.statut}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    {d.statut === "en_attente_dg" ? (
                      <button onClick={() => setSelected(d)}
                        className="text-xs px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-sm inline-flex items-center gap-1">
                        <PenTool size={11} /> Signer
                      </button>
                    ) : (
                      <span className="text-xs text-stone-400">{d.arrete_numero || "—"}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="bg-emerald-50 border border-emerald-200 rounded-sm p-4 text-xs text-emerald-900">
        <strong>Procédure :</strong> après validation du Conservateur, vous signez l'arrêté qui rend
        la saisie exécutoire au registre foncier. Un numéro unique est généré automatiquement.
      </div>

      {selected && (
        <ModalSignature
          dossier={selected}
          currentUser={currentUser}
          onClose={() => setSelected(null)}
          onDone={apresSignature}
        />
      )}
    </div>
  );
}
