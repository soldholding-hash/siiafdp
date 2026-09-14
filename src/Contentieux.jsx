import { useState, useEffect } from "react";
import { Scale, Loader2, X, AlertTriangle, Gavel, CheckCircle2, Clock } from "lucide-react";
import { chargerTousContentieux, instruireContentieux } from "./lib/contentieux";

function fmt(n) {
  return new Intl.NumberFormat("fr-FR").format(n) + " FCFA";
}

const STATUT_STYLE = {
  signale:              { label: "À instruire",    bg: "bg-red-100",     text: "text-red-800",     icon: AlertTriangle },
  en_instruction:       { label: "En instruction", bg: "bg-amber-100",   text: "text-amber-800",   icon: Clock },
  transmis_tribunal:    { label: "Au Tribunal",    bg: "bg-indigo-100",  text: "text-indigo-800",  icon: Gavel },
  juge:                 { label: "Jugé",           bg: "bg-purple-100",  text: "text-purple-800",  icon: CheckCircle2 },
  saisie_effective:     { label: "Saisie effective", bg: "bg-orange-100", text: "text-orange-800", icon: AlertTriangle },
  clos:                 { label: "Classé",         bg: "bg-stone-100",   text: "text-stone-700",   icon: CheckCircle2 },
};

const MOTIF_LABEL = {
  defaut_paiement:    "Défaut de paiement",
  retard_paiement:    "Retard de paiement",
  defaillance_totale: "Défaillance totale",
  autre:              "Autre",
};

