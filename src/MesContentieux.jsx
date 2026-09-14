import { useState, useEffect } from "react";
import { AlertTriangle, Scale, Loader2, X, Gavel, CheckCircle2, Clock } from "lucide-react";
import { chargerMesContentieux, executerSaisie } from "./lib/contentieux";
import { supabase } from "./lib/db";

const STATUT_STYLE = {
  signale:           { label: "Signalé — en attente Ministère", bg: "bg-red-100",    text: "text-red-800" },
  en_instruction:    { label: "En instruction",                 bg: "bg-amber-100",  text: "text-amber-800" },
  transmis_tribunal: { label: "Transmis au Tribunal",           bg: "bg-indigo-100", text: "text-indigo-800" },
  juge:              { label: "Saisie ordonnée — à exécuter",   bg: "bg-purple-100", text: "text-purple-800" },
  saisie_effective:  { label: "Saisie effective",               bg: "bg-orange-100", text: "text-orange-800" },
  clos:              { label: "Rejeté / classé",                bg: "bg-stone-100",  text: "text-stone-700" },
};

const MOTIF_LABEL = {
  defaut_paiement:    "Défaut de paiement",
  retard_paiement:    "Retard de paiement",
  defaillance_totale: "Défaillance totale",
  autre:              "Autre",
};

