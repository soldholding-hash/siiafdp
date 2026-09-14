import { useState, useEffect } from "react";
import { Gavel, Loader2, X, AlertTriangle, CheckCircle2, Clock, Scale, FileText } from "lucide-react";
import { chargerContentieuxTribunal, rendreJugement } from "./lib/contentieux";

const STATUT_STYLE = {
  transmis_tribunal: { label: "À juger",        bg: "bg-indigo-100",  text: "text-indigo-800", icon: Gavel },
  juge:              { label: "Jugé — saisie",  bg: "bg-purple-100",  text: "text-purple-800", icon: CheckCircle2 },
  clos:              { label: "Rejeté",         bg: "bg-stone-100",   text: "text-stone-700",  icon: X },
};

const MOTIF_LABEL = {
  defaut_paiement:    "Défaut de paiement",
  retard_paiement:    "Retard de paiement",
  defaillance_totale: "Défaillance totale",
  autre:              "Autre",
};

const DECISION_LABEL = {
  saisie_immediate: "Saisie immobilière immédiate",
  rejet:            "Rejet de la requête",
  renvoi_contentieux: "Renvoi au Contentieux",
};

function ModalJugement({ dossier, onClose, onDone }) {
  const [decision, setDecision] = useState("saisie_immediate");
  const [reference, setReference] = useState("");
  const [motivation, setMotivation] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  async function valider() {
    if (!reference.trim()) { setErr("Référence du jugement obligatoire"); return; }
    if (!motivation.trim()) { setErr("Motivation obligatoire"); return; }
    setLoading(true);
    try {
      const res = await rendreJugement(dossier.id, decision, reference, motivation);
      if (!res.ok) { setErr("Erreur : " + res.raison); }
      else { onDone(); }
    } catch (e) { setErr(e.message); } finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 bg-stone-900/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-sm w-full max-w-lg p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Gavel className="text-indigo-700" size={18} />
            <div className="text-base font-semibold">Rendre le jugement</div>
          </div>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-700"><X size={18} /></button>
        </div>

        <div className="bg-stone-50 border border-stone-200 rounded-sm p-3 mb-4 text-xs space-y-1">
          <div><span className="text-stone-500">Parcelle :</span> <span className="font-mono font-medium">{dossier.parcelle_id}</span></div>
          <div><span className="text-stone-500">Banque requérante :</span> <span className="font-medium">{dossier.banque_nom}</span></div>
          <div><span className="text-stone-500">Motif :</span> <span className="font-medium">{MOTIF_LABEL[dossier.motif] || dossier.motif}</span></div>
          {dossier.description && <div className="text-stone-600 italic">« {dossier.description} »</div>}
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-mono text-stone-500 block mb-1">Référence du jugement</label>
            <input value={reference} onChange={(e) => setReference(e.target.value)}
              placeholder="Ex : TGI/BZV/2026/0042"
              className="w-full border border-stone-300 rounded-sm px-3 py-2 text-sm font-mono" />
          </div>

          <div>
            <label className="text-xs font-mono text-stone-500 block mb-2">Décision du Tribunal</label>
            <div className="space-y-2">
              <label className={"flex items-start gap-2 p-3 border rounded-sm cursor-pointer " + (decision === "saisie_immediate" ? "border-purple-500 bg-purple-50" : "border-stone-200 hover:bg-stone-50")}>
                <input type="radio" name="dec" value="saisie_immediate" checked={decision === "saisie_immediate"} onChange={(e) => setDecision(e.target.value)} className="mt-0.5" />
                <div>
                  <div className="text-sm font-medium text-stone-800">Saisie immobilière immédiate</div>
                  <div className="text-xs text-stone-500">Ordonner la saisie et la vente aux enchères du bien gagé</div>
                </div>
              </label>
              <label className={"flex items-start gap-2 p-3 border rounded-sm cursor-pointer " + (decision === "rejet" ? "border-stone-500 bg-stone-50" : "border-stone-200 hover:bg-stone-50")}>
                <input type="radio" name="dec" value="rejet" checked={decision === "rejet"} onChange={(e) => setDecision(e.target.value)} className="mt-0.5" />
                <div>
                  <div className="text-sm font-medium text-stone-800">Rejet de la requête</div>
                  <div className="text-xs text-stone-500">Procédure irrecevable — le gage reste actif, mais aucune saisie n'est ordonnée</div>
                </div>
              </label>
              <label className={"flex items-start gap-2 p-3 border rounded-sm cursor-pointer " + (decision === "renvoi_contentieux" ? "border-amber-500 bg-amber-50" : "border-stone-200 hover:bg-stone-50")}>
                <input type="radio" name="dec" value="renvoi_contentieux" checked={decision === "renvoi_contentieux"} onChange={(e) => setDecision(e.target.value)} className="mt-0.5" />
                <div>
                  <div className="text-sm font-medium text-stone-800">Renvoi au Contentieux</div>
                  <div className="text-xs text-stone-500">Dossier incomplet — retour au Ministère pour pièces complémentaires</div>
                </div>
              </label>
            </div>
          </div>

          <div>
            <label className="text-xs font-mono text-stone-500 block mb-1">Motivation du jugement</label>
            <textarea value={motivation} onChange={(e) => setMotivation(e.target.value)}
              rows={3} placeholder="Attendu du jugement, motifs juridiques, dispositions ordonnées..."
              className="w-full border border-stone-300 rounded-sm px-3 py-2 text-sm" />
          </div>

          {err && <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-sm p-2">{err}</div>}

          <div className="text-xs text-stone-500 bg-indigo-50 border border-indigo-200 rounded-sm p-3">
            <strong>Effet juridique :</strong> une décision de saisie autorise la banque à procéder à la vente forcée.
            Le rejet et le renvoi sont tracés et notifiés au service Contentieux.
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-5 pt-4 border-t border-stone-200">
          <button onClick={onClose} className="text-xs px-3 py-2 text-stone-600 hover:bg-stone-100 rounded-sm">Annuler</button>
          <button onClick={valider} disabled={loading || !reference.trim() || !motivation.trim()}
            className="text-xs px-3 py-2 bg-indigo-700 hover:bg-indigo-800 disabled:opacity-40 text-white rounded-sm flex items-center gap-1">
            <Gavel size={12} /> {loading ? "Signature..." : "Signer le jugement"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Tribunal() {
  const [dossiers, setDossiers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtre, setFiltre] = useState("transmis_tribunal");
  const [selected, setSelected] = useState(null);

  async function charger() {
    setLoading(true);
    try { setDossiers(await chargerContentieuxTribunal()); }
    catch (e) { console.error(e); } finally { setLoading(false); }
  }

  useEffect(() => { charger(); }, []);

  async function apresJugement() {
    setSelected(null);
    await charger();
  }

  const filtres = [
    { id: "transmis_tribunal", label: "À juger" },
    { id: "juge", label: "Jugés" },
    { id: "clos", label: "Rejetés" },
    { id: "tous", label: "Tous" },
  ];

  const affiches = filtre === "tous" ? dossiers : dossiers.filter((d) => d.statut === filtre);
  const nbAJuger = dossiers.filter((d) => d.statut === "transmis_tribunal").length;

  return (
    <div className="p-6 space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <Gavel className="text-indigo-700" size={26} />
          <div className="text-2xl font-semibold text-stone-900">Dossiers au Tribunal</div>
        </div>
        <div className="text-sm text-stone-500 mt-1">
          Instruction judiciaire des dossiers transmis par le service Contentieux du Ministère
        </div>
      </div>

      {nbAJuger > 0 && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-sm p-4 flex items-center gap-3">
          <AlertTriangle className="text-indigo-700 shrink-0" size={20} />
          <div className="text-sm text-indigo-900">
            <strong>{nbAJuger} dossier{nbAJuger > 1 ? "s" : ""}</strong> en attente de jugement
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
            {f.id === "transmis_tribunal" && nbAJuger > 0 && (
              <span className="ml-1.5 bg-indigo-700 text-white rounded-full text-[10px] px-1.5">{nbAJuger}</span>
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
                <th className="text-left py-3 px-4">Transmis le</th>
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
                      {d.date_transmission_tribunal ? new Date(d.date_transmission_tribunal).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" }) : "—"}
                    </td>
                    <td className="py-3 px-4">
                      <span className={"text-xs px-2 py-0.5 rounded-sm font-medium " + st.bg + " " + st.text}>
                        {st.label}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {d.statut === "transmis_tribunal" && (
                        <button onClick={() => setSelected(d)}
                          className="text-xs px-3 py-1.5 bg-indigo-700 hover:bg-indigo-800 text-white rounded-sm flex items-center gap-1.5 ml-auto">
                          <Gavel size={12} /> Rendre jugement
                        </button>
                      )}
                      {d.statut === "juge" && (
                        <span className="text-xs text-purple-700 font-medium">{DECISION_LABEL[d.decision] || "Jugé"}</span>
                      )}
                      {d.statut === "clos" && (
                        <span className="text-xs text-stone-500">Classé</span>
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
        <ModalJugement dossier={selected} onClose={() => setSelected(null)} onDone={apresJugement} />
      )}
    </div>
  );
}