function ModalInstruction({ dossier, onClose, onDone }) {
  const [decision, setDecision] = useState("transmettre_tribunal");
  const [commentaire, setCommentaire] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  async function valider() {
    if (!commentaire.trim()) { setErr("Commentaire obligatoire"); return; }
    setLoading(true);
    try {
      const res = await instruireContentieux(dossier.id, decision, commentaire);
      if (!res.ok) { setErr("Erreur : " + res.raison); }
      else { onDone(); }
    } catch (e) { setErr(e.message); } finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 bg-stone-900/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-sm w-full max-w-lg p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Scale className="text-indigo-600" size={18} />
            <div className="text-base font-semibold">Instruire le dossier</div>
          </div>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-700"><X size={18} /></button>
        </div>

        <div className="bg-stone-50 border border-stone-200 rounded-sm p-3 mb-4 text-xs space-y-1">
          <div><span className="text-stone-500">Parcelle :</span> <span className="font-mono font-medium">{dossier.parcelle_id}</span></div>
          <div><span className="text-stone-500">Banque :</span> <span className="font-medium">{dossier.banque_nom}</span></div>
          <div><span className="text-stone-500">Motif :</span> <span className="font-medium">{MOTIF_LABEL[dossier.motif] || dossier.motif}</span></div>
          {dossier.description && <div className="text-stone-600 italic">« {dossier.description} »</div>}
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-mono text-stone-500 block mb-2">Décision d'instruction</label>
            <div className="space-y-2">
              <label className={"flex items-start gap-2 p-3 border rounded-sm cursor-pointer " + (decision === "transmettre_tribunal" ? "border-indigo-500 bg-indigo-50" : "border-stone-200 hover:bg-stone-50")}>
                <input type="radio" name="dec" value="transmettre_tribunal" checked={decision === "transmettre_tribunal"} onChange={(e) => setDecision(e.target.value)} className="mt-0.5" />
                <div>
                  <div className="text-sm font-medium text-stone-800">Transmettre au Tribunal de Grande Instance</div>
                  <div className="text-xs text-stone-500">Le dossier est transféré au tribunal compétent pour instruction judiciaire</div>
                </div>
              </label>
              <label className={"flex items-start gap-2 p-3 border rounded-sm cursor-pointer " + (decision === "classer" ? "border-stone-500 bg-stone-50" : "border-stone-200 hover:bg-stone-50")}>
                <input type="radio" name="dec" value="classer" checked={decision === "classer"} onChange={(e) => setDecision(e.target.value)} className="mt-0.5" />
                <div>
                  <div className="text-sm font-medium text-stone-800">Classer sans suite</div>
                  <div className="text-xs text-stone-500">Le signalement est rejeté, aucun recours judiciaire n'est engagé</div>
                </div>
              </label>
            </div>
          </div>

          <div>
            <label className="text-xs font-mono text-stone-500 block mb-1">Commentaire d'instruction</label>
            <textarea value={commentaire} onChange={(e) => setCommentaire(e.target.value)}
              rows={3} placeholder="Motivation de la décision, points vérifiés, pièces examinées..."
              className="w-full border border-stone-300 rounded-sm px-3 py-2 text-sm" />
          </div>

          {err && <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-sm p-2">{err}</div>}
        </div>

        <div className="flex justify-end gap-2 mt-5 pt-4 border-t border-stone-200">
          <button onClick={onClose} className="text-xs px-3 py-2 text-stone-600 hover:bg-stone-100 rounded-sm">Annuler</button>
          <button onClick={valider} disabled={loading || !commentaire.trim()}
            className="text-xs px-3 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-sm">
            {loading ? "Traitement..." : "Valider la décision"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Contentieux({ readOnly = false }) {
  const [dossiers, setDossiers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtre, setFiltre] = useState("signale");
  const [selected, setSelected] = useState(null);

  async function charger() {
    setLoading(true);
    try { setDossiers(await chargerTousContentieux()); }
    catch (e) { console.error(e); } finally { setLoading(false); }
  }

  useEffect(() => { charger(); }, []);

  async function apresInstruction() {
    setSelected(null);
    await charger();
  }

  const filtres = [
    { id: "signale", label: "À instruire" },
    { id: "transmis_tribunal", label: "Au Tribunal" },
    { id: "clos", label: "Classés" },
    { id: "tous", label: "Tous" },
  ];

  const affiches = filtre === "tous" ? dossiers : dossiers.filter((d) => d.statut === filtre);
  const nbASInstruire = dossiers.filter((d) => d.statut === "signale").length;

  return (
    <div className="p-6 space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <Scale className="text-indigo-600" size={26} />
          <div className="text-2xl font-semibold text-stone-900">Dossiers contentieux</div>
        </div>
        <div className="text-sm text-stone-500 mt-1">
          Signalements transmis par les institutions bancaires partenaires
        </div>
      </div>

      {nbASInstruire > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-sm p-4 flex items-center gap-3">
          <AlertTriangle className="text-red-600 shrink-0" size={20} />
          <div className="text-sm text-red-800">
            <strong>{nbASInstruire} dossier{nbASInstruire > 1 ? "s" : ""}</strong> en attente d'instruction
          </div>
        </div>
      )}

      <div className="flex gap-2 border-b border-stone-200 pb-3">
        {filtres.map((f) => (
          <button key={f.id} onClick={() => setFiltre(f.id)}
            className={"text-xs px-3 py-1.5 rounded-sm transition-colors " + (
              filtre === f.id ? "bg-stone-900 text-white" : "text-stone-600 hover:bg-stone-100"
            )}>
            {f.label}
            {f.id === "signale" && nbASInstruire > 0 && (
              <span className="ml-1.5 bg-red-600 text-white rounded-full text-[10px] px-1.5">{nbASInstruire}</span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-stone-500 text-sm">
          <Loader2 className="animate-spin" size={16} /> Chargement...
        </div>
      ) : affiches.length === 0 ? (
        <div className="bg-white border border-stone-200 rounded-sm p-8 text-center">
          <Scale size={32} className="text-stone-300 mx-auto mb-3" />
          <div className="text-sm text-stone-500">Aucun dossier dans cette catégorie</div>
        </div>
      ) : (
        <div className="bg-white border border-stone-200 rounded-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="text-xs font-mono text-stone-500 bg-stone-50 border-b border-stone-200">
              <tr>
                <th className="text-left py-3 px-4">Parcelle</th>
                <th className="text-left py-3 px-4">Banque</th>
                <th className="text-left py-3 px-4">Motif</th>
                <th className="text-left py-3 px-4">Signalé le</th>
                <th className="text-left py-3 px-4">Statut</th>
                <th className="text-right py-3 px-4"></th>
              </tr>
            </thead>
            <tbody>
              {affiches.map((d) => {
                const st = STATUT_STYLE[d.statut] || { label: d.statut, bg: "bg-stone-100", text: "text-stone-700" };
                return (
                  <tr key={d.id} className="border-b border-stone-100 hover:bg-stone-50">
                    <td className="py-3 px-4 font-mono text-xs font-medium">{d.parcelle_id}</td>
                    <td className="py-3 px-4 text-stone-700">{d.banque_nom}</td>
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
                      {d.statut === "signale" && !readOnly && (
                        <button onClick={() => setSelected(d)}
                          className="text-xs px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-sm">
                          Instruire
                        </button>
                      )}
                      {d.statut === "signale" && readOnly && (
                        <span className="text-xs text-stone-400 italic">En attente</span>
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
        <ModalInstruction dossier={selected} onClose={() => setSelected(null)} onDone={apresInstruction} />
      )}
    </div>
  );
}
