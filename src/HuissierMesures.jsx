import { useState, useEffect } from "react";
import {
  Gavel, Plus, Unlock, Loader2, AlertTriangle, X, Check
} from "lucide-react";
import {
  chargerMonProfilHuissier,
  listerMesuresConservatoires,
  poserMesureConservatoire,
  leverMesureConservatoire,
} from "./lib/huissier";

const TYPES_MESURE = [
  { id: "gel_conservatoire", label: "Gel conservatoire" },
  { id: "saisie_immobiliere", label: "Saisie immobiliere" },
  { id: "commandement", label: "Commandement de payer" },
  { id: "indisponibilite", label: "Indisponibilite" },
];

const STATUT_COULEUR = {
  active: "bg-red-100 text-red-800",
  pose: "bg-red-100 text-red-800",
  levee: "bg-emerald-100 text-emerald-800",
  mainlevee: "bg-emerald-100 text-emerald-800",
};

function ModalPose({ huissierId, onClose, onDone }) {
  const [form, setForm] = useState({
    parcelle_id: "",
    type_mesure: "gel_conservatoire",
    reference_jugement: "",
    description: "",
  });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  async function valider() {
    if (!form.parcelle_id.trim()) { setErr("Numero de parcelle obligatoire"); return; }
    if (!form.reference_jugement.trim()) { setErr("Reference de la decision obligatoire"); return; }
    setLoading(true);
    const res = await poserMesureConservatoire({
      huissier_id: huissierId,
      parcelle_id: form.parcelle_id.trim(),
      type_mesure: form.type_mesure,
      reference_jugement: form.reference_jugement.trim(),
      description: form.description.trim() || null,
      statut: "active",
      date_pose: new Date().toISOString(),
    });
    setLoading(false);
    if (!res.ok) { setErr(res.raison); return; }
    onDone();
  }

  return (
    <div className="fixed inset-0 bg-stone-900/60 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-sm w-full max-w-lg my-4">
        <div className="bg-stone-900 text-white px-5 py-3 flex items-center justify-between">
          <div className="text-sm font-semibold">Poser une mesure conservatoire</div>
          <button onClick={onClose} className="text-stone-400 hover:text-white"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs font-mono text-stone-500 block mb-1">Parcelle (P-XXXXX)</label>
            <input
              value={form.parcelle_id}
              onChange={(e) => setForm({ ...form, parcelle_id: e.target.value })}
              placeholder="Ex: P-04129"
              className="w-full border border-stone-300 rounded-sm px-3 py-2 text-sm font-mono"
            />
          </div>
          <div>
            <label className="text-xs font-mono text-stone-500 block mb-1">Type de mesure</label>
            <select
              value={form.type_mesure}
              onChange={(e) => setForm({ ...form, type_mesure: e.target.value })}
              className="w-full border border-stone-300 rounded-sm px-3 py-2 text-sm"
            >
              {TYPES_MESURE.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-mono text-stone-500 block mb-1">Reference de la decision</label>
            <input
              value={form.reference_jugement}
              onChange={(e) => setForm({ ...form, reference_jugement: e.target.value })}
              placeholder="Ex: TGI/BZV/2026/0142"
              className="w-full border border-stone-300 rounded-sm px-3 py-2 text-sm font-mono"
            />
          </div>
          <div>
            <label className="text-xs font-mono text-stone-500 block mb-1">Description (optionnel)</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              placeholder="Motif, observations..."
              className="w-full border border-stone-300 rounded-sm px-3 py-2 text-sm"
            />
          </div>
          {err && <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-sm p-2">{err}</div>}
        </div>
        <div className="flex justify-end gap-2 px-5 pb-5 pt-3 border-t border-stone-200">
          <button onClick={onClose} className="text-xs px-4 py-2 text-stone-600 hover:bg-stone-100 rounded-sm">Annuler</button>
          <button
            onClick={valider}
            disabled={loading}
            className="text-xs px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white rounded-sm flex items-center gap-1"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Gavel size={14} />}
            {loading ? "Pose..." : "Poser la mesure"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function HuissierMesures() {
  const [profil, setProfil] = useState(null);
  const [mesures, setMesures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPose, setShowPose] = useState(false);
  const [msg, setMsg] = useState(null);

  async function charger() {
    setLoading(true);
    const p = await chargerMonProfilHuissier();
    setProfil(p);
    if (p) {
      const m = await listerMesuresConservatoires(p.id);
      setMesures(m);
    }
    setLoading(false);
  }

  useEffect(() => { charger(); }, []);

  async function apresPose() {
    setShowPose(false);
    setMsg({ ok: true, text: "Mesure posee. Parcelle bloquee." });
    await charger();
    setTimeout(() => setMsg(null), 3000);
  }

  async function lever(id) {
    if (!confirm("Confirmer la levee de cette mesure ?")) return;
    const res = await leverMesureConservatoire(id);
    if (!res.ok) setMsg({ ok: false, text: "Erreur : " + res.raison });
    else {
      setMsg({ ok: true, text: "Mesure levee." });
      await charger();
      setTimeout(() => setMsg(null), 3000);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-stone-500 text-sm p-6">
        <Loader2 className="animate-spin" size={16} /> Chargement...
      </div>
    );
  }

  if (!profil) {
    return (
      <div className="p-6">
        <div className="bg-amber-50 border border-amber-200 rounded-sm p-4 text-sm text-amber-900">
          Aucun profil huissier lie a ce compte.
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Gavel className="text-red-700" size={26} />
            <div className="text-2xl font-semibold text-stone-900">Mesures conservatoires</div>
          </div>
          <div className="text-sm text-stone-500 mt-1">
            Gels, saisies et indisponibilites posees sur les parcelles
          </div>
        </div>
        <button
          onClick={() => setShowPose(true)}
          className="text-xs px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-sm flex items-center gap-1.5"
        >
          <Plus size={14} /> Poser une mesure
        </button>
      </div>

      {msg && (
        <div className={"text-xs p-2 rounded-sm border " + (msg.ok ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-red-50 border-red-200 text-red-800")}>
          {msg.text}
        </div>
      )}

      {mesures.length === 0 ? (
        <div className="bg-white border border-stone-200 rounded-sm p-8 text-center">
          <Gavel size={32} className="text-stone-300 mx-auto mb-3" />
          <div className="text-sm text-stone-500">Aucune mesure conservatoire enregistree</div>
        </div>
      ) : (
        <div className="bg-white border border-stone-200 rounded-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="text-xs font-mono text-stone-500 bg-stone-50 border-b border-stone-200">
              <tr>
                <th className="text-left py-3 px-4">Parcelle</th>
                <th className="text-left py-3 px-4">Type</th>
                <th className="text-left py-3 px-4">Reference</th>
                <th className="text-left py-3 px-4">Pose le</th>
                <th className="text-left py-3 px-4">Statut</th>
                <th className="text-right py-3 px-4">Action</th>
              </tr>
            </thead>
            <tbody>
              {mesures.map((m) => (
                <tr key={m.id} className="border-b border-stone-100 hover:bg-stone-50">
                  <td className="py-3 px-4 font-mono text-xs font-semibold">{m.parcelle_id}</td>
                  <td className="py-3 px-4 text-xs">
                    {TYPES_MESURE.find((t) => t.id === m.type_mesure)?.label || m.type_mesure || "—"}
                  </td>
                  <td className="py-3 px-4 font-mono text-xs">{m.reference_jugement || "—"}</td>
                  <td className="py-3 px-4 text-xs text-stone-500">
                    {m.date_pose ? new Date(m.date_pose).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" }) : "—"}
                  </td>
                  <td className="py-3 px-4">
                    <span className={"text-xs px-2 py-0.5 rounded-sm font-medium " + (STATUT_COULEUR[m.statut] || "bg-stone-100 text-stone-700")}>
                      {m.statut || "—"}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    {(m.statut === "active" || m.statut === "pose") && (
                      <button
                        onClick={() => lever(m.id)}
                        className="text-xs px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-sm inline-flex items-center gap-1"
                      >
                        <Unlock size={12} /> Lever
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showPose && (
        <ModalPose
          huissierId={profil.id}
          onClose={() => setShowPose(false)}
          onDone={apresPose}
        />
      )}
    </div>
  );
}
