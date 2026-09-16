import { useState, useEffect } from "react";
import { Gavel, Plus, Loader2, X, AlertTriangle, Lock, Unlock } from "lucide-react";
import { poserGelSQL, leverGelSQL, listerGelsActifs } from "./lib/judiciaire";

const MOTIFS = [
  { id: "succession", label: "Litige successoral" },
  { id: "contestation", label: "Contestation de propriete" },
  { id: "faux", label: "Faux et usage de faux" },
  { id: "fraude", label: "Fraude / double vente" },
  { id: "impaye", label: "Creance impayee" },
  { id: "autre", label: "Autre motif" },
];

function ModalPoseGel({ onClose, onDone }) {
  const [parcelleId, setParcelleId] = useState("");
  const [magistrat, setMagistrat] = useState("");
  const [motif, setMotif] = useState("contestation");
  const [reference, setReference] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  async function valider() {
    if (!parcelleId || !magistrat || !reference) { setErr("Parcelle, magistrat et reference obligatoires"); return; }
    setLoading(true);
    try {
      const res = await poserGelSQL(parcelleId.toUpperCase(), "CPT-TGI", magistrat, motif, reference);
      if (!res.ok) { setErr("Erreur : " + res.raison); }
      else { onDone(); }
    } catch (e) { setErr(e.message); } finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 bg-stone-900/60 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-sm w-full max-w-lg my-4">
        <div className="bg-stone-900 text-white px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lock className="text-red-400" size={18} />
            <div className="text-sm font-semibold">Poser un gel judiciaire</div>
          </div>
          <button onClick={onClose} className="text-stone-400 hover:text-white"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-sm p-3 text-xs text-red-900">
            Le gel bloque toute mutation, vente ou nouveau gage. Il est prioritaire sur tout gage bancaire.
          </div>
          <div>
            <label className="text-xs font-mono text-stone-500 block mb-1">Reference parcelle *</label>
            <input value={parcelleId} onChange={(e) => setParcelleId(e.target.value.toUpperCase())} placeholder="P-04140" className="w-full border border-stone-300 rounded-sm px-3 py-2 text-sm font-mono" autoFocus />
          </div>
          <div>
            <label className="text-xs font-mono text-stone-500 block mb-1">Magistrat ordonnateur *</label>
            <input value={magistrat} onChange={(e) => setMagistrat(e.target.value)} placeholder="Juge MABIALD" className="w-full border border-stone-300 rounded-sm px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-xs font-mono text-stone-500 block mb-1">Motif *</label>
            <select value={motif} onChange={(e) => setMotif(e.target.value)} className="w-full border border-stone-300 rounded-sm px-3 py-2 text-sm">
              {MOTIFS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-mono text-stone-500 block mb-1">Reference jugement *</label>
            <input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="TGI/BZV/2026/0042" className="w-full border border-stone-300 rounded-sm px-3 py-2 text-sm font-mono" />
          </div>
          {err && <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-sm p-2">{err}</div>}
        </div>
        <div className="flex justify-end gap-2 px-5 pb-5 pt-3 border-t border-stone-200">
          <button onClick={onClose} className="text-xs px-4 py-2 text-stone-600 hover:bg-stone-100 rounded-sm">Annuler</button>
          <button onClick={valider} disabled={loading} className="text-xs px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white rounded-sm flex items-center gap-1">
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Lock size={14} />}
            {loading ? "Pose..." : "Poser le gel"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function GelsJudiciaires() {
  const [gels, setGels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPose, setShowPose] = useState(false);
  const [msg, setMsg] = useState(null);

  async function charger() {
    setLoading(true);
    try { setGels(await listerGelsActifs()); } catch (e) { console.error(e); } finally { setLoading(false); }
  }

  useEffect(() => { charger(); }, []);

  async function apresPose() {
    setShowPose(false);
    setMsg({ ok: true, text: "Gel pose. Parcelle bloquee." });
    await charger();
    setTimeout(() => setMsg(null), 3000);
  }

  async function lever(parcelleId) {
    if (!confirm("Lever le gel sur " + parcelleId + " ?")) return;
    try {
      const res = await leverGelSQL(parcelleId, "CPT-TGI");
      if (!res.ok) setMsg({ ok: false, text: "Erreur : " + res.raison });
      else { setMsg({ ok: true, text: "Gel leve." }); await charger(); setTimeout(() => setMsg(null), 3000); }
    } catch (e) { setMsg({ ok: false, text: e.message }); }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Gavel className="text-indigo-700" size={26} />
            <div className="text-2xl font-semibold text-stone-900">Gels judiciaires</div>
          </div>
          <div className="text-sm text-stone-500 mt-1">Mesures conservatoires sur les parcelles en litige</div>
        </div>
        <button onClick={() => setShowPose(true)} className="text-xs px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-sm flex items-center gap-1.5">
          <Plus size={14} /> Poser un gel
        </button>
      </div>

      {gels.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-sm p-4 flex items-center gap-3">
          <AlertTriangle className="text-red-700" size={20} />
          <div className="text-sm text-red-900"><strong>{gels.length} parcelle{gels.length > 1 ? "s" : ""}</strong> sous gel - mutations bloquees</div>
        </div>
      )}

      {msg && <div className={"text-xs p-2 rounded-sm border " + (msg.ok ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-red-50 border-red-200 text-red-800")}>{msg.text}</div>}

      {loading ? (
        <div className="flex items-center gap-2 text-stone-500 text-sm"><Loader2 className="animate-spin" size={16} /> Chargement...</div>
      ) : gels.length === 0 ? (
        <div className="bg-white border border-stone-200 rounded-sm p-8 text-center">
          <Gavel size={32} className="text-stone-300 mx-auto mb-3" />
          <div className="text-sm text-stone-500">Aucun gel judiciaire actif</div>
        </div>
      ) : (
        <div className="bg-white border border-stone-200 rounded-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="text-xs font-mono text-stone-500 bg-stone-50 border-b border-stone-200">
              <tr>
                <th className="text-left py-3 px-4">Parcelle</th>
                <th className="text-left py-3 px-4">Magistrat</th>
                <th className="text-left py-3 px-4">Motif</th>
                <th className="text-left py-3 px-4">Reference</th>
                <th className="text-left py-3 px-4">Pose le</th>
                <th className="text-right py-3 px-4">Action</th>
              </tr>
            </thead>
            <tbody>
              {gels.map((g) => (
                <tr key={g.id} className="border-b border-stone-100 hover:bg-stone-50">
                  <td className="py-3 px-4 font-mono text-xs font-semibold">{g.parcelle_id}</td>
                  <td className="py-3 px-4">{g.magistrat || "—"}</td>
                  <td className="py-3 px-4 text-xs">{MOTIFS.find((m) => m.id === g.motif)?.label || g.motif || "—"}</td>
                  <td className="py-3 px-4 font-mono text-xs">{g.reference_jugement || "—"}</td>
                  <td className="py-3 px-4 text-xs text-stone-500">{g.date_pose ? new Date(g.date_pose).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" }) : "—"}</td>
                  <td className="py-3 px-4 text-right">
                    <button onClick={() => lever(g.parcelle_id)} className="text-xs px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-sm flex items-center gap-1 ml-auto">
                      <Unlock size={12} /> Lever
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showPose && <ModalPoseGel onClose={() => setShowPose(false)} onDone={apresPose} />}
    </div>
  );
}
