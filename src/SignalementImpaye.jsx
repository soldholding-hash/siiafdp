import { useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import { signalerImpaye } from "./lib/contentieux";

const MOTIFS = [
  { id: "defaut_paiement",   label: "Défaut de paiement",     desc: "Le débiteur ne paie plus ses échéances" },
  { id: "retard_paiement",   label: "Retard de paiement",     desc: "Paiements en retard mais pas arrêtés" },
  { id: "defaillance_totale",label: "Défaillance totale",     desc: "Débiteur injoignable / insolvable" },
  { id: "autre",             label: "Autre",                  desc: "Préciser en description" },
];

export default function SignalementImpaye({ parcelle, onClose, onDone }) {
  const [motif, setMotif] = useState("defaut_paiement");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  async function valider() {
    if (!description.trim()) { setErr("Description obligatoire"); return; }
    setLoading(true);
    try {
      const res = await signalerImpaye(parcelle.id, motif, description);
      if (!res.ok) {
        const msgs = {
          aucun_gage_actif: "Aucun gage actif sur cette parcelle",
          signalement_existant: "Un signalement existe déjà pour cette parcelle",
          compte_inexistant: "Compte bancaire introuvable",
        };
        setErr(msgs[res.raison] || "Erreur : " + res.raison);
      } else {
        onDone();
      }
    } catch (e) { setErr(e.message); } finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 bg-stone-900/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-sm w-full max-w-lg p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <AlertTriangle className="text-red-600" size={18} />
            <div className="text-base font-semibold">Signaler un impayé</div>
          </div>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-700"><X size={18} /></button>
        </div>

        <div className="bg-stone-50 border border-stone-200 rounded-sm p-3 mb-4 text-xs">
          <div className="text-stone-500">Parcelle concernée</div>
          <div className="font-mono font-medium text-stone-800 mt-0.5">{parcelle.id} — {parcelle.proprietaire || "Non affecté"}</div>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-mono text-stone-500 block mb-2">Motif du signalement</label>
            <div className="space-y-2">
              {MOTIFS.map((m) => (
                <label key={m.id} className={"flex items-start gap-2 p-2.5 border rounded-sm cursor-pointer " + (
                  motif === m.id ? "border-amber-500 bg-amber-50" : "border-stone-200 hover:bg-stone-50"
                )}>
                  <input type="radio" name="motif" value={m.id} checked={motif === m.id}
                    onChange={(e) => setMotif(e.target.value)} className="mt-0.5" />
                  <div>
                    <div className="text-sm font-medium text-stone-800">{m.label}</div>
                    <div className="text-xs text-stone-500">{m.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-mono text-stone-500 block mb-1">Description détaillée</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)}
              rows={3} placeholder="Ex : Trois échéances impayées depuis juillet 2026, débiteur injoignable..."
              className="w-full border border-stone-300 rounded-sm px-3 py-2 text-sm" />
          </div>

          {err && <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-sm p-2">{err}</div>}

          <div className="text-xs text-stone-500 bg-stone-50 border border-stone-200 rounded-sm p-3">
            <strong>À savoir :</strong> ce signalement est gratuit. Il notifie le Ministère (Contentieux).
            La procédure de saisie judiciaire ne sera engagée qu'après instruction du dossier.
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-5 pt-4 border-t border-stone-200">
          <button onClick={onClose} className="text-xs px-3 py-2 text-stone-600 hover:bg-stone-100 rounded-sm">Annuler</button>
          <button onClick={valider} disabled={loading || !description.trim()}
            className="text-xs px-3 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white rounded-sm">
            {loading ? "Envoi..." : "Signaler au Ministère"}
          </button>
        </div>
      </div>
    </div>
  );
}
