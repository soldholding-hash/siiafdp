import { useState, useEffect } from "react";
import {
  FileText, Plus, Loader2, AlertTriangle, X, Check,
  ArrowRight, Unlock
} from "lucide-react";
import {
  chargerMonProfilHuissier,
  listerMesCommandements,
  creerCommandement,
} from "./lib/huissier";

const STATUT_INFO = {
  actif: { label: "Actif", couleur: "bg-orange-100 text-orange-800" },
  converti_saisie: { label: "Converti en saisie", couleur: "bg-red-100 text-red-800" },
  mainleve: { label: "Main-levée", couleur: "bg-emerald-100 text-emerald-800" },
  expire: { label: "Expiré", couleur: "bg-stone-100 text-stone-700" },
};

function ModalCreation({ huissierId, onClose, onDone }) {
  const [form, setForm] = useState({
    parcelle_id: "",
    creancier_nom: "",
    debiteur_nom: "",
    montant_pretendu: "",
    reference_acte: "",
    date_commandement: new Date().toISOString().slice(0, 10),
    date_expiration: "",
  });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  async function valider() {
    if (!form.parcelle_id.trim()) { setErr("Numero de parcelle obligatoire"); return; }
    if (!form.creancier_nom.trim()) { setErr("Nom du creancier obligatoire"); return; }
    if (!form.debiteur_nom.trim()) { setErr("Nom du debiteur obligatoire"); return; }
    if (!form.montant_pretendu) { setErr("Montant obligatoire"); return; }
    setLoading(true);
    const res = await creerCommandement({
      huissier_id: huissierId,
      parcelle_id: form.parcelle_id.trim(),
      creancier_nom: form.creancier_nom.trim(),
      debiteur_nom: form.debiteur_nom.trim(),
      montant_pretendu: parseFloat(form.montant_pretendu),
      reference_acte: form.reference_acte.trim() || null,
      date_commandement: form.date_commandement,
      date_expiration: form.date_expiration || null,
      statut: "actif",
    });
    setLoading(false);
    if (!res.ok) { setErr(res.raison); return; }
    onDone();
  }

  return (
    <div className="fixed inset-0 bg-stone-900/60 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-sm w-full max-w-lg my-4">
        <div className="bg-stone-900 text-white px-5 py-3 flex items-center justify-between">
          <div className="text-sm font-semibold">Nouveau commandement de payer</div>
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-mono text-stone-500 block mb-1">Creancier</label>
              <input
                value={form.creancier_nom}
                onChange={(e) => setForm({ ...form, creancier_nom: e.target.value })}
                placeholder="Ex: Banque MUCODEC"
                className="w-full border border-stone-300 rounded-sm px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-mono text-stone-500 block mb-1">Debiteur</label>
              <input
                value={form.debiteur_nom}
                onChange={(e) => setForm({ ...form, debiteur_nom: e.target.value })}
                placeholder="Ex: SCI Malanda"
                className="w-full border border-stone-300 rounded-sm px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-mono text-stone-500 block mb-1">Montant (FCFA)</label>
              <input
                type="number"
                value={form.montant_pretendu}
                onChange={(e) => setForm({ ...form, montant_pretendu: e.target.value })}
                placeholder="Ex: 2500000"
                className="w-full border border-stone-300 rounded-sm px-3 py-2 text-sm font-mono"
              />
            </div>
            <div>
              <label className="text-xs font-mono text-stone-500 block mb-1">Reference acte</label>
              <input
                value={form.reference_acte}
                onChange={(e) => setForm({ ...form, reference_acte: e.target.value })}
                placeholder="Ex: NOT-2026-0142"
                className="w-full border border-stone-300 rounded-sm px-3 py-2 text-sm font-mono"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-mono text-stone-500 block mb-1">Date commandement</label>
              <input
                type="date"
                value={form.date_commandement}
                onChange={(e) => setForm({ ...form, date_commandement: e.target.value })}
                className="w-full border border-stone-300 rounded-sm px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-mono text-stone-500 block mb-1">Date expiration (opt.)</label>
              <input
                type="date"
                value={form.date_expiration}
                onChange={(e) => setForm({ ...form, date_expiration: e.target.value })}
                className="w-full border border-stone-300 rounded-sm px-3 py-2 text-sm"
              />
            </div>
          </div>
          {err && <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-sm p-2">{err}</div>}
        </div>
        <div className="flex justify-end gap-2 px-5 pb-5 pt-3 border-t border-stone-200">
          <button onClick={onClose} className="text-xs px-4 py-2 text-stone-600 hover:bg-stone-100 rounded-sm">Annuler</button>
          <button
            onClick={valider}
            disabled={loading}
            className="text-xs px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-40 text-white rounded-sm flex items-center gap-1"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
            {loading ? "Creation..." : "Creer le commandement"}
          </button>
        </div>
      </div>
    </div>
  );
}

const fmt = (n) => new Intl.NumberFormat("fr-FR").format(n || 0) + " FCFA";

export default function HuissierCommandements() {
  const [profil, setProfil] = useState(null);
  const [commandements, setCommandements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreation, setShowCreation] = useState(false);
  const [msg, setMsg] = useState(null);

  async function charger() {
    setLoading(true);
    const p = await chargerMonProfilHuissier();
    setProfil(p);
    if (p) {
      const c = await listerMesCommandements(p.id);
      setCommandements(c);
    }
    setLoading(false);
  }

  useEffect(() => { charger(); }, []);

  async function apresCreation() {
    setShowCreation(false);
    setMsg({ ok: true, text: "Commandement enregistre." });
    await charger();
    setTimeout(() => setMsg(null), 3000);
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
            <FileText className="text-orange-700" size={26} />
            <div className="text-2xl font-semibold text-stone-900">Commandements de payer</div>
          </div>
          <div className="text-sm text-stone-500 mt-1">
            Commandements valant saisie immobiliere — prealable a la criee
          </div>
        </div>
        <button
          onClick={() => setShowCreation(true)}
          className="text-xs px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-sm flex items-center gap-1.5"
        >
          <Plus size={14} /> Nouveau commandement
        </button>
      </div>

      {msg && (
        <div className={"text-xs p-2 rounded-sm border " + (msg.ok ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-red-50 border-red-200 text-red-800")}>
          {msg.text}
        </div>
      )}

      {commandements.length === 0 ? (
        <div className="bg-white border border-stone-200 rounded-sm p-8 text-center">
          <FileText size={32} className="text-stone-300 mx-auto mb-3" />
          <div className="text-sm text-stone-500">Aucun commandement enregistre</div>
          <div className="text-xs text-stone-400 mt-1">Cliquez sur "Nouveau commandement" pour commencer</div>
        </div>
      ) : (
        <div className="bg-white border border-stone-200 rounded-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="text-xs font-mono text-stone-500 bg-stone-50 border-b border-stone-200">
              <tr>
                <th className="text-left py-3 px-4">Parcelle</th>
                <th className="text-left py-3 px-4">Creancier</th>
                <th className="text-left py-3 px-4">Debiteur</th>
                <th className="text-right py-3 px-4">Montant</th>
                <th className="text-left py-3 px-4">Reference</th>
                <th className="text-left py-3 px-4">Date</th>
                <th className="text-left py-3 px-4">Statut</th>
              </tr>
            </thead>
            <tbody>
              {commandements.map((c) => (
                <tr key={c.id} className="border-b border-stone-100 hover:bg-stone-50">
                  <td className="py-3 px-4 font-mono text-xs font-semibold">{c.parcelle_id}</td>
                  <td className="py-3 px-4 text-xs">{c.creancier_nom}</td>
                  <td className="py-3 px-4 text-xs">{c.debiteur_nom}</td>
                  <td className="py-3 px-4 text-xs font-mono text-right">{fmt(c.montant_pretendu)}</td>
                  <td className="py-3 px-4 font-mono text-xs">{c.reference_acte || "—"}</td>
                  <td className="py-3 px-4 text-xs text-stone-500">
                    {c.date_commandement ? new Date(c.date_commandement).toLocaleDateString("fr-FR") : "—"}
                  </td>
                  <td className="py-3 px-4">
                    <span className={"text-xs px-2 py-0.5 rounded-sm font-medium " + (STATUT_INFO[c.statut]?.couleur || "bg-stone-100 text-stone-700")}>
                      {STATUT_INFO[c.statut]?.label || c.statut}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreation && (
        <ModalCreation
          huissierId={profil.id}
          onClose={() => setShowCreation(false)}
          onDone={apresCreation}
        />
      )}
    </div>
  );
}