function ModalSaisie({ dossier, onClose, onDone }) {
  const [commentaire, setCommentaire] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  async function valider() {
    if (!commentaire.trim()) { setErr("Commentaire obligatoire"); return; }
    setLoading(true);
    try {
      const res = await executerSaisie(dossier.id, commentaire);
      if (!res.ok) { setErr("Erreur : " + res.raison); }
      else { onDone(); }
    } catch (e) { setErr(e.message); } finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 bg-stone-900/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-sm w-full max-w-lg p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Gavel className="text-purple-700" size={18} />
            <div className="text-base font-semibold">Exécuter la saisie immobilière</div>
          </div>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-700"><X size={18} /></button>
        </div>

        <div className="bg-purple-50 border border-purple-200 rounded-sm p-4 mb-4 text-sm">
          <div className="font-medium text-purple-900 mb-1">Le Tribunal a ordonné la saisie</div>
          <div className="text-xs text-purple-800">
            En confirmant, le bien <span className="font-mono font-medium">{dossier.parcelle_id}</span> sera
            marqué comme <strong>sous saisie immobilière</strong>. Toute mutation, vente ou nouveau gage
            sera bloqué jusqu'à la vente aux enchères.
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-mono text-stone-500 block mb-1">Commentaire d'exécution</label>
            <textarea value={commentaire} onChange={(e) => setCommentaire(e.target.value)}
              rows={3} placeholder="Ex : Signification du jugement faite par huissier le ..., procédure de vente enclenchée."
              className="w-full border border-stone-300 rounded-sm px-3 py-2 text-sm" />
          </div>

          {err && <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-sm p-2">{err}</div>}
        </div>

        <div className="flex justify-end gap-2 mt-5 pt-4 border-t border-stone-200">
          <button onClick={onClose} className="text-xs px-3 py-2 text-stone-600 hover:bg-stone-100 rounded-sm">Annuler</button>
          <button onClick={valider} disabled={loading || !commentaire.trim()}
            className="text-xs px-3 py-2 bg-purple-700 hover:bg-purple-800 disabled:opacity-40 text-white rounded-sm">
            {loading ? "Traitement..." : "Confirmer la saisie"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MesContentieux({ compteId }) {
  const [dossiers, setDossiers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  async function charger() {
    if (!compteId) return;
    setLoading(true);
    try { setDossiers(await chargerMesContentieux(compteId)); }
    catch (e) { console.error(e); } finally { setLoading(false); }
  }

  useEffect(() => { charger(); }, [compteId]);

  async function apresSaisie() {
    setSelected(null);
    await charger();
  }

  const enAttente = dossiers.filter((d) => d.statut === "juge").length;
  const enProcedure = dossiers.filter((d) => ["signale", "en_instruction", "transmis_tribunal"].includes(d.statut)).length;

  return (
    <div className="p-6 space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <Scale className="text-red-700" size={26} />
          <div className="text-2xl font-semibold text-stone-900">Mes dossiers contentieux</div>
        </div>
        <div className="text-sm text-stone-500 mt-1">
          Suivi des signalements transmis au Ministère et des décisions du Tribunal
        </div>
      </div>

      {enAttente > 0 && (
        <div className="bg-purple-50 border border-purple-200 rounded-sm p-4 flex items-center gap-3">
          <Gavel className="text-purple-700 shrink-0" size={20} />
          <div className="text-sm text-purple-900">
            <strong>{enAttente} saisie{enAttente > 1 ? "s" : ""}</strong> ordonnée{enAttente > 1 ? "s" : ""} par le Tribunal — à exécuter
          </div>
        </div>
      )}

      {enProcedure > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-sm p-4 flex items-center gap-3">
          <Clock className="text-amber-700 shrink-0" size={20} />
          <div className="text-sm text-amber-900">
            <strong>{enProcedure} dossier{enProcedure > 1 ? "s" : ""}</strong> en cours d'instruction
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-stone-500 text-sm">
          <Loader2 className="animate-spin" size={16} /> Chargement...
        </div>
      ) : dossiers.length === 0 ? (
        <div className="bg-white border border-stone-200 rounded-sm p-8 text-center">
          <Scale size={32} className="text-stone-300 mx-auto mb-3" />
          <div className="text-sm text-stone-500">Aucun dossier contentieux</div>
          <div className="text-xs text-stone-400 mt-1">
            Vos signalements d'impayé apparaîtront ici
          </div>
        </div>
      ) : (
        <div className="bg-white border border-stone-200 rounded-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="text-xs font-mono text-stone-500 bg-stone-50 border-b border-stone-200">
              <tr>
                <th className="text-left py-3 px-4">Parcelle</th>
                <th className="text-left py-3 px-4">Motif</th>
                <th className="text-left py-3 px-4">Signalé le</th>
                <th className="text-left py-3 px-4">Statut</th>
                <th className="text-right py-3 px-4"></th>
              </tr>
            </thead>
            <tbody>
              {dossiers.map((d) => {
                const st = STATUT_STYLE[d.statut] || { label: d.statut, bg: "bg-stone-100", text: "text-stone-700" };
                return (
                  <tr key={d.id} className="border-b border-stone-100 hover:bg-stone-50">
                    <td className="py-3 px-4 font-mono text-xs font-medium">{d.parcelle_id}</td>
                    <td className="py-3 px-4 text-xs text-stone-600">{MOTIF_LABEL[d.motif] || d.motif}</td>
                    <td className="py-3 px-4 text-xs text-stone-500">
                      {new Date(d.date_signalement).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}
                    </td>
                    <td className="py-3 px-4">
                      <span className={"text-xs px-2 py-0.5 rounded-sm font-medium " + st.bg + " " + st.text}>
                        {st.label}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {d.statut === "juge" && d.decision === "saisie_immediate" && (
                        <button onClick={() => setSelected(d)}
                          className="text-xs px-3 py-1.5 bg-purple-700 hover:bg-purple-800 text-white rounded-sm flex items-center gap-1.5 ml-auto">
                          <Gavel size={12} /> Exécuter la saisie
                        </button>
                      )}
                      {d.statut === "saisie_effective" && (
                        <span className="text-xs text-orange-700 font-medium flex items-center gap-1 justify-end">
                          <CheckCircle2 size={12} /> Bien sous saisie
                        </span>
                      )}
                      {d.statut === "transmis_tribunal" && (
                        <span className="text-xs text-stone-400 italic">En attente du Tribunal</span>
                      )}
                      {d.statut === "clos" && (
                        <span className="text-xs text-stone-400">Classé</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <ModalSaisie dossier={selected} onClose={() => setSelected(null)} onDone={apresSaisie} />
      )}
    </div>
  );
}
