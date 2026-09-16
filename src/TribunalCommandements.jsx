import { useState, useEffect } from "react";
import { Scale, Loader2, X, FileText, CheckCircle, XCircle, AlertCircle, Clock } from "lucide-react";
import { listerDossiersTGI, deciderTGI, chargerCircuit } from "./lib/huissier";

const fmt = (n) => new Intl.NumberFormat("fr-FR").format(n || 0) + " FCFA";

function ModalDecision({ dossier, onClose, onDone }) {
  const [decision, setDecision] = useState("approuve");
  const [magistrat, setMagistrat] = useState("");
  const [motif, setMotif] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  async function valider() {
    if (!magistrat.trim()) { setErr("Nom du magistrat obligatoire"); return; }
    if (decision !== "approuve" && !motif.trim()) { setErr("Motif obligatoire pour un rejet"); return; }
    setLoading(true);
    const res = await deciderTGI(dossier.id, {
      decision, magistrat: magistrat.trim(), motif: motif.trim() || null,
      acteur_nom: magistrat.trim(),
    });
    setLoading(false);
    if (!res.ok) { setErr(res.raison); return; }
    onDone();
  }

  return (
    <div className="fixed inset-0 bg-stone-900/60 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-sm w-full max-w-lg my-4">
        <div className="bg-purple-900 text-white px-5 py-3 flex items-center justify-between">
          <div className="text-sm font-semibold">Décision du Tribunal</div>
          <button onClick={onClose} className="text-purple-200 hover:text-white"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="bg-stone-50 border border-stone-200 rounded-sm p-3 text-xs space-y-1">
            <div><strong>Parcelle :</strong> <span className="font-mono">{dossier.parcelle_id}</span></div>
            <div><strong>Créancier :</strong> {dossier.creancier_nom}</div>
            <div><strong>Débiteur :</strong> {dossier.debiteur_nom}</div>
            <div><strong>Montant :</strong> {fmt(dossier.montant_pretendu)}</div>
            <div><strong>Soumis le :</strong> {dossier.soumis_tgi_le ? new Date(dossier.soumis_tgi_le).toLocaleString("fr-FR") : "—"}</div>
          </div>

          <div>
            <label className="text-xs font-mono text-stone-500 block mb-2">Décision</label>
            <div className="space-y-1.5">
              {[
                { id: "approuve", label: "✅ Approuver — ordonnance d'autorisation", couleur: "border-emerald-500 bg-emerald-50" },
                { id: "complement", label: "⚠️ Demander un complément", couleur: "border-amber-500 bg-amber-50" },
                { id: "rejete", label: "❌ Rejeter la demande", couleur: "border-red-500 bg-red-50" },
              ].map((o) => (
                <label key={o.id} className={"flex items-center gap-2 p-2 border rounded-sm cursor-pointer text-sm " + (decision === o.id ? o.couleur : "border-stone-200")}>
                  <input type="radio" name="decision" checked={decision === o.id} onChange={() => setDecision(o.id)} />
                  {o.label}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-mono text-stone-500 block mb-1">Magistrat signataire</label>
            <input value={magistrat} onChange={(e) => setMagistrat(e.target.value)}
              placeholder="Ex: Juge Kimbembé"
              className="w-full border border-stone-300 rounded-sm px-3 py-2 text-sm" />
          </div>

          <div>
            <label className="text-xs font-mono text-stone-500 block mb-1">
              Motif {decision === "approuve" ? "(optionnel)" : "(obligatoire)"}
            </label>
            <textarea value={motif} onChange={(e) => setMotif(e.target.value)}
              rows={3} placeholder="Motivation de la décision..."
              className="w-full border border-stone-300 rounded-sm px-3 py-2 text-sm" />
          </div>

          {err && <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-sm p-2">{err}</div>}
        </div>
        <div className="flex justify-end gap-2 px-5 pb-5 pt-3 border-t border-stone-200">
          <button onClick={onClose} className="text-xs px-4 py-2 text-stone-600 hover:bg-stone-100 rounded-sm">Annuler</button>
          <button onClick={valider} disabled={loading}
            className="text-xs px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white rounded-sm flex items-center gap-1">
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Scale size={14} />}
            {loading ? "Traitement..." : "Rendre la décision"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TribunalCommandements() {
  const [dossiers, setDossiers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtre, setFiltre] = useState("soumis_tgi");
  const [selected, setSelected] = useState(null);
  const [msg, setMsg] = useState(null);

  async function charger() {
    setLoading(true);
    const d = await listerDossiersTGI(filtre);
    setDossiers(d);
    setLoading(false);
  }

  useEffect(() => { charger(); }, [filtre]);

  async function apresDecision() {
    setSelected(null);
    setMsg({ ok: true, text: "Décision enregistrée. Huissier notifié." });
    await charger();
    setTimeout(() => setMsg(null), 3000);
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Scale className="text-purple-700" size={26} />
            <div className="text-2xl font-semibold text-stone-900">Instruction des commandements</div>
          </div>
          <div className="text-sm text-stone-500 mt-1">
            Tribunal de Grande Instance — Chambre civile
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {[
          { id: "soumis_tgi", label: "En attente", icone: Clock, couleur: "purple" },
          { id: "autorise", label: "Autorisés", icone: CheckCircle, couleur: "emerald" },
          { id: "rejete", label: "Rejetés", icone: XCircle, couleur: "red" },
          { id: "complement_requis", label: "Compléments", icone: AlertCircle, couleur: "amber" },
        ].map((f) => {
          const Icone = f.icone;
          const actif = filtre === f.id;
          return (
            <button key={f.id} onClick={() => setFiltre(f.id)}
              className={"text-xs px-3 py-2 rounded-sm flex items-center gap-1.5 border " + (actif ? "bg-purple-600 text-white border-purple-600" : "bg-white text-stone-600 border-stone-200 hover:border-purple-400")}>
              <Icone size={12} /> {f.label}
            </button>
          );
        })}
      </div>

      {msg && (
        <div className={"text-xs p-2 rounded-sm border " + (msg.ok ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-red-50 border-red-200 text-red-800")}>
          {msg.text}
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-stone-500 text-sm"><Loader2 className="animate-spin" size={16} /> Chargement...</div>
      ) : dossiers.length === 0 ? (
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
                <th className="text-left py-3 px-4">Créancier → Débiteur</th>
                <th className="text-right py-3 px-4">Montant</th>
                <th className="text-left py-3 px-4">Soumis le</th>
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
                  <td className="py-3 px-4 text-xs text-stone-500">
                    {d.soumis_tgi_le ? new Date(d.soumis_tgi_le).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" }) : "—"}
                  </td>
                  <td className="py-3 px-4 text-right">
                    {d.statut === "soumis_tgi" && (
                      <button onClick={() => setSelected(d)}
                        className="text-xs px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-sm inline-flex items-center gap-1">
                        <Scale size={11} /> Instruire
                      </button>
                    )}
                    {d.statut !== "soumis_tgi" && d.motif_tgi && (
                      <span className="text-xs text-stone-500" title={d.motif_tgi}>
                        {d.motif_tgi.slice(0, 40)}...
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="bg-purple-50 border border-purple-200 rounded-sm p-4 text-xs text-purple-900">
        <strong>Circuit légal :</strong> le tribunal instruit les demandes de saisie soumises par les huissiers de justice et rend une ordonnance motivée. Cette décision conditionne l'exécution sur le registre foncier.
      </div>

      {selected && <ModalDecision dossier={selected} onClose={() => setSelected(null)} onDone={apresDecision} />}
    </div>
  );
}
